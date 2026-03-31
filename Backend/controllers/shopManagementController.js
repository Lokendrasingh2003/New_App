const fs = require('fs');
const path = require('path');
const City = require('../models/City');
const Category = require('../models/Category');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const Order = require('../models/Order');
const Shopkeeper = require('../models/Shopkeeper');
const QRCode = require('qrcode');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES, SHOPKEEPER_STATUS, SHOP_STATUS } = require('../config/constants');

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const parseMinutes = (timeValue) => {
  const [hours, minutes] = String(timeValue || '').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const PUBLIC_WEB_BASE = 'https://cityconnect.app';
const STATS_CACHE_TTL_MS = 60 * 60 * 1000;

const ensureActiveShopkeeper = (shopkeeper) => {
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  if (shopkeeper.status !== SHOPKEEPER_STATUS.ACTIVE) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Active shopkeeper account required.', ERROR_CODES.SHOPKEEPER_SUSPENDED);
  }
};

const ensureApprovedShop = (shop) => {
  if (shop.status !== SHOP_STATUS.APPROVED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Shop must be approved before making changes.', ERROR_CODES.SHOP_NOT_APPROVED);
  }
};

const assertBusinessHours = (businessHours) => {
  const open = parseMinutes(businessHours?.open);
  const close = parseMinutes(businessHours?.close);

  if (open === null || close === null || open >= close) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Invalid business hours. open must be less than close.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const resolveCity = async (cityValue) => {
  const city = await City.findOne({
    name: { $regex: `^${cityValue}$`, $options: 'i' },
    isActive: true,
  });

  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  return city;
};

const buildShopSlugBase = ({ shopName, cityName, customSlug }) => {
  if (customSlug) {
    return toSlug(customSlug);
  }

  return toSlug(`${shopName}-${cityName}`);
};

const ensureUniqueSlugInCity = async ({ cityId, desiredSlug, excludeShopId = null }) => {
  const baseSlug = toSlug(desiredSlug);
  if (!baseSlug) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid slug.', ERROR_CODES.VALIDATION_ERROR);
  }

  let candidate = baseSlug;
  let suffix = 2;

  while (suffix < 500) {
    const conflict = await Shop.findOne({
      cityId,
      slug: candidate,
      ...(excludeShopId ? { _id: { $ne: excludeShopId } } : {}),
    }).lean();

    if (!conflict) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  throw new ApiError(HTTP_STATUS.CONFLICT, 'Unable to allocate unique slug for city.', ERROR_CODES.SHOP_SLUG_TAKEN);
};

const buildPublicUrl = (citySlug, shopSlug) => `${PUBLIC_WEB_BASE}/shops/${citySlug}/${shopSlug}`;

const computeAndStoreQrCode = async (shop, citySlug) => {
  const shopLink = buildPublicUrl(citySlug, shop.slug);
  const qrCodeImage = await QRCode.toDataURL(shopLink, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    margin: 1,
    width: 320,
  });

  shop.publicUrl = shopLink;
  shop.qrCode = {
    image: qrCodeImage,
    createdAt: new Date(),
  };

  return {
    qrCodeImage,
    shopLink,
    createdAt: shop.qrCode.createdAt,
  };
};

const ensureOwnerShop = async ({ shopkeeperId, shopId }) => {
  const shopkeeper = await Shopkeeper.findById(shopkeeperId);
  ensureActiveShopkeeper(shopkeeper);

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  if (String(shop.ownerId) !== String(shopkeeper._id)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not own this shop.', ERROR_CODES.SHOP_OWNER_MISMATCH);
  }

  return { shopkeeper, shop };
};

