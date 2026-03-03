const mongoose = require('mongoose');
const { ORDER_STATUS, ORDER_PAYMENT_MODES, ORDER_PAYMENT_STATUS } = require('../config/constants');
const Shop = require('./Shop');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    variantId: { type: String, default: null },
    variantLabel: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
  },
  { _id: false }
);

const deliveryAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    coordinates: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0 },
    deliveryCharge: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const appliedOfferSchema = new mongoose.Schema(
  {
    offerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offer', default: null },
    name: { type: String, default: null },
    type: { type: String, enum: ['PERCENT', 'FLAT'], default: null },
    value: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const appliedCouponSchema = new mongoose.Schema(
  {
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    code: { type: String, default: null, trim: true, uppercase: true },
    discountAmount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_MODES),
      required: true,
      default: ORDER_PAYMENT_MODES.COD,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_PAYMENT_STATUS),
      required: true,
      default: ORDER_PAYMENT_STATUS.PENDING,
    },
    transactionId: { type: String, default: null, trim: true },
    failureReason: { type: String, default: null, trim: true },
    refundId: { type: String, default: null, trim: true },
    refundedAt: { type: Date, default: null },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const deliveryPartnerSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, default: null, trim: true },
    phone: { type: String, default: null, trim: true },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
);

const feedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, default: null },
    review: { type: String, default: null, trim: true, maxlength: 1000 },
    submittedAt: { type: Date, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', default: null },
    items: { type: [orderItemSchema], required: true, default: [] },
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    pricing: { type: pricingSchema, required: true },
    appliedOffer: { type: appliedOfferSchema, default: () => ({}) },
    appliedCoupon: { type: appliedCouponSchema, default: () => ({}) },
    offerStatsApplied: { type: Boolean, default: false },
    payment: { type: paymentSchema, required: true, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
      default: ORDER_STATUS.NEW,
      index: true,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    inventoryState: {
      type: String,
      enum: ['LOCKED', 'DEDUCTED', 'RELEASED'],
      default: 'LOCKED',
    },
    specialInstructions: { type: String, default: null, trim: true, maxlength: 500 },
    deliveryPartner: { type: deliveryPartnerSchema, default: () => ({}) },
    feedback: { type: feedbackSchema, default: () => ({}) },
    cancellation: {
      reason: { type: String, default: null, trim: true },
      cancelledAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, status: 1, createdAt: -1 });
orderSchema.index({ status: 1, cityId: 1, shopId: 1, createdAt: -1 });
orderSchema.index({ 'payment.status': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ cityId: 1, createdAt: -1 });

const recomputeShopOrderStats = async (shopId) => {
  if (!shopId) {
    return;
  }

  const [countResult, earningsResult] = await Promise.all([
    mongoose.model('Order').countDocuments({ shopId }),
    mongoose
      .model('Order')
      .aggregate([{ $match: { shopId: new mongoose.Types.ObjectId(String(shopId)) } }, { $group: { _id: null, total: { $sum: '$pricing.total' } } }]),
  ]);

  const totalEarnings = Number(earningsResult?.[0]?.total || 0);

  await Shop.updateOne(
    { _id: shopId },
    {
      $set: {
        'stats.orderCount': countResult,
        'stats.totalEarnings': Number(totalEarnings.toFixed(2)),
        'cachedStats.lastUpdated': null,
      },
    }
  );
};

orderSchema.post('save', async function postSave(_doc, next) {
  try {
    await recomputeShopOrderStats(this.shopId);
    next();
  } catch (error) {
    next(error);
  }
});

orderSchema.post('findOneAndDelete', async function postDelete(doc, next) {
  try {
    if (doc?.shopId) {
      await recomputeShopOrderStats(doc.shopId);
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
