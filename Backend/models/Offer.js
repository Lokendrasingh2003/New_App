const mongoose = require('mongoose');

const applicableHoursSchema = new mongoose.Schema(
  {
    from: { type: String, default: null },
    to: { type: String, default: null },
  },
  { _id: false }
);

const conditionsSchema = new mongoose.Schema(
  {
    minOrderValue: { type: Number, default: 50, min: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    applicableDays: {
      type: [String],
      default: [],
      enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    },
    applicableHours: { type: applicableHoursSchema, default: () => ({}) },
  },
  { _id: false }
);

const validitySchema = new mongoose.Schema(
  {
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
  },
  { _id: false }
);

const offerStatsSchema = new mongoose.Schema(
  {
    appliedCount: { type: Number, default: 0 },
    totalDiscountGiven: { type: Number, default: 0 },
  },
  { _id: false }
);

const offerSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 5, maxlength: 100 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    type: { type: String, enum: ['PERCENT', 'FLAT'], required: true },
    value: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ['SHOP', 'CATEGORIES', 'PRODUCTS'], required: true, index: true },
    categoryIds: { type: [String], default: [] },
    productIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    conditions: { type: conditionsSchema, default: () => ({}) },
    validity: { type: validitySchema, required: true },
    enabled: { type: Boolean, default: true, index: true },
    stats: { type: offerStatsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

offerSchema.index({ shopId: 1, enabled: 1, createdAt: -1 });
offerSchema.index({ shopId: 1, enabled: 1, 'validity.startsAt': 1, 'validity.endsAt': 1 });
offerSchema.index({ 'validity.startsAt': 1, 'validity.endsAt': 1, enabled: 1 });

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
