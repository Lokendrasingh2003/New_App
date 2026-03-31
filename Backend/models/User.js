const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    userId: { type: String, required: true },
    label: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'other',
    },
    addressLine1: { type: String, required: true, maxlength: 100 },
    area: { type: String, required: true, maxlength: 50 },
    city: { type: String, required: true, maxlength: 50 },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const paymentMethodSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      enum: ['card', 'upi', 'wallet'],
      required: true,
    },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/,
      index: true,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    password: {
      type: String,
      default: null,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      default: null,
      index: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    addresses: {
      type: [addressSchema],
      default: [],
    },
    savedPaymentMethods: {
      type: [paymentMethodSchema],
      default: [],
    },
    referralCode: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      index: true,
    },
    referredBy: {
      type: String,
      default: null,
      match: /^[0-9]{10}$/,
    },
    role: {
      type: String,
      enum: ['USER', 'SHOPKEEPER'],
      default: 'USER',
      index: true,
    },
    shopkeeperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shopkeeper',
      default: null,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ createdAt: 1 });
userSchema.index({ cityId: 1, createdAt: -1 });
userSchema.index({ 'addresses.userId': 1, 'addresses.isDefault': 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