const createShop = async (req, res) => {
  const shopkeeper = await Shopkeeper.findById(req.shopkeeper.id);
  ensureActiveShopkeeper(shopkeeper);

  const {
    shopName,
    category,
    phone,
    addressLine1,
    area,
    city,
    pincode,
    latitude,
    longitude,
    businessHours,
    delivery,
    ownerName,
    slug: customSlug,
  } = req.body;

  const cityDoc = await resolveCity(city);
  assertBusinessHours(businessHours);

  const slugBase = buildShopSlugBase({ shopName, cityName: cityDoc.name, customSlug });
  const slug = await ensureUniqueSlugInCity({ cityId: cityDoc._id, desiredSlug: slugBase });
  const publicUrl = buildPublicUrl(cityDoc.slug, slug);

  const shop = await Shop.create({
    ownerId: shopkeeper._id.toString(),
    cityId: cityDoc._id,
    shopName,
    slug,
    publicUrl,
    category,
    phone,
    email: shopkeeper.email,
    addressLine1,
    area,
    pincode,
    latitude,
    longitude,
    businessHours: {
      open: businessHours.open,
      close: businessHours.close,
      closedDays: [],
    },
    delivery: {
      payer: delivery.payer,
      chargeAmount: delivery.chargeAmount,
      serviceRadiusKm: delivery.serviceRadiusKm,
      availableAreas: [area],
    },
    status: SHOP_STATUS.PENDING,
    publicVisible: false,
    isActive: true,
    verification: {
      gstNumber: null,
      status: 'PENDING',
      approvedAt: null,
    },
  });

  if (!shopkeeper.shopId) {
    shopkeeper.shopId = shop._id;
  }

  if (ownerName) {
    shopkeeper.personalInfo.name = ownerName;
  }

  await computeAndStoreQrCode(shop, cityDoc.slug);
  await Promise.all([shop.save(), shopkeeper.save()]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Shop registered successfully.',
    data: {
      shop,
    },
  });
};

const updateShop = async (req, res) => {
  const { shopId } = req.params;
  const { shopkeeper, shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });
  ensureApprovedShop(shop);

  const {
    shopName,
    category,
    phone,
    addressLine1,
    area,
    city,
    pincode,
    latitude,
    longitude,
    businessHours,
    delivery,
    ownerName,
    slug: customSlug,
  } = req.body;

  assertBusinessHours(businessHours);

  const cityDoc = await City.findById(shop.cityId).lean();
  if (!cityDoc) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  if (String(city || '').trim().toLowerCase() !== String(cityDoc.name).trim().toLowerCase()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'City cannot be changed after creation.', ERROR_CODES.SHOP_CITY_IMMUTABLE);
  }

  if (customSlug || shop.shopName !== shopName) {
    const desired = buildShopSlugBase({ shopName, cityName: cityDoc.name, customSlug });
    const nextSlug = await ensureUniqueSlugInCity({ cityId: shop.cityId, desiredSlug: desired, excludeShopId: shop._id });

    if (nextSlug !== shop.slug) {
      shop.slug = nextSlug;
      await computeAndStoreQrCode(shop, cityDoc.slug);
    }
  }

  shop.shopName = shopName;
  shop.category = category;
  shop.phone = phone;
  shop.addressLine1 = addressLine1;
  shop.area = area;
  shop.pincode = pincode;
  shop.latitude = latitude;
  shop.longitude = longitude;
  shop.businessHours = {
    open: businessHours.open,
    close: businessHours.close,
    closedDays: shop.businessHours?.closedDays || [],
  };
  shop.delivery = {
    payer: delivery.payer,
    chargeAmount: delivery.chargeAmount,
    serviceRadiusKm: delivery.serviceRadiusKm,
    availableAreas: [area],
  };

  if (ownerName) {
    shopkeeper.personalInfo.name = ownerName;
  }

  shop.publicUrl = buildPublicUrl(cityDoc.slug, shop.slug);

  await Promise.all([shop.save(), shopkeeper.save()]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop updated successfully.',
    data: {
      shop,
    },
  });
};

const getShopDashboard = async (req, res) => {
  const { shopId } = req.params;

  const { shopkeeper, shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const [productCount, orderCount, deliveredOrders, earningsResult] = await Promise.all([
    Product.countDocuments({ shopId: shop._id }),
    Order.countDocuments({ shopId: shop._id }),
    Order.countDocuments({ shopId: shop._id, status: 'DELIVERED' }),
    Order.aggregate([
      { $match: { shopId: shop._id } },
      {
        $group: {
          _id: null,
          total: { $sum: '$pricing.total' },
        },
      },
    ]),
  ]);

  const totalEarnings = Number(earningsResult?.[0]?.total || 0);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop dashboard fetched successfully.',
    data: {
      shop,
      ownerName: shopkeeper.personalInfo?.name || null,
      stats: {
        productCount,
        orderCount,
        deliveredOrders,
        totalEarnings: Number(totalEarnings.toFixed(2)),
      },
    },
  });
};

