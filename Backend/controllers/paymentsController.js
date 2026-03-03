const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { verifyRazorpaySignature, issueRefund } = require('../services/paymentService');
const { incrementOfferStats } = require('../services/offerService');
const { deductLockedInventory, releaseInventory } = require('../services/inventoryService');
const { sendOrderStatusUpdate } = require('../services/notificationService');
const { sendPaymentFailed } = require('../services/notificationService');
const {
  HTTP_STATUS,
  ERROR_CODES,
  ORDER_STATUS,
  ORDER_PAYMENT_MODES,
  ORDER_PAYMENT_STATUS,
} = require('../config/constants');

const verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;

  const order = await Order.findOne({ orderId, userId: req.user.id });
  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (order.payment.mode !== ORDER_PAYMENT_MODES.ONLINE) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Order payment mode is not ONLINE.', ERROR_CODES.VALIDATION_ERROR);
  }

  const payment = await Payment.findOne({ orderId: order._id, userId: req.user.id });

  const isValid = verifyRazorpaySignature({ orderId, paymentId, signature });

  if (!isValid) {
    order.payment.status = ORDER_PAYMENT_STATUS.FAILED;
    order.payment.failureReason = 'Invalid payment signature.';
    await order.save();

    if (payment) {
      payment.status = 'FAILED';
      payment.transactionId = paymentId;
      payment.paymentGatewayResponse = {
        signature,
        verification: 'FAILED',
      };
      await payment.save();
    }

    const failedUser = await User.findById(req.user.id);
    await sendPaymentFailed({ user: failedUser, payment });

    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Payment signature verification failed.',
      ERROR_CODES.PAYMENT_VERIFICATION_FAILED
    );
  }

  if (order.inventoryState === 'LOCKED') {
    await deductLockedInventory(order.items);
    order.inventoryState = 'DEDUCTED';
  }

  order.payment.status = ORDER_PAYMENT_STATUS.SUCCESS;
  order.payment.transactionId = paymentId;
  order.payment.failureReason = null;

  if (order.status === ORDER_STATUS.NEW) {
    order.status = ORDER_STATUS.ACCEPTED;
    order.statusHistory.push({
      status: ORDER_STATUS.ACCEPTED,
      timestamp: new Date(),
      note: 'Online payment verified and order confirmed.',
    });
  }

  if (!order.offerStatsApplied && order.appliedOffer?.offerId) {
    await incrementOfferStats({
      offerId: order.appliedOffer.offerId,
      discountAmount: Number(order.appliedOffer.discountAmount || 0),
    });
    order.offerStatsApplied = true;
  }

  await order.save();

  if (payment) {
    payment.status = 'SUCCESS';
    payment.transactionId = paymentId;
    payment.paymentGatewayResponse = {
      signature,
      verification: 'SUCCESS',
    };
    await payment.save();
  }

  const user = await User.findById(req.user.id);
  await sendOrderStatusUpdate({ user, order, status: order.status });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment verified successfully.',
    data: {
      order,
    },
  });
};

const refundPayment = async (req, res) => {
  const { orderId, reason } = req.body;

  const order = await Order.findOne({ orderId });
    const payment = await Payment.findOne({ orderId: order._id });

  if (!order) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Order not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  if (order.payment.mode !== ORDER_PAYMENT_MODES.ONLINE) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Refund only applies to online payments.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (order.payment.status === ORDER_PAYMENT_STATUS.REFUNDED) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Order is already refunded.',
      data: {
        refundId: order.payment.refundId,
      },
    });
  }

  const refund = await issueRefund({ orderId, reason: reason || 'Admin initiated refund' });

  order.payment.status = ORDER_PAYMENT_STATUS.REFUNDED;
  order.payment.refundId = refund.refundId;
  order.payment.refundedAt = new Date();

  if (order.status !== ORDER_STATUS.CANCELLED) {
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
      note: reason || 'Cancelled after refund.',
    });
  }

  await order.save();

  if (payment) {
    payment.paymentGatewayResponse = {
      ...(payment.paymentGatewayResponse || {}),
      refund: {
        refundId: refund.refundId,
        reason: reason || 'Admin initiated refund',
      },
    };
    await payment.save();
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Refund processed successfully.',
    data: {
      refundId: refund.refundId,
    },
  });
};

module.exports = {
  verifyPayment,
  refundPayment,
};
