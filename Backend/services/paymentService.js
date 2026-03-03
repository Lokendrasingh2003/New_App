const crypto = require('crypto');
const environment = require('../config/environment');
const { logExternalServiceError } = require('../utils/logger');
const { ExternalServiceError } = require('../utils/errors');

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
  try {
    const secret = process.env.RAZORPAY_KEY_SECRET || environment.jwtSecret;
    const payload = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    return expected === signature;
  } catch (error) {
    logExternalServiceError({
      service: 'payment-gateway-signature',
      error,
      details: {
        orderId,
        paymentId,
      },
    });

    throw new ExternalServiceError('Payment gateway signature verification failed');
  }
};

const createPaymentUrl = ({ order }) => {
  if (!order) {
    return null;
  }

  return `${environment.apiBaseUrl}/payments/mock-checkout?orderId=${order.orderId}`;
};

const issueRefund = async ({ orderId, reason }) => {
  try {
    const hash = crypto
      .createHash('sha256')
      .update(`${orderId}|${reason}|${Date.now()}`)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();

    return {
      refundId: `rfnd_${hash}`,
      status: 'processed',
    };
  } catch (error) {
    logExternalServiceError({
      service: 'payment-gateway-refund',
      error,
      details: {
        orderId,
      },
    });

    throw new ExternalServiceError('Payment gateway refund failed');
  }
};

module.exports = {
  verifyRazorpaySignature,
  createPaymentUrl,
  issueRefund,
};
