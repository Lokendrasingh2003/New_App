const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const User = require('../models/User');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { lockInventory, releaseInventory, ensureAvailableForOrder } = require('../services/inventoryService');
const { createPaymentUrl, issueRefund } = require('../services/paymentService');
const { resolveShopCommission, calculateCommissionAmount } = require('../services/commissionService');
const { sendOrderConfirmation, sendOrderReceivedToShop, sendOrderStatusUpdate } = require('../services/notificationService');
const {
  HTTP_STATUS,
  ERROR_CODES,
  USER_MIN_ORDER_VALUE,
  ORDER_STATUS,
  ORDER_PAYMENT_MODES,
  ORDER_PAYMENT_STATUS,
} = require('../config/constants');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const canCancelStatus = new Set([ORDER_STATUS.NEW, ORDER_STATUS.ACCEPTED]);

const generateOrderId = async (prefix = 'U') => {
  let attempts = 0;

  while (attempts < 6) {
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const value = `#${prefix}-${randomPart}`;
    const exists = await Order.exists({ orderId: value });

    if (!exists) {
      return value;
    }

    attempts += 1;
  }

  throw new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, 'Unable to generate order id.', ERROR_CODES.INTERNAL_ERROR);
};

const getUserAddress = (user, addressId) => {
  const address = (user.addresses || []).find((item) => String(item.id) === String(addressId));
  if (!address) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  if (!/^[0-9]{10}$/.test(String(address.phone || ''))) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Address phone is invalid.', ERROR_CODES.VALIDATION_ERROR);
  }

  return address;
};

const validateServiceability = (shop, address) => {
  const allowedAreas = (shop.delivery?.availableAreas || []).map((area) => String(area).trim().toLowerCase());

  if (allowedAreas.length === 0) {
    return true;
  }

  const addressArea = String(address.area || '').trim().toLowerCase();
  if (!addressArea || !allowedAreas.includes(addressArea)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Delivery address is outside service area.',
      ERROR_CODES.ADDRESS_OUTSIDE_SERVICE_AREA
    );
  }

  return true;
};

