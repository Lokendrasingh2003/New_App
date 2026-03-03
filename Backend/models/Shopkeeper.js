const mongoose = require('mongoose');
const { SHOPKEEPER_STATUS } = require('../config/constants');

const personalInfoSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: null, trim: true },
    city: { type: String, required: true, trim: true },
    pincode: { type: String, default: null, match: /^\d{6}$/ },
  },
  { _id: false }
);

const businessInfoSchema = new mongoose.Schema(
  {
    businessName: { type: String, required: true, trim: true },
    registrationType: {
      type: String,
      enum: ['PROPRIETOR', 'PARTNERSHIP', 'COMPANY'],
      default: 'PROPRIETOR',
    },
    registrationNumber: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    gstVerified: { type: Boolean, default: false },
    businessDetailsVerified: { type: Boolean, default: false },
    bankDetailsVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String, default: null, trim: true },
    accountNumber: { type: String, default: null, trim: true },
    ifscCode: { type: String, default: null, trim: true, uppercase: true },
    bankName: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const commissionPreferenceSchema = new mongoose.Schema(
  {
    percentage: { type: Number, default: 3, min: 0, max: 100 },
    autoPayoutDay: { type: Number, default: 7, min: 1, max: 31 },
  },
  { _id: false }
);

const shopkeeperSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{10}$/,
    },
    password: { type: String, required: true },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    personalInfo: { type: personalInfoSchema, required: true },
    businessInfo: { type: businessInfoSchema, required: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null },
    verification: { type: verificationSchema, default: () => ({}) },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    commissionPreference: { type: commissionPreferenceSchema, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(SHOPKEEPER_STATUS),
      default: SHOPKEEPER_STATUS.ACTIVE,
      index: true,
    },
    lastLogin: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

shopkeeperSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
  }
);

shopkeeperSchema.index({ 'personalInfo.city': 1, createdAt: -1 });
shopkeeperSchema.index({ createdAt: -1 });

const Shopkeeper = mongoose.model('Shopkeeper', shopkeeperSchema);

module.exports = Shopkeeper;
