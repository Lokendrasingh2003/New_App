const mongoose = require('mongoose');
const Order = require('../models/Order');
const Refund = require('../models/Refund');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Shop = require('../models/Shop');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { releaseInventory } = require('../services/inventoryService');
const { issueRefund } = require('../services/paymentService');
const {
  sendOrderStatusUpdate,
  sendRefundRequested,
  sendRefundProcessing,
  sendRefundCompleted,
  sendRefundFailed,
} = require('../services/notificationService');
const {
  HTTP_STATUS,
  ERROR_CODES,
  ORDER_STATUS,
  ORDER_PAYMENT_MODES,
  ORDER_PAYMENT_STATUS,
  AUDIT_EVENT_TYPES,
} = require('../config/constants');

const REFUND_DEADLINE_DAYS = 7;

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getDateRange = ({ dateFrom, dateTo }) => {
  const range = {};

  if (dateFrom) {
    range.$gte = new Date(dateFrom);
  }

  if (dateTo) {
    range.$lte = new Date(dateTo);
  }

  return Object.keys(range).length ? range : null;
};

const buildAdminActor = (req) => ({
  id: req.user?.id || req.internal?.actorId || 'superadmin-system',
  role: req.user?.role || req.internal?.role || 'superadmin',
});

const appendRefundHistory = (refund, { status, note, processedBy }) => {
  refund.statusHistory.push({
    status,
    note: note || null,
    timestamp: new Date(),
    processedBy: processedBy || null,
  });
};

const findOrderByAnyIdentifier = async (value) => {
  if (mongoose.isValidObjectId(value)) {
    const byId = await Order.findById(value);
    if (byId) {
      return byId;
    }
  }

  return Order.findOne({ orderId: String(value).trim() });
};

const isRefundDeadlineExceeded = (order) => {
  const createdAt = new Date(order.createdAt);
  const deadline = new Date(createdAt);
  deadline.setDate(deadline.getDate() + REFUND_DEADLINE_DAYS);
  return Date.now() > deadline.getTime();
};

const validateRefundEligibility = async (order) => {
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (![ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Refund can only be requested for CANCELLED or DELIVERED orders.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const payment = await Payment.findOne({ orderId: order._id });
  if (!payment || payment.status !== 'SUCCESS') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refund requires a successful payment.', ERROR_CODES.PAYMENT_REFUND_FAILED);
  }

  const existingRefund = await Refund.findOne({ orderId: order._id });
  if (existingRefund) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Refund already exists for this order.', ERROR_CODES.VALIDATION_ERROR);
  }

  return { payment };
};

const processRefundAutomaticallyIfEligible = async ({ refund, order, payment, actorId, note }) => {
  const deadlineExceeded = isRefundDeadlineExceeded(order);

  if (payment.method !== 'ONLINE' || deadlineExceeded) {
    return { autoProcessed: false, deadlineExceeded };
  }

  refund.status = 'PROCESSING';
  refund.processedAt = new Date();
  appendRefundHistory(refund, {
    status: 'PROCESSING',
    note: 'Auto-processing initiated for online payment.',
    processedBy: actorId,
  });
  await refund.save();

  const user = await User.findById(refund.userId);
  await sendRefundProcessing({ user, refund, order });

  const gatewayRefund = await issueRefund({ orderId: order.orderId, reason: note || refund.reason || 'Auto refund' });

  refund.status = 'COMPLETED';
  refund.transactionRef = gatewayRefund.refundId;
  refund.completedAt = new Date();
  appendRefundHistory(refund, {
    status: 'COMPLETED',
    note: 'Auto refund completed successfully.',
    processedBy: actorId,
  });
  await refund.save();

  order.payment.status = ORDER_PAYMENT_STATUS.REFUNDED;
  order.payment.refundId = gatewayRefund.refundId;
  order.payment.refundedAt = new Date();
  await order.save();

  await sendRefundCompleted({ user, refund, order });

  return { autoProcessed: true, deadlineExceeded };
};