const toOrderListItem = (order) => ({
  orderId: order.orderId,
  shopId: order.shopId,
  cityId: order.cityId,
  status: order.status,
  payment: {
    mode: order.payment?.mode,
    status: order.payment?.status,
  },
  pricing: order.pricing,
  itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const toOrderDetail = (order) => ({
  id: order._id,
  orderId: order.orderId,
  userId: order.userId,
  shopId: order.shopId,
  cityId: order.cityId,
  items: order.items,
  deliveryAddress: order.deliveryAddress,
  pricing: order.pricing,
  payment: order.payment,
  status: order.status,
  statusHistory: order.statusHistory || [],
  specialInstructions: order.specialInstructions || null,
  deliveryPartner: order.deliveryPartner || null,
  feedback: order.feedback || null,
  cancellation: order.cancellation || null,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const createOrder = async (req, res) => {
  const { cartId, addressId, paymentMode, couponCode, specialInstructions } = req.body;

  if (!mongoose.isValidObjectId(cartId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid cart id.', ERROR_CODES.VALIDATION_ERROR);
  }

  const cart = await Cart.findOne({ _id: cartId, userId: req.user.id });
  if (!cart) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart not found.', ERROR_CODES.CART_NOT_FOUND);
  }

  if (!Array.isArray(cart.items) || cart.items.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cart must not be empty.', ERROR_CODES.CART_NOT_FOUND);
  }

  if (Number(cart.total || 0) < USER_MIN_ORDER_VALUE) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Minimum order value is ₹${USER_MIN_ORDER_VALUE}.`,
      ERROR_CODES.MIN_ORDER_VALUE_NOT_MET
    );
  }

  const [user, shop] = await Promise.all([
    User.findById(req.user.id),
    Shop.findOne({ _id: cart.shopId, isActive: true, publicVisible: true, 'subscription.isActive': true }),
  ]);

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const address = getUserAddress(user, addressId);
  validateServiceability(shop, address);

  const orderItems = cart.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    variantId: item.variantId,
    variantLabel: item.variantLabel,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    image: item.image || null,
  }));

  await ensureAvailableForOrder(orderItems);

  let lockApplied = false;

  try {
    await lockInventory(orderItems);
    lockApplied = true;

    const orderId = await generateOrderId('U');
    const now = new Date();
    const normalizedPaymentMode = String(paymentMode || ORDER_PAYMENT_MODES.COD).toUpperCase();

    const order = await Order.create({
      orderId,
      userId: user._id,
      shopId: shop._id,
      cityId: shop.cityId,
      cartId: cart._id,
      items: orderItems,
      deliveryAddress: {
        addressLine1: address.addressLine1,
        area: address.area,
        city: address.city,
        pincode: address.pincode,
        phone: address.phone,
        coordinates: {
          lat: null,
          lng: null,
        },
      },
      pricing: {
        subtotal: Number(cart.subtotal || 0),
        discount: Number(cart.discount || 0),
        deliveryCharge: Number(cart.deliveryCharge || 0),
        tax: Number(cart.tax || 0),
        total: Number(cart.total || 0),
      },
      appliedOffer: {
        offerId: cart.appliedOffer?.offerId || null,
        name: cart.appliedOffer?.name || null,
        type: cart.appliedOffer?.type || null,
        value: Number(cart.appliedOffer?.value || 0),
        discountAmount: Number(cart.appliedOffer?.discountAmount || 0),
      },
      appliedCoupon: {
        couponId: cart.appliedCoupon?.couponId || null,
        code: cart.appliedCoupon?.code || null,
        discountAmount: Number(cart.appliedCoupon?.discountAmount || 0),
      },
      offerStatsApplied: false,
      payment: {
        mode:
          normalizedPaymentMode === ORDER_PAYMENT_MODES.ONLINE
            ? ORDER_PAYMENT_MODES.ONLINE
            : ORDER_PAYMENT_MODES.COD,
        status: ORDER_PAYMENT_STATUS.PENDING,
        transactionId: null,
        failureReason: null,
      },
      status: ORDER_STATUS.NEW,
      statusHistory: [
        {
          status: ORDER_STATUS.NEW,
          timestamp: now,
          note: 'Order created from checkout.',
        },
      ],
      specialInstructions: specialInstructions || null,
      inventoryState: 'LOCKED',
    });

    const commissionInfo = await resolveShopCommission({ shopId: shop._id, at: now });
    const commissionAmount = calculateCommissionAmount({
      amount: Number(cart.total || 0),
      percentage: commissionInfo.percentage,
    });

    await Payment.create({
      orderId: order._id,
      userId: user._id,
      shopId: shop._id,
      amount: Number(cart.total || 0),
      status: 'PENDING',
      method: order.payment.mode,
      transactionId: null,
      paymentGatewayResponse: {},
      commission: {
        percentage: commissionInfo.percentage,
        amount: commissionAmount,
        calculatedAt: now,
      },
    });

    if (cart.appliedCoupon?.code) {
      const couponCode = String(cart.appliedCoupon.code).toUpperCase();
      const uniqueUsers = await Order.distinct('userId', { 'appliedCoupon.code': couponCode });

      await Coupon.updateOne(
        { code: couponCode },
        {
          $inc: {
            'usageStats.totalUsed': 1,
            'usageStats.totalDiscountGiven': Number(cart.appliedCoupon?.discountAmount || 0),
          },
          $set: {
            'usageStats.uniqueUsers': uniqueUsers.length,
          },
        }
      );
    }

    await Cart.deleteOne({ _id: cart._id });

    await Promise.all([sendOrderConfirmation({ user, order }), sendOrderReceivedToShop({ shop, order })]);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Order created successfully.',
      data: {
        orderId: order.orderId,
        order: toOrderDetail(order),
        paymentUrl:
          order.payment.mode === ORDER_PAYMENT_MODES.ONLINE
            ? createPaymentUrl({ order, couponCode: couponCode || null })
            : null,
      },
    });
  } catch (error) {
    if (lockApplied) {
      await releaseInventory(orderItems, false);
    }

    throw error;
  }
};

const getOrders = async (req, res) => {
  const status = String(req.query.status || '').trim().toUpperCase();
  const limit = Math.min(parsePositiveInt(req.query.limit, 20), 100);
  const offset = parsePositiveInt(req.query.offset, 0);

  const filter = {
    userId: req.user.id,
  };

  if (status) {
    filter.status = status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Orders fetched successfully.',
    data: {
      orders: orders.map((order) => toOrderListItem(order)),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getOrderByOrderId = async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findOne({ orderId, userId: req.user.id }).lean();
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Order fetched successfully.',
    data: {
      order: toOrderDetail(order),
    },
  });
};

const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const reason = String(req.body.reason || '').trim();

  const order = await Order.findOne({ orderId, userId: req.user.id });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order is already cancelled.', ERROR_CODES.ORDER_ALREADY_CANCELLED);
  }

  if (!canCancelStatus.has(order.status)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Order can only be cancelled when status is NEW or ACCEPTED.',
      ERROR_CODES.ORDER_NOT_CANCELLABLE
    );
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
    note: reason || 'Cancelled by user.',
  });

  order.cancellation = {
    reason: reason || 'Cancelled by user',
    cancelledAt: new Date(),
  };

  if (order.payment.mode === ORDER_PAYMENT_MODES.ONLINE && order.payment.status === ORDER_PAYMENT_STATUS.SUCCESS) {
    const refund = await issueRefund({ orderId: order.orderId, reason: reason || 'User cancellation' });
    order.payment.status = ORDER_PAYMENT_STATUS.REFUNDED;
    order.payment.refundId = refund.refundId;
    order.payment.refundedAt = new Date();
  } else if (order.payment.mode === ORDER_PAYMENT_MODES.ONLINE) {
    order.payment.status = ORDER_PAYMENT_STATUS.FAILED;
    order.payment.failureReason = reason || 'Cancelled before payment confirmation.';
  } else if (order.payment.mode === ORDER_PAYMENT_MODES.COD) {
    order.payment.status = ORDER_PAYMENT_STATUS.FAILED;
  }

  await order.save();

  const user = await User.findById(req.user.id);
  await sendOrderStatusUpdate({ user, order, status: ORDER_STATUS.CANCELLED });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Order cancelled successfully.',
    data: {},
  });
};

const submitOrderFeedback = async (req, res) => {
  const { orderId } = req.params;
  const { rating, review } = req.body;

  const order = await Order.findOne({ orderId, userId: req.user.id });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (order.status !== ORDER_STATUS.DELIVERED) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Feedback can only be submitted for delivered orders.',
      ERROR_CODES.ORDER_FEEDBACK_NOT_ALLOWED
    );
  }

  order.feedback = {
    rating: Number(rating),
    review: review || null,
    submittedAt: new Date(),
  };

  await order.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Feedback submitted successfully.',
    data: {
      order: toOrderDetail(order),
    },
  });
};

module.exports = {
  createOrder,
  getOrders,
  getOrderByOrderId,
  cancelOrder,
  submitOrderFeedback,
};
