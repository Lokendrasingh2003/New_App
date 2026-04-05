const mongoose = require('mongoose');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const User = require('../models/User');
const Shopkeeper = require('../models/Shopkeeper');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { issueRefund } = require('../services/paymentService');
const { releaseInventory, deductLockedInventory } = require('../services/inventoryService');
const { incrementOfferStats } = require('../services/offerService');
const {
  sendOrderStatusUpdate,
  sendOutForDelivery,
  sendDeliveryConfirmation,
} = require('../services/notificationService');
const {
  HTTP_STATUS,
  ERROR_CODES,
  ORDER_STATUS,
  ORDER_PAYMENT_MODES,
  ORDER_PAYMENT_STATUS,
  SHOPKEEPER_STATUS,
} = require('../config/constants');

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.NEW]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.DISPATCHED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DISPATCHED]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const ensureOwnedShop = async ({ shopkeeperId, shopId }) => {
  const [shopkeeper, shop] = await Promise.all([Shopkeeper.findById(shopkeeperId), Shop.findById(shopId)]);

  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  if (shopkeeper.status !== SHOPKEEPER_STATUS.ACTIVE) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Active shopkeeper account required.', ERROR_CODES.SHOPKEEPER_SUSPENDED);
  }

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  if (String(shop.ownerId) !== String(shopkeeper._id)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not own this shop.', ERROR_CODES.SHOP_OWNER_MISMATCH);
  }

  return { shopkeeper, shop };
};

const getSort = (sort) => {
  if (sort === 'price') {
    return { 'pricing.total': -1, createdAt: -1 };
  }

  if (sort === 'status') {
    return { status: 1, createdAt: -1 };
  }

  return { createdAt: -1 };
};

const toOrderList = (order, customer) => ({
  orderId: order.orderId,
  customerName: customer?.name || customer?.phone || 'Customer',
  customerPhone: customer?.phone || '-',
  total: Number(order.pricing?.total || 0),
  paymentMode: order.payment?.mode || ORDER_PAYMENT_MODES.COD,
  paymentStatus: order.payment?.status || ORDER_PAYMENT_STATUS.PENDING,
  status: order.status,
  date: order.createdAt,
  itemsCount: Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : 0,
});