const buildOrderSummary = ({ order, user, shop, refund }) => ({
  id: order._id,
  orderId: order.orderId,
  status: order.status,
  paymentStatus: order.payment?.status || null,
  paymentMode: order.payment?.mode || null,
  amount: Number(order.pricing?.total || 0),
  itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  customer: user
    ? {
        id: user._id,
        name: user.name || null,
        phone: user.phone || null,
      }
    : null,
  shop: shop
    ? {
        id: shop._id,
        name: shop.name || null,
        cityId: shop.cityId || order.cityId,
      }
    : {
        id: order.shopId,
        name: null,
        cityId: order.cityId,
      },
  refund: refund
    ? {
        id: refund._id,
        status: refund.status,
        amount: refund.amount,
      }
    : null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const listAdminOrders = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.cityId) {
    filter.cityId = req.query.cityId;
  }

  if (req.query.shopId) {
    filter.shopId = req.query.shopId;
  }

  if (req.query.userId) {
    filter.userId = req.query.userId;
  }

  if (req.query.paymentStatus) {
    filter['payment.status'] = req.query.paymentStatus;
  }

  const dateRange = getDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    const userMatches = await User.find({ phone: { $regex: search, $options: 'i' } }).select('_id').lean();

    filter.$or = [{ orderId: { $regex: search, $options: 'i' } }];

    if (mongoose.isValidObjectId(search)) {
      filter.$or.push({ _id: search });
    }

    if (userMatches.length) {
      filter.$or.push({ userId: { $in: userMatches.map((item) => item._id) } });
    }
  }

  const sortMode = String(req.query.sort || 'recent').trim().toLowerCase();
  const sort = sortMode === 'value' ? { 'pricing.total': -1, createdAt: -1 } : { createdAt: -1 };

  const [orders, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(offset).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  const orderIds = orders.map((order) => order._id);
  const [users, shops, refunds] = await Promise.all([
    User.find({ _id: { $in: orders.map((order) => order.userId) } }).select('_id name phone').lean(),
    Shop.find({ _id: { $in: orders.map((order) => order.shopId) } }).select('_id name cityId').lean(),
    Refund.find({ orderId: { $in: orderIds } }).select('_id orderId status amount').lean(),
  ]);

  const userMap = new Map(users.map((user) => [String(user._id), user]));
  const shopMap = new Map(shops.map((shop) => [String(shop._id), shop]));
  const refundMap = new Map(refunds.map((refund) => [String(refund.orderId), refund]));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin orders fetched successfully.',
    data: {
      orders: orders.map((order) =>
        buildOrderSummary({
          order,
          user: userMap.get(String(order.userId)),
          shop: shopMap.get(String(order.shopId)),
          refund: refundMap.get(String(order._id)) || null,
        })
      ),
      pagination: { total, limit, offset },
    },
  });
};

const getAdminOrderById = async (req, res) => {
  const order = await findOrderByAnyIdentifier(req.params.orderId);

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  const [user, shop, payment, refund] = await Promise.all([
    User.findById(order.userId).select('_id name phone email').lean(),
    Shop.findById(order.shopId).select('_id name slug cityId ownerId phone address').lean(),
    Payment.findOne({ orderId: order._id }).lean(),
    Refund.findOne({ orderId: order._id }).sort({ createdAt: -1 }).lean(),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin order fetched successfully.',
    data: {
      order: {
        id: order._id,
        orderId: order.orderId,
        status: order.status,
        statusHistory: order.statusHistory || [],
        customer: user,
        shop,
        cityId: order.cityId,
        items: order.items || [],
        deliveryAddress: order.deliveryAddress || null,
        pricing: order.pricing || null,
        payment: {
          orderPayment: order.payment || null,
          paymentRecord: payment || null,
        },
        refundStatus: refund
          ? {
              id: refund._id,
              status: refund.status,
              amount: refund.amount,
              transactionRef: refund.transactionRef,
              completedAt: refund.completedAt,
            }
          : null,
        specialInstructions: order.specialInstructions || null,
        cancellation: order.cancellation || null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    },
  });
};

const forceCancelAdminOrder = async (req, res) => {
  const reason = String(req.body.reason || '').trim();
  const order = await findOrderByAnyIdentifier(req.params.orderId);

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order is already cancelled.', ERROR_CODES.ORDER_ALREADY_CANCELLED);
  }

  if (order.inventoryState === 'LOCKED') {
    await releaseInventory(order.items, false);
  } else if (order.inventoryState === 'DEDUCTED') {
    await releaseInventory(order.items, true);
  }

  order.inventoryState = 'RELEASED';
  order.status = ORDER_STATUS.CANCELLED;
  order.statusHistory.push({
    status: ORDER_STATUS.CANCELLED,
    timestamp: new Date(),
    note: reason || 'Force cancelled by super admin.',
  });
  order.cancellation = {
    reason: reason || 'Force cancelled by super admin.',
    cancelledAt: new Date(),
  };

  let refund = await Refund.findOne({ orderId: order._id });
  const payment = await Payment.findOne({ orderId: order._id });
  const actor = buildAdminActor(req);

  if (order.payment?.mode === ORDER_PAYMENT_MODES.COD && order.payment.status !== ORDER_PAYMENT_STATUS.FAILED) {
    order.payment.status = ORDER_PAYMENT_STATUS.FAILED;
  }

  if (!refund && payment && payment.status === 'SUCCESS') {
    refund = await Refund.create({
      orderId: order._id,
      paymentId: payment._id,
      shopId: order.shopId,
      userId: order.userId,
      cityId: order.cityId,
      amount: Number(payment.amount || order.pricing?.total || 0),
      reason: reason || 'Force cancelled by super admin',
      status: 'REQUESTED',
      statusHistory: [
        {
          status: 'REQUESTED',
          timestamp: new Date(),
          note: 'Refund requested during force-cancel operation.',
          processedBy: actor.id,
        },
      ],
      bankDetails: {},
      transactionRef: null,
      processedAt: null,
      completedAt: null,
    });

    const user = await User.findById(order.userId);
    await sendRefundRequested({ user, refund, order });

    await processRefundAutomaticallyIfEligible({
      refund,
      order,
      payment,
      actorId: actor.id,
      note: reason || 'Force cancellation refund',
    });
  }

  await order.save();

  const user = await User.findById(order.userId);
  await sendOrderStatusUpdate({ user, order, status: ORDER_STATUS.CANCELLED });

  await logAudit(
    AUDIT_EVENT_TYPES.ORDER_FORCE_CANCELLED,
    buildActorFromRequest(req),
    { type: 'ORDER', id: order._id, name: order.orderId },
    'UPDATED',
    {
      before: { status: ORDER_STATUS.NEW },
      after: { status: order.status, reason, refundId: refund ? String(refund._id) : null },
    },
    'Order force-cancelled by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Order force-cancelled successfully.',
    data: {
      success: true,
      order,
      refund,
    },
  });
};

