const mongoose = require('mongoose');
const Shopkeeper = require('../models/Shopkeeper');
const ShopkeeperPayment = require('../models/ShopkeeperPayment');
const ShopkeeperRefund = require('../models/ShopkeeperRefund');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { sendRefundRequested, sendRefundProcessing, sendRefundCompleted } = require('../services/notificationService');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getDateRange = (dateFrom, dateTo) => {
  const range = {};
  if (dateFrom) {
    range.$gte = new Date(dateFrom);
  }
  if (dateTo) {
    range.$lte = new Date(dateTo);
  }
  return Object.keys(range).length ? range : null;
};

const ensureShopkeeperAccess = async (shopkeeperId, authShopkeeperId) => {
  if (String(shopkeeperId) !== String(authShopkeeperId)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
  }

  const shopkeeper = await Shopkeeper.findById(shopkeeperId).lean();
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  if (!shopkeeper.shopId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Shop is not linked to this shopkeeper.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  return shopkeeper;
};

const withSearchFilter = async (queryFilter, search) => {
  if (!search) {
    return queryFilter;
  }

  const text = String(search).trim();
  if (!text) {
    return queryFilter;
  }

  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escaped, 'i');

  const matchingUsers = await User.find({
    $or: [{ name: regex }, { phone: regex }],
  })
    .select('_id')
    .lean();

  const userIds = matchingUsers.map((item) => item._id);

  return {
    ...queryFilter,
    $or: [{ transactionRef: regex }, ...(userIds.length ? [{ userId: { $in: userIds } }] : [])],
  };
};

const getRefunds = async (req, res) => {
  const { shopkeeperId } = req.params;
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const baseFilter = {
    shopkeeperId: new mongoose.Types.ObjectId(String(shopkeeperId)),
    shopId: new mongoose.Types.ObjectId(String(shopkeeper.shopId)),
  };

  if (req.query.status) {
    baseFilter.status = req.query.status;
  }

  const dateRange = getDateRange(req.query.dateFrom, req.query.dateTo);
  if (dateRange) {
    baseFilter.createdAt = dateRange;
  }

  const filter = await withSearchFilter(baseFilter, req.query.search);

  const [refunds, total] = await Promise.all([
    ShopkeeperRefund.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name phone')
      .lean(),
    ShopkeeperRefund.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refunds fetched successfully.',
    data: {
      refunds,
      pagination: { total, limit, offset },
    },
  });
};

const getRefundById = async (req, res) => {
  const { shopkeeperId, refundId } = req.params;
  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const refund = await ShopkeeperRefund.findOne({
    _id: refundId,
    shopkeeperId,
    shopId: shopkeeper.shopId,
  })
    .populate('paymentId')
    .populate('orderId')
    .populate('userId', 'name phone addresses')
    .lean();

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund details fetched successfully.',
    data: {
      refund,
    },
  });
};

const createRefund = async (req, res) => {
  const { shopkeeperId } = req.params;
  const { paymentId, orderId, reason, refundAmount, refundMode } = req.body;

  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const [payment, order] = await Promise.all([
    ShopkeeperPayment.findOne({ _id: paymentId, shopkeeperId, shopId: shopkeeper.shopId }).lean(),
    Order.findOne({ _id: orderId, shopId: shopkeeper.shopId }).lean(),
  ]);

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payment not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (Number(refundAmount) <= 0 || Number(refundAmount) > Number(payment.amount)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refund amount is invalid.', ERROR_CODES.VALIDATION_ERROR);
  }

  const refund = await ShopkeeperRefund.create({
    shopkeeperId,
    shopId: shopkeeper.shopId,
    paymentId,
    orderId,
    userId: payment.userId,
    reason,
    refundAmount: Number(refundAmount),
    refundMode,
    status: 'REQUESTED',
    statusHistory: [
      {
        status: 'REQUESTED',
        timestamp: new Date(),
        note: 'Refund requested by shopkeeper.',
      },
    ],
  });

  const user = await User.findById(payment.userId).lean();
  await sendRefundRequested({ user, refund, order });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Refund created successfully.',
    data: {
      refund,
    },
  });
};