const toOrderDetail = (order, customer) => ({
  id: order._id,
  orderId: order.orderId,
  status: order.status,
  statusHistory: order.statusHistory || [],
  customer: {
    id: customer?._id || null,
    name: customer?.name || null,
    phone: customer?.phone || null,
  },
  items: order.items || [],
  deliveryAddress: order.deliveryAddress || null,
  pricing: order.pricing,
  payment: order.payment,
  appliedOffer: order.appliedOffer || null,
  specialInstructions: order.specialInstructions || null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const getOrderForShop = async ({ shopId, orderId }) => {
  return Order.findOne({ shopId, orderId });
};

const validateTransition = ({ current, next, note }) => {
  if (current === ORDER_STATUS.CANCELLED || current === ORDER_STATUS.DELIVERED) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot modify completed or cancelled orders.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid status transition from ${current} to ${next}.`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (next === ORDER_STATUS.CANCELLED && !String(note || '').trim()) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cancellation note/reason is required for approval trail.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const applyStatusSideEffects = async ({ order, nextStatus, note }) => {
  if (nextStatus === ORDER_STATUS.CANCELLED) {
    if (order.inventoryState === 'LOCKED') {
      await releaseInventory(order.items, false);
    } else if (order.inventoryState === 'DEDUCTED') {
      await releaseInventory(order.items, true);
    }

    order.inventoryState = 'RELEASED';

    if (order.payment.mode === ORDER_PAYMENT_MODES.ONLINE && order.payment.status === ORDER_PAYMENT_STATUS.SUCCESS) {
      const refund = await issueRefund({
        orderId: order.orderId,
        reason: note || 'Order cancelled by shop',
      });
      order.payment.status = ORDER_PAYMENT_STATUS.REFUNDED;
      order.payment.refundId = refund.refundId;
      order.payment.refundedAt = new Date();
    }

    if (order.payment.mode === ORDER_PAYMENT_MODES.COD && order.payment.status !== ORDER_PAYMENT_STATUS.FAILED) {
      order.payment.status = ORDER_PAYMENT_STATUS.FAILED;
    }
  }

  if (nextStatus === ORDER_STATUS.DELIVERED && order.inventoryState === 'LOCKED') {
    await deductLockedInventory(order.items);
    order.inventoryState = 'DEDUCTED';
  }

  if (nextStatus === ORDER_STATUS.DELIVERED && order.payment.mode === ORDER_PAYMENT_MODES.COD && order.payment.status !== ORDER_PAYMENT_STATUS.SUCCESS) {
    order.payment.status = ORDER_PAYMENT_STATUS.SUCCESS;
    order.payment.paidAt = new Date();
  }

  if (nextStatus === ORDER_STATUS.DELIVERED && !order.offerStatsApplied && order.appliedOffer?.offerId) {
    await incrementOfferStats({
      offerId: order.appliedOffer.offerId,
      discountAmount: Number(order.appliedOffer.discountAmount || 0),
    });
    order.offerStatsApplied = true;
  }
};

const notifyStatus = async ({ order, status }) => {
  const customer = await User.findById(order.userId);

  await sendOrderStatusUpdate({ user: customer, order, status });

  if (status === ORDER_STATUS.DISPATCHED) {
    await sendOutForDelivery({ user: customer, order });
  }

  if (status === ORDER_STATUS.DELIVERED) {
    await sendDeliveryConfirmation({ user: customer, order });
  }
};

const listShopOrders = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const { status, dateFrom, dateTo, search, sort } = req.query;
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = { shopId };

  if (status) {
    filter.status = status;
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) {
      filter.createdAt.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      filter.createdAt.$lte = new Date(dateTo);
    }
  }

  if (search) {
    const users = await User.find({
      $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }],
    }).lean();

    const userIds = users.map((user) => user._id);

    filter.$or = [{ orderId: { $regex: search, $options: 'i' } }];
    if (userIds.length > 0) {
      filter.$or.push({ userId: { $in: userIds } });
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort(getSort(sort)).skip(offset).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  const userMap = new Map(
    (await User.find({ _id: { $in: orders.map((order) => order.userId) } }).lean()).map((user) => [String(user._id), user])
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop orders fetched successfully.',
    data: {
      orders: orders.map((order) => toOrderList(order, userMap.get(String(order.userId)))),
      pagination: { total, limit, offset },
    },
  });
};

const getShopOrderDetail = async (req, res) => {
  const { shopId, orderId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const order = await getOrderForShop({ shopId, orderId });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  const customer = await User.findById(order.userId).lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop order details fetched successfully.',
    data: {
      order: toOrderDetail(order, customer),
    },
  });
};

const updateShopOrderStatus = async (req, res) => {
  const { shopId, orderId } = req.params;
  const { status, note } = req.body;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const order = await getOrderForShop({ shopId, orderId });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  validateTransition({ current: order.status, next: status, note });
  await applyStatusSideEffects({ order, nextStatus: status, note });

  order.status = status;
  order.statusHistory.push({
    status,
    timestamp: new Date(),
    note: String(note || '').trim() || `Status updated to ${status} by shopkeeper`,
  });

  await order.save();
  await notifyStatus({ order, status });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Order status updated successfully.',
    data: {
      order,
    },
  });
};

const acceptOrder = async (req, res) => {
  req.body.status = ORDER_STATUS.ACCEPTED;
  req.body.note = req.body.note || 'Order accepted by shop';
  return updateShopOrderStatus(req, res);
};

const rejectOrder = async (req, res) => {
  req.body.status = ORDER_STATUS.CANCELLED;
  req.body.note = req.body.reason || 'Order rejected by shop';
  return updateShopOrderStatus(req, res);
};

const markOrderReady = async (req, res) => {
  req.body.status = ORDER_STATUS.READY;
  req.body.note = req.body.note || 'Order marked ready by shop';
  return updateShopOrderStatus(req, res);
};

const getTodayOrderStats = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [todayOrders, earningsResult, statusBreakdown] = await Promise.all([
    Order.countDocuments({ shopId, createdAt: { $gte: dayStart } }),
    Order.aggregate([
      { $match: { shopId: shopObjectId, status: ORDER_STATUS.DELIVERED, createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $match: { shopId: shopObjectId, createdAt: { $gte: dayStart } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const statusMap = new Map(statusBreakdown.map((row) => [row._id, row.count]));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Today order stats fetched successfully.',
    data: {
      todayOrders,
      todayEarnings: Number(Number(earningsResult?.[0]?.total || 0).toFixed(2)),
      newOrders: Number(statusMap.get(ORDER_STATUS.NEW) || 0),
      preparingOrders: Number(statusMap.get(ORDER_STATUS.PREPARING) || 0),
      readyOrders: Number(statusMap.get(ORDER_STATUS.READY) || 0),
      dispatchedOrders: Number(statusMap.get(ORDER_STATUS.DISPATCHED) || 0),
    },
  });
};

const getOrdersAnalytics = async (req, res) => {
  const { shopId } = req.params;
  const { from, to, groupBy = 'daily' } = req.query;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));

  const fromDate = new Date(from);
  const toDate = new Date(to);

  const match = {
    shopId: shopObjectId,
    createdAt: {
      $gte: fromDate,
      $lte: toDate,
    },
  };

  const revenueMatch = {
    ...match,
    status: ORDER_STATUS.DELIVERED,
  };

  const [
    totalOrders,
    deliveredOrders,
    earningsResult,
    byStatus,
    byDay,
    topProducts,
    topCategories,
  ] = await Promise.all([
    Order.countDocuments(match),
    Order.countDocuments(revenueMatch),
    Order.aggregate([{ $match: revenueMatch }, { $group: { _id: null, total: { $sum: '$pricing.total' } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id:
            groupBy === 'weekly'
              ? { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } }
              : { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
          count: { $sum: 1 },
          earnings: { $sum: '$pricing.total' },
        },
      },
      { $sort: { '_id.date': 1, '_id.year': 1, '_id.week': 1 } },
    ]),
    Order.aggregate([
      { $match: revenueMatch },
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
    ]),
    Order.aggregate([
      { $match: revenueMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productRef',
        },
      },
      { $unwind: { path: '$productRef', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$productRef.categoryName', 'Uncategorized'] },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const totalEarnings = Number(Number(earningsResult?.[0]?.total || 0).toFixed(2));
  const averageOrderValue = deliveredOrders > 0 ? Number((totalEarnings / deliveredOrders).toFixed(2)) : 0;

  const ordersByStatus = Object.fromEntries(byStatus.map((entry) => [entry._id, entry.count]));

  const ordersByDay = {};
  for (const row of byDay) {
    const key = row._id?.date || `${row._id?.year}-W${String(row._id?.week).padStart(2, '0')}`;
    ordersByDay[key] = {
      orders: row.count,
      earnings: Number(Number(row.earnings || 0).toFixed(2)),
    };
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Order analytics fetched successfully.',
    data: {
      totalOrders,
      totalEarnings,
      averageOrderValue,
      ordersByStatus,
      ordersByDay,
      topProducts: topProducts.map((item) => ({
        productId: item._id,
        productName: item.productName,
        quantitySold: Number(item.quantitySold || 0),
        revenue: Number(Number(item.revenue || 0).toFixed(2)),
      })),
      topCategories: topCategories.map((item) => ({
        categoryName: item._id,
        revenue: Number(Number(item.revenue || 0).toFixed(2)),
      })),
    },
  });
};

module.exports = {
  listShopOrders,
  getShopOrderDetail,
  updateShopOrderStatus,
  acceptOrder,
  rejectOrder,
  markOrderReady,
  getTodayOrderStats,
  getOrdersAnalytics,
};