const getAdminOrderStats = async (req, res) => {
  const match = {};
  const dateRange = getDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    match.createdAt = dateRange;
  }

  const [
    totalOrders,
    revenueAgg,
    averageAgg,
    ordersByStatusAgg,
    ordersByCityAgg,
    ordersByPaymentAgg,
    topShopsAgg,
    topProductsAgg,
  ] = await Promise.all([
    Order.countDocuments(match),
    Order.aggregate([{ $match: match }, { $group: { _id: null, totalRevenue: { $sum: '$pricing.total' } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: null, averageOrderValue: { $avg: '$pricing.total' } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$cityId', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$payment.status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$shopId',
          orders: { $sum: 1 },
          revenue: { $sum: '$pricing.total' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'shops',
          localField: '_id',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          shopId: '$_id',
          shopName: '$shop.name',
          orders: 1,
          revenue: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          productName: { $first: '$items.productName' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          productName: 1,
          quantitySold: 1,
          revenue: 1,
        },
      },
    ]),
  ]);

  const mapObject = (rows) =>
    rows.reduce((acc, row) => {
      acc[String(row._id)] = Number(row.count || 0);
      return acc;
    }, {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin order stats fetched successfully.',
    data: {
      totalOrders,
      totalRevenue: Number(Number(revenueAgg?.[0]?.totalRevenue || 0).toFixed(2)),
      averageOrderValue: Number(Number(averageAgg?.[0]?.averageOrderValue || 0).toFixed(2)),
      ordersByStatus: mapObject(ordersByStatusAgg),
      ordersByCity: mapObject(ordersByCityAgg),
      ordersByPaymentStatus: mapObject(ordersByPaymentAgg),
      topShops: topShopsAgg,
      topProducts: topProductsAgg,
    },
  });
};

const listAdminRefunds = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.shopId) {
    filter.shopId = req.query.shopId;
  }

  const dateRange = getDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const [refunds, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Refund.countDocuments(filter),
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

const getAdminRefundById = async (req, res) => {
  const refund = await Refund.findById(req.params.refundId).lean();
  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund fetched successfully.',
    data: { refund },
  });
};

const createAdminRefund = async (req, res) => {
  const { orderId } = req.body;
  const reason = String(req.body.reason || '').trim();
  const actor = buildAdminActor(req);

  const order = await findOrderByAnyIdentifier(orderId);
  const { payment } = await validateRefundEligibility(order);

  if (order.status !== ORDER_STATUS.CANCELLED) {
    order.status = ORDER_STATUS.CANCELLED;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELLED,
      timestamp: new Date(),
      note: 'Cancelled by super admin while raising refund.',
    });
    order.cancellation = {
      reason: reason || 'Cancelled by super admin for refund',
      cancelledAt: new Date(),
    };
  }

  const refund = await Refund.create({
    orderId: order._id,
    paymentId: payment._id,
    shopId: order.shopId,
    userId: order.userId,
    cityId: order.cityId,
    amount: Number(payment.amount || order.pricing?.total || 0),
    reason,
    status: 'REQUESTED',
    statusHistory: [
      {
        status: 'REQUESTED',
        timestamp: new Date(),
        note: 'Refund requested by super admin.',
        processedBy: actor.id,
      },
    ],
    bankDetails: {},
  });

  await order.save();

  const user = await User.findById(order.userId);
  await sendRefundRequested({ user, refund, order });

  const autoOutcome = await processRefundAutomaticallyIfEligible({
    refund,
    order,
    payment,
    actorId: actor.id,
    note: reason,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.ORDER_REFUND_TRIGGERED,
    buildActorFromRequest(req),
    { type: 'REFUND', id: refund._id, name: order.orderId },
    'CREATED',
    {
      before: null,
      after: {
        status: refund.status,
        orderId: order.orderId,
        autoProcessed: autoOutcome.autoProcessed,
        deadlineExceeded: autoOutcome.deadlineExceeded,
      },
    },
    'Refund triggered by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Refund request created successfully.',
    data: { success: true, refund },
  });
};

