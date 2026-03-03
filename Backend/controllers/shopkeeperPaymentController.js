const mongoose = require('mongoose');
const ShopkeeperPayment = require('../models/ShopkeeperPayment');
const Shopkeeper = require('../models/Shopkeeper');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
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
    $or: [{ transactionId: regex }, ...(userIds.length ? [{ userId: { $in: userIds } }] : [])],
  };
};

const getPayments = async (req, res) => {
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

  const [payments, total, successCount, pendingCount, failedCount] = await Promise.all([
    ShopkeeperPayment.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'name phone')
      .lean(),
    ShopkeeperPayment.countDocuments(filter),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'SUCCESS' }),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'PENDING' }),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'FAILED' }),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shopkeeper payments fetched successfully.',
    data: {
      payments,
      totals: {
        successful: successCount,
        pending: pendingCount,
        failed: failedCount,
      },
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getPaymentById = async (req, res) => {
  const { shopkeeperId, paymentId } = req.params;
  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const payment = await ShopkeeperPayment.findOne({
    _id: paymentId,
    shopkeeperId,
    shopId: shopkeeper.shopId,
  })
    .populate('orderId')
    .populate('userId', 'name phone addresses')
    .lean();

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payment not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment details fetched successfully.',
    data: {
      payment,
    },
  });
};

const getPaymentStats = async (req, res) => {
  const { shopkeeperId } = req.params;
  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const filter = {
    shopkeeperId: new mongoose.Types.ObjectId(String(shopkeeperId)),
    shopId: new mongoose.Types.ObjectId(String(shopkeeper.shopId)),
  };

  const [
    totalPayments,
    successfulPayments,
    failedPayments,
    pendingPayments,
    amountAgg,
    commissionAgg,
    payableAgg,
  ] = await Promise.all([
    ShopkeeperPayment.countDocuments(filter),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'SUCCESS' }),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'FAILED' }),
    ShopkeeperPayment.countDocuments({ ...filter, status: 'PENDING' }),
    ShopkeeperPayment.aggregate([{ $match: filter }, { $group: { _id: null, totalAmount: { $sum: '$amount' } } }]),
    ShopkeeperPayment.aggregate([
      { $match: filter },
      { $group: { _id: null, totalCommission: { $sum: '$commission.amount' } } },
    ]),
    ShopkeeperPayment.aggregate([
      { $match: filter },
      { $group: { _id: null, netEarnings: { $sum: '$commission.payableAmount' } } },
    ]),
  ]);

  const successRate = totalPayments > 0 ? Number(((successfulPayments / totalPayments) * 100).toFixed(2)) : 0;

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment stats fetched successfully.',
    data: {
      totalPayments,
      successfulPayments,
      failedPayments,
      pendingPayments,
      totalAmount: Number(Number(amountAgg?.[0]?.totalAmount || 0).toFixed(2)),
      totalCommission: Number(Number(commissionAgg?.[0]?.totalCommission || 0).toFixed(2)),
      netEarnings: Number(Number(payableAgg?.[0]?.netEarnings || 0).toFixed(2)),
      successRate,
    },
  });
};

const verifyPayment = async (req, res) => {
  const { shopkeeperId, paymentId } = req.params;
  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const payment = await ShopkeeperPayment.findOne({
    _id: paymentId,
    shopkeeperId,
    shopId: shopkeeper.shopId,
  });

  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payment not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  payment.status = 'SUCCESS';
  payment.processedAt = new Date();
  if (req.body.transactionDetails?.transactionId) {
    payment.transactionId = String(req.body.transactionDetails.transactionId).trim();
  }

  await payment.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment verified successfully.',
    data: {
      payment,
    },
  });
};

const bulkStatusUpdate = async (req, res) => {
  const { shopkeeperId } = req.params;
  const { paymentIds = [], status } = req.body;

  const shopkeeper = await ensureShopkeeperAccess(shopkeeperId, req.shopkeeper.id);

  const update = {
    status,
    ...(status === 'SUCCESS' ? { processedAt: new Date() } : {}),
  };

  const result = await ShopkeeperPayment.updateMany(
    {
      _id: { $in: paymentIds },
      shopkeeperId,
      shopId: shopkeeper.shopId,
    },
    {
      $set: update,
    }
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment statuses updated successfully.',
    data: {
      updated: Number(result.modifiedCount || 0),
      failed: Math.max(0, Number(paymentIds.length || 0) - Number(result.modifiedCount || 0)),
    },
  });
};

module.exports = {
  getPayments,
  getPaymentById,
  getPaymentStats,
  verifyPayment,
  bulkStatusUpdate,
};
