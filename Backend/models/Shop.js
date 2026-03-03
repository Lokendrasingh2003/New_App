const mongoose = require('mongoose');
const City = require('./City');
const { SHOP_STATUS } = require('../config/constants');

const businessHoursSchema = new mongoose.Schema(
  {
    open: { type: String, required: true },
    close: { type: String, required: true },
    closedDays: { type: [String], default: [] },
  },
  { _id: false }
);

const deliverySchema = new mongoose.Schema(
  {
    payer: { type: String, enum: ['CUSTOMER', 'SHOP'], default: 'CUSTOMER' },
    chargeAmount: { type: Number, default: 0 },
    serviceRadiusKm: { type: Number, default: 5 },
    availableAreas: { type: [String], default: [] },
  },
  { _id: false }
);

const verificationSchema = new mongoose.Schema(
  {
    gstNumber: { type: String, default: null },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    approvedAt: { type: Date, default: null },
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: { type: String, enum: ['BASIC', 'PREMIUM'], default: 'BASIC' },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const statsSchema = new mongoose.Schema(
  {
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
  },
  { _id: false }
);

const cachedStatsSchema = new mongoose.Schema(
  {
    totalOrders: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    totalProducts: { type: Number, default: 0 },
    totalCategories: { type: Number, default: 0 },
    activeOffers: { type: Number, default: 0 },
    todayOrders: { type: Number, default: 0 },
    todayEarnings: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: null },
  },
  { _id: false }
);

const qrCodeSchema = new mongoose.Schema(
  {
    image: { type: String, default: null },
    createdAt: { type: Date, default: null },
  },
  { _id: false }
);

const shopSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, trim: true },
    cityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City',
      required: true,
      index: true,
    },
    shopName: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    publicUrl: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    description: { type: String, default: null, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    phone: { type: String, required: true, match: /^[0-9]{10}$/ },
    email: { type: String, default: null, trim: true, lowercase: true },
    addressLine1: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true, index: true },
    pincode: { type: String, required: true, match: /^\d{6}$/ },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    businessHours: { type: businessHoursSchema, required: true },
    delivery: { type: deliverySchema, required: true },
    verification: { type: verificationSchema, default: () => ({}) },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    stats: { type: statsSchema, default: () => ({}) },
    cachedStats: { type: cachedStatsSchema, default: () => ({}) },
    qrCode: { type: qrCodeSchema, default: () => ({}) },
    status: {
      type: String,
      enum: Object.values(SHOP_STATUS),
      default: SHOP_STATUS.PENDING,
      index: true,
    },
    publicVisible: { type: Boolean, default: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

shopSchema.index({ cityId: 1, slug: 1 }, { unique: true });
shopSchema.index({ ownerId: 1 });
shopSchema.index({ ownerId: 1, cityId: 1, status: 1, slug: 1 });
shopSchema.index({ cityId: 1, shopName: 1 });
shopSchema.index({ cityId: 1, category: 1, area: 1 });
shopSchema.index({ status: 1, cityId: 1, createdAt: -1 });
shopSchema.index({ status: 1, createdAt: -1 });
shopSchema.index({ publicVisible: 1, isActive: 1, 'subscription.isActive': 1 });
shopSchema.index({ isActive: 1, publicVisible: 1 });
shopSchema.index({ latitude: 1, longitude: 1 });
shopSchema.index({ location: '2dsphere' });

shopSchema.pre('validate', function setLocation(next) {
  if (
    typeof this.latitude === 'number' &&
    typeof this.longitude === 'number' &&
    Number.isFinite(this.latitude) &&
    Number.isFinite(this.longitude)
  ) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }

  next();
});

const isShopDiscoverable = (shop) => {
  return Boolean(shop.publicVisible && shop.isActive && shop.subscription?.isActive);
};

const recomputeCityShopCount = async (cityId) => {
  if (!cityId) {
    return;
  }

  const count = await mongoose.model('Shop').countDocuments({
    cityId,
    publicVisible: true,
    isActive: true,
    'subscription.isActive': true,
  });

  await City.updateOne({ _id: cityId }, { $set: { shopCount: count } });
};

shopSchema.post('save', async function onSave(_doc, next) {
  try {
    await recomputeCityShopCount(this.cityId);
    next();
  } catch (error) {
    next(error);
  }
});

shopSchema.post('findOneAndDelete', async function onDelete(doc, next) {
  try {
    if (doc?.cityId) {
      await recomputeCityShopCount(doc.cityId);
    }
    next();
  } catch (error) {
    next(error);
  }
});

shopSchema.statics.isShopDiscoverable = isShopDiscoverable;
shopSchema.statics.recomputeCityShopCount = recomputeCityShopCount;

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