const processAdminRefund = async (req, res) => {
  const actor = buildAdminActor(req);
  const refund = await Refund.findById(req.params.refundId);

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!['REQUESTED', 'FAILED'].includes(refund.status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Only REQUESTED or FAILED refunds can be moved to PROCESSING.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (req.body.bankDetails) {
    refund.bankDetails = {
      accountNumber: req.body.bankDetails.accountNumber,
      ifscCode: req.body.bankDetails.ifscCode,
      bankName: req.body.bankDetails.bankName,
    };
  }

  refund.status = 'PROCESSING';
  refund.processedAt = new Date();
  appendRefundHistory(refund, {
    status: 'PROCESSING',
    note: String(req.body.notes || '').trim() || 'Refund moved to processing.',
    processedBy: actor.id,
  });

  const order = await Order.findById(refund.orderId);
  await issueRefund({ orderId: order?.orderId || String(refund.orderId), reason: refund.reason });

  await refund.save();

  const user = await User.findById(refund.userId);
  await sendRefundProcessing({ user, refund, order });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund moved to processing successfully.',
    data: { success: true, refund },
  });
};

const completeAdminRefund = async (req, res) => {
  const actor = buildAdminActor(req);
  const refund = await Refund.findById(req.params.refundId);

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (refund.status !== 'PROCESSING') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only PROCESSING refund can be completed.', ERROR_CODES.VALIDATION_ERROR);
  }

  refund.status = 'COMPLETED';
  refund.transactionRef = String(req.body.transactionRef || '').trim();
  refund.completedAt = new Date();
  appendRefundHistory(refund, {
    status: 'COMPLETED',
    note: 'Refund marked completed by super admin.',
    processedBy: actor.id,
  });

  const [order, payment] = await Promise.all([Order.findById(refund.orderId), Payment.findById(refund.paymentId)]);

  if (order) {
    order.payment.status = ORDER_PAYMENT_STATUS.REFUNDED;
    order.payment.refundId = refund.transactionRef;
    order.payment.refundedAt = new Date();
    await order.save();
  }

  if (payment) {
    payment.status = 'SUCCESS';
    payment.paymentGatewayResponse = {
      ...(payment.paymentGatewayResponse || {}),
      refundStatus: 'COMPLETED',
      refundTransactionRef: refund.transactionRef,
      refundUpdatedAt: new Date(),
    };
    await payment.save();
  }

  await refund.save();

  const user = await User.findById(refund.userId);
  await sendRefundCompleted({ user, refund, order });

  await logAudit(
    AUDIT_EVENT_TYPES.REFUND_UPDATED,
    buildActorFromRequest(req),
    { type: 'REFUND', id: refund._id, name: order?.orderId || null },
    'UPDATED',
    {
      before: { status: 'PROCESSING' },
      after: { status: 'COMPLETED', transactionRef: refund.transactionRef },
    },
    'Refund completed by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund completed successfully.',
    data: { success: true, refund },
  });
};

const failAdminRefund = async (req, res) => {
  const actor = buildAdminActor(req);
  const note = String(req.body.reason || '').trim();
  const refund = await Refund.findById(req.params.refundId);

  if (!refund) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Refund not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!['REQUESTED', 'PROCESSING'].includes(refund.status)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refund cannot be failed from current status.', ERROR_CODES.VALIDATION_ERROR);
  }

  refund.status = 'FAILED';
  appendRefundHistory(refund, {
    status: 'FAILED',
    note: note || 'Marked for manual intervention by super admin.',
    processedBy: actor.id,
  });
  await refund.save();

  const order = await Order.findById(refund.orderId);
  const user = await User.findById(refund.userId);
  await sendRefundFailed({ user, refund, order });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund marked as failed for manual intervention.',
    data: { success: true, refund },
  });
};

module.exports = {
  listAdminOrders,
  getAdminOrderById,
  forceCancelAdminOrder,
  getAdminOrderStats,
  listAdminRefunds,
  getAdminRefundById,
  createAdminRefund,
  processAdminRefund,
  completeAdminRefund,
  failAdminRefund,
};
