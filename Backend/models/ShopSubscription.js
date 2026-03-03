const mongoose = require('mongoose');

const shopSubscriptionBillingCycleSchema = new mongoose.Schema(
  {
    cycleStart: { type: Date, required: true },
    nextBillingDate: { type: Date, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paid: { type: Boolean, default: false },
    paymentId: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const shopSubscriptionPaymentHistorySchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, required: true },
    nextBillingDate: { type: Date, required: true },
  },
  { _id: false }
);

const shopSubscriptionSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    freeUntil: { type: Date, default: null },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'], default: 'ACTIVE', index: true },
    billingCycle: { type: shopSubscriptionBillingCycleSchema, required: true },
    paymentHistory: { type: [shopSubscriptionPaymentHistorySchema], default: [] },
    autoRenew: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopSubscriptionSchema.index({ shopId: 1, status: 1, endDate: 1 });
shopSubscriptionSchema.index({ status: 1, endDate: 1 });

const ShopSubscription = mongoose.model('ShopSubscription', shopSubscriptionSchema);

module.exports = ShopSubscription;