const updateRefund = async (req, res) => {
  const { shopkeeperId, refundId } = req.params;
  const { status, note, bankDetails } = req.body;

  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const refund = await ShopkeeperRefund.findOne({
    _id: refundId,
    shopkeeperId,
    shopId: shopkeeper.shopId,
  });

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  refund.status = status;
  if (bankDetails) {
    refund.bankDetails = {
      ...refund.bankDetails,
      ...bankDetails,
    };
  }

  if (status === 'PROCESSING' || status === 'COMPLETED') {
    refund.processedAt = new Date();
  }

  refund.statusHistory.push({
    status,
    timestamp: new Date(),
    note: note || null,
  });

  await refund.save();

  const [user, order] = await Promise.all([User.findById(refund.userId).lean(), Order.findById(refund.orderId).lean()]);

  if (status === 'PROCESSING') {
    await sendRefundProcessing({ user, refund, order });
  }

  if (status === 'COMPLETED') {
    await sendRefundCompleted({ user, refund, order });
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund updated successfully.',
    data: {
      refund,
    },
  });
};

const getRefundStats = async (req, res) => {
  const { shopkeeperId } = req.params;
  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const filter = {
    shopkeeperId: new mongoose.Types.ObjectId(String(shopkeeperId)),
    shopId: new mongoose.Types.ObjectId(String(shopkeeper.shopId)),
  };

  const [
    totalRefunds,
    requestedRefunds,
    processingRefunds,
    completedRefunds,
    failedRefunds,
    totalAmountAgg,
    completedRefundList,
  ] = await Promise.all([
    ShopkeeperRefund.countDocuments(filter),
    ShopkeeperRefund.countDocuments({ ...filter, status: 'REQUESTED' }),
    ShopkeeperRefund.countDocuments({ ...filter, status: 'PROCESSING' }),
    ShopkeeperRefund.countDocuments({ ...filter, status: 'COMPLETED' }),
    ShopkeeperRefund.countDocuments({ ...filter, status: 'FAILED' }),
    ShopkeeperRefund.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$refundAmount' } } }]),
    ShopkeeperRefund.find({ ...filter, status: 'COMPLETED', processedAt: { $ne: null } })
      .select('createdAt processedAt')
      .lean(),
  ]);

  const averageProcessingTime = completedRefundList.length
    ? Number(
        (
          completedRefundList.reduce((sum, item) => {
            const createdAt = new Date(item.createdAt).getTime();
            const processedAt = new Date(item.processedAt).getTime();
            return sum + Math.max(0, processedAt - createdAt);
          }, 0) /
          completedRefundList.length /
          (1000 * 60 * 60 * 24)
        ).toFixed(2)
      )
    : 0;

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund stats fetched successfully.',
    data: {
      totalRefunds,
      requestedRefunds,
      processingRefunds,
      completedRefunds,
      failedRefunds,
      totalRefundAmount: Number(Number(totalAmountAgg?.[0]?.total || 0).toFixed(2)),
      averageProcessingTime,
    },
  });
};

const processRefund = async (req, res) => {
  const { shopkeeperId, refundId } = req.params;
  const { bankDetails, transactionRef, note } = req.body;

  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const refund = await ShopkeeperRefund.findOne({
    _id: refundId,
    shopkeeperId,
    shopId: shopkeeper.shopId,
  });

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  refund.status = 'PROCESSING';
  refund.bankDetails = {
    ...refund.bankDetails,
    ...(bankDetails || {}),
  };
  refund.transactionRef = transactionRef ? String(transactionRef).trim() : refund.transactionRef;
  refund.processedAt = new Date();
  refund.statusHistory.push({
    status: 'PROCESSING',
    timestamp: new Date(),
    note: note || 'Refund moved to processing.',
  });

  await refund.save();

  const [user, order] = await Promise.all([User.findById(refund.userId).lean(), Order.findById(refund.orderId).lean()]);
  await sendRefundProcessing({ user, refund, order });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund processing initiated successfully.',
    data: {
      refund,
    },
  });
};

module.exports = {
  getRefunds,
  getRefundById,
  createRefund,
  updateRefund,
  getRefundStats,
  processRefund,
};
