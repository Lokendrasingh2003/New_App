const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: null, trim: true },
    discountType: {
      type: String,
      enum: ['PERCENT', 'FLAT'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, default: null },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxUsageLimit: { type: Number, required: true, min: 1 },
    maxUsagePerUser: { type: Number, required: true, min: 1 },
    validFrom: { type: Date, required: true },
    validTill: { type: Date, required: true, index: true },
    applicableCity: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
    applicableShops: { type: [mongoose.Schema.Types.ObjectId], ref: 'Shop', default: [] },
    applicableCategories: { type: [mongoose.Schema.Types.ObjectId], ref: 'Category', default: [] },
    usageStats: {
      totalUsed: { type: Number, default: 0, min: 0 },
      uniqueUsers: { type: Number, default: 0, min: 0 },
      totalDiscountGiven: { type: Number, default: 0, min: 0 },
    },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isActive: 1, validTill: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