const getShopSettings = async (req, res) => {
  const { shopId } = req.params;
  const { shopkeeper, shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const city = await City.findById(shop.cityId).lean();
  const categoryDoc = shop.categoryId
    ? await Category.findById(shop.categoryId).lean()
    : await Category.findOne({ name: { $regex: `^${String(shop.category || '').trim()}$`, $options: 'i' } }).lean();

  const resolvedCategoryId = categoryDoc?._id || shop.categoryId || null;
  if (!shop.categoryId && resolvedCategoryId) {
    shop.categoryId = resolvedCategoryId;
    await shop.save();
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop settings fetched successfully.',
    data: {
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        imageUrl: shop.imageUrl || null,
        categoryId: resolvedCategoryId,
        categoryName: categoryDoc?.name || shop.category || null,
        ownerName: shopkeeper.personalInfo?.name || null,
        phone: shop.phone,
        city: city?.name || null,
        addressLine1: shop.addressLine1,
        area: shop.area,
        pincode: shop.pincode,
        slug: shop.slug,
        publicUrl: shop.publicUrl,
        businessHours: shop.businessHours,
        delivery: {
          payer: shop.delivery?.payer,
          chargeAmount: shop.delivery?.chargeAmount,
          serviceRadiusKm: shop.delivery?.serviceRadiusKm,
        },
        status: shop.status,
        updatedAt: shop.updatedAt,
      },
    },
  });
};

const updateShopSettings = async (req, res) => {
  const { shopId } = req.params;
  const { shopkeeper, shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });
  ensureApprovedShop(shop);

  const {
    shopName,
    ownerName,
    phone,
    city,
    addressLine1,
    area,
    pincode,
    businessHours,
    delivery,
    slug: customSlug,
  } = req.body;

  assertBusinessHours(businessHours);

  const cityDoc = await City.findById(shop.cityId).lean();
  if (!cityDoc) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  if (String(city || '').trim().toLowerCase() !== String(cityDoc.name).trim().toLowerCase()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'City cannot be changed after creation.', ERROR_CODES.SHOP_CITY_IMMUTABLE);
  }

  const nextSlug = await ensureUniqueSlugInCity({
    cityId: shop.cityId,
    desiredSlug: buildShopSlugBase({ shopName, cityName: cityDoc.name, customSlug }),
    excludeShopId: shop._id,
  });

  const slugChanged = nextSlug !== shop.slug;
  shop.slug = nextSlug;
  shop.shopName = shopName;
  shop.phone = phone;
  shop.addressLine1 = addressLine1;
  shop.area = area;
  shop.pincode = pincode;
  shop.businessHours = {
    open: businessHours.open,
    close: businessHours.close,
    closedDays: shop.businessHours?.closedDays || [],
  };
  shop.delivery = {
    payer: delivery.payer,
    chargeAmount: delivery.chargeAmount,
    serviceRadiusKm: delivery.serviceRadiusKm,
    availableAreas: [area],
  };
  shop.publicUrl = buildPublicUrl(cityDoc.slug, shop.slug);

  shopkeeper.personalInfo.name = ownerName;

  if (slugChanged || !shop.qrCode?.image) {
    await computeAndStoreQrCode(shop, cityDoc.slug);
  }

  await Promise.all([shop.save(), shopkeeper.save()]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop settings updated successfully.',
    data: {
      shop,
    },
  });
};

const uploadShopImage = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });
  ensureApprovedShop(shop);

  if (!req.file) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image file is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only jpg, png and webp formats are allowed.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (Number(req.file.size || 0) > 8 * 1024 * 1024) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image size must be <= 8MB.', ERROR_CODES.VALIDATION_ERROR);
  }

  const uploadsRoot = path.join(__dirname, '..', 'uploads', 'shops');
  await fs.promises.mkdir(uploadsRoot, { recursive: true });

  const imageId = `shop-${String(shop._id)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${imageId}${ext === '.jpeg' ? '.jpg' : ext}`;
  const targetPath = path.join(uploadsRoot, filename);
  await fs.promises.writeFile(targetPath, req.file.buffer);

  const reqBase = `${req.protocol}://${req.get('host')}`;
  const base = reqBase || `${process.env.API_BASE_URL || 'http://localhost:5000/api'}`.replace(/\/api$/i, '');
  const imageUrl = `${base}/uploads/shops/${filename}`;

  shop.imageUrl = imageUrl;
  await shop.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop image uploaded successfully.',
    data: {
      imageUrl,
      shopId: String(shop._id),
    },
  });
};

const patchBusinessHours = async (req, res) => {
  const { shopId } = req.params;
  const { open, close, closedDays } = req.body;

  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });
  ensureApprovedShop(shop);

  assertBusinessHours({ open, close });

  shop.businessHours = {
    open,
    close,
    closedDays: Array.isArray(closedDays) ? closedDays : shop.businessHours?.closedDays || [],
  };
  await shop.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Business hours updated successfully.',
    data: { shop },
  });
};

