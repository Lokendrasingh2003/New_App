const mongoose = require('mongoose');

const subscriptionFeatureSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    icon: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const subscriptionPricingSchema = new mongoose.Schema(
  {
    monthlyPrice: { type: Number, required: true, min: 0 },
    yearlyPrice: { type: Number, required: true, min: 0 },
    freePeriodMonths: { type: Number, required: true, min: 0, default: 6 },
  },
  { _id: false }
);

const subscriptionLimitsSchema = new mongoose.Schema(
  {
    maxProducts: { type: Number, required: true, min: 0 },
    maxOffers: { type: Number, required: true, min: 0 },
    maxImages: { type: Number, required: true, min: 0 },
    storageGb: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const subscriptionBenefitsSchema = new mongoose.Schema(
  {
    priorityListing: { type: Boolean, default: false },
    analyticsAccess: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
  },
  { _id: false }
);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, enum: ['BASIC', 'PREMIUM', 'PLATINUM'], index: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: null, trim: true },
    pricing: { type: subscriptionPricingSchema, required: true },
    features: { type: [subscriptionFeatureSchema], default: [] },
    limits: { type: subscriptionLimitsSchema, required: true },
    benefits: { type: subscriptionBenefitsSchema, required: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, displayOrder: 1 });

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan;
