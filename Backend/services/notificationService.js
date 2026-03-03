const sendOrderConfirmation = async ({ user, order }) => {
  return {
    queued: true,
    type: 'ORDER_CONFIRMATION_SMS',
    userId: user?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendOrderReceivedToShop = async ({ shop, order }) => {
  return {
    queued: true,
    type: 'ORDER_RECEIVED_SHOP_SMS',
    shopId: shop?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendOrderStatusUpdate = async ({ user, order, status }) => {
  return {
    queued: true,
    type: 'ORDER_STATUS_SMS',
    userId: user?._id || null,
    orderId: order?.orderId || null,
    status,
  };
};

const sendDeliveryPartnerAssigned = async ({ user, order, partner }) => {
  return {
    queued: true,
    type: 'DELIVERY_PARTNER_ASSIGNED',
    userId: user?._id || null,
    orderId: order?.orderId || null,
    partner: partner || null,
  };
};

const sendOutForDelivery = async ({ user, order }) => {
  return {
    queued: true,
    type: 'OUT_FOR_DELIVERY',
    userId: user?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendDeliveryConfirmation = async ({ user, order }) => {
  return {
    queued: true,
    type: 'DELIVERY_CONFIRMATION',
    userId: user?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendPayoutApproved = async ({ shopkeeper, payout }) => {
  return {
    queued: true,
    type: 'PAYOUT_APPROVED_SMS',
    shopkeeperId: shopkeeper?._id || null,
    payoutId: payout?._id || null,
  };
};

const sendPayoutCompleted = async ({ shopkeeper, payout }) => {
  return {
    queued: true,
    type: 'PAYOUT_COMPLETED_SMS',
    shopkeeperId: shopkeeper?._id || null,
    payoutId: payout?._id || null,
  };
};

const sendPaymentFailed = async ({ user, payment }) => {
  return {
    queued: true,
    type: 'PAYMENT_FAILED_SMS',
    userId: user?._id || null,
    paymentId: payment?._id || null,
  };
};

const sendRefundRequested = async ({ user, refund, order }) => {
  return {
    queued: true,
    type: 'REFUND_REQUESTED_SMS',
    userId: user?._id || null,
    refundId: refund?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendRefundProcessing = async ({ user, refund, order }) => {
  return {
    queued: true,
    type: 'REFUND_PROCESSING_SMS',
    userId: user?._id || null,
    refundId: refund?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendRefundCompleted = async ({ user, refund, order }) => {
  return {
    queued: true,
    type: 'REFUND_COMPLETED_SMS',
    userId: user?._id || null,
    refundId: refund?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendRefundFailed = async ({ user, refund, order }) => {
  return {
    queued: true,
    type: 'REFUND_FAILED_SMS',
    userId: user?._id || null,
    refundId: refund?._id || null,
    orderId: order?.orderId || null,
  };
};

const sendSubscriptionActivated = async ({ shopkeeper, subscription }) => {
  return {
    queued: true,
    type: 'SUBSCRIPTION_ACTIVATED_SMS',
    shopkeeperId: shopkeeper?._id || null,
    subscriptionId: subscription?._id || null,
  };
};

const sendSubscriptionExpiring = async ({ shopkeeper, subscription }) => {
  return {
    queued: true,
    type: 'SUBSCRIPTION_EXPIRING_SMS',
    shopkeeperId: shopkeeper?._id || null,
    subscriptionId: subscription?._id || null,
  };
};

const sendSubscriptionExpired = async ({ shopkeeper, subscription }) => {
  return {
    queued: true,
    type: 'SUBSCRIPTION_EXPIRED_SMS',
    shopkeeperId: shopkeeper?._id || null,
    subscriptionId: subscription?._id || null,
  };
};

const sendSubscriptionBillingFailed = async ({ shopkeeper, subscription }) => {
  return {
    queued: true,
    type: 'SUBSCRIPTION_BILLING_FAILED_SMS',
    shopkeeperId: shopkeeper?._id || null,
    subscriptionId: subscription?._id || null,
  };
};

module.exports = {
  sendOrderConfirmation,
  sendOrderReceivedToShop,
  sendOrderStatusUpdate,
  sendDeliveryPartnerAssigned,
  sendOutForDelivery,
  sendDeliveryConfirmation,
  sendPayoutApproved,
  sendPayoutCompleted,
  sendPaymentFailed,
  sendRefundRequested,
  sendRefundProcessing,
  sendRefundCompleted,
  sendRefundFailed,
  sendSubscriptionActivated,
  sendSubscriptionExpiring,
  sendSubscriptionExpired,
  sendSubscriptionBillingFailed,
};