const patchDeliveryConfig = async (req, res) => {
  const { shopId } = req.params;
  const { payer, chargeAmount, serviceRadiusKm } = req.body;

  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });
  ensureApprovedShop(shop);

  shop.delivery = {
    payer,
    chargeAmount,
    serviceRadiusKm,
    availableAreas: shop.delivery?.availableAreas || [shop.area],
  };

  await shop.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Delivery configuration updated successfully.',
    data: { shop },
  });
};

const computeShopStats = async (shop) => {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalOrders,
    totalProducts,
    totalCategories,
    activeOffers,
    todayOrders,
    earningsAll,
    earningsToday,
    verifiedReviewStats,
  ] = await Promise.all([
    Order.countDocuments({ shopId: shop._id }),
    Product.countDocuments({ shopId: shop._id, active: true }),
    Product.distinct('categoryId', { shopId: shop._id, active: true }).then((items) => items.length),
    Product.countDocuments({
      shopId: shop._id,
      active: true,
      'discount.type': { $in: ['PERCENT', 'FLAT'] },
      'discount.value': { $gt: 0 },
      $or: [{ 'discount.validTill': null }, { 'discount.validTill': { $gte: now } }],
    }),
    Order.countDocuments({ shopId: shop._id, createdAt: { $gte: dayStart } }),
    Order.aggregate([
      { $match: { shopId: shop._id } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    Order.aggregate([
      { $match: { shopId: shop._id, createdAt: { $gte: dayStart } } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
    ProductReview.aggregate([
      {
        $match: {
          shopId: shop._id,
          verified: true,
          isPublished: true,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          reviewCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  const stats = {
    totalOrders,
    totalEarnings: Number(Number(earningsAll?.[0]?.total || 0).toFixed(2)),
    averageRating: Number(Number(verifiedReviewStats?.[0]?.averageRating || 0).toFixed(2)),
    reviewCount: Number(verifiedReviewStats?.[0]?.reviewCount || 0),
    totalProducts,
    totalCategories,
    activeOffers,
    todayOrders,
    todayEarnings: Number(Number(earningsToday?.[0]?.total || 0).toFixed(2)),
    lastUpdated: new Date(),
  };

  shop.cachedStats = stats;
  shop.stats = {
    rating: stats.averageRating,
    reviewCount: stats.reviewCount,
    orderCount: stats.totalOrders,
    totalEarnings: stats.totalEarnings,
  };

  await shop.save();

  return stats;
};

const getShopStats = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const cacheLastUpdated = shop.cachedStats?.lastUpdated ? new Date(shop.cachedStats.lastUpdated).getTime() : 0;
  const hasFreshCache = cacheLastUpdated && Date.now() - cacheLastUpdated < STATS_CACHE_TTL_MS;

  const stats = hasFreshCache ? shop.cachedStats : await computeShopStats(shop);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop stats fetched successfully.',
    data: {
      totalOrders: Number(stats.totalOrders || 0),
      totalEarnings: Number(stats.totalEarnings || 0),
      averageRating: Number(stats.averageRating || 0),
      reviewCount: Number(stats.reviewCount || 0),
      totalProducts: Number(stats.totalProducts || 0),
      totalCategories: Number(stats.totalCategories || 0),
      activeOffers: Number(stats.activeOffers || 0),
      todayOrders: Number(stats.todayOrders || 0),
      todayEarnings: Number(stats.todayEarnings || 0),
      lastUpdated: stats.lastUpdated || new Date(),
    },
  });
};

const getShopQrCode = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const city = await City.findById(shop.cityId).lean();
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  let payload;
  if (!shop.qrCode?.image) {
    payload = await computeAndStoreQrCode(shop, city.slug);
    await shop.save();
  } else {
    payload = {
      qrCodeImage: shop.qrCode.image,
      shopLink: buildPublicUrl(city.slug, shop.slug),
      createdAt: shop.qrCode.createdAt,
    };
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop QR code fetched successfully.',
    data: payload,
  });
};

const getShopPublicLink = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnerShop({ shopkeeperId: req.shopkeeper.id, shopId });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop public link fetched successfully.',
    data: {
      publicUrl: shop.publicUrl,
      slug: shop.slug,
    },
  });
};

module.exports = {
  createShop,
  updateShop,
  getShopDashboard,
  getShopSettings,
  updateShopSettings,
  uploadShopImage,
  patchBusinessHours,
  patchDeliveryConfig,
  getShopStats,
  getShopQrCode,
  getShopPublicLink,
};
