const mongoose = require('mongoose');
const { CART_EXPIRY_DAYS } = require('../config/constants');

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    variantId: { type: String, required: true },
    variantLabel: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    image: { type: String, default: null },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
    offerId: { type: String, default: null },
    name: { type: String, default: null },
    type: { type: String, enum: ['PERCENT', 'FLAT'], default: null },
    value: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null },
    discountAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const couponSchema = new mongoose.Schema(
  {
    couponId: { type: String, default: null },
    code: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    deliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    appliedOffer: { type: offerSchema, default: () => ({}) },
    appliedCoupon: { type: couponSchema, default: () => ({}) },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.index({ userId: 1, shopId: 1 });
cartSchema.index({ userId: 1, expiresAt: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
