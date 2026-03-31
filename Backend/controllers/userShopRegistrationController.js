const fs = require('fs');
const path = require('path');
const Category = require('../models/Category');
const City = require('../models/City');
const Shop = require('../models/Shop');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { encryptField } = require('../utils/secureField');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES, SHOP_STATUS } = require('../config/constants');

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const buildUniqueSlug = async ({ base, cityId }) => {
  const normalizedBase = toSlug(base) || `shop-${Date.now()}`;
  let candidate = normalizedBase;
  let index = 1;

  while (true) {
    const exists = await Shop.exists({ cityId, slug: candidate });
    if (!exists) {
      return candidate;
    }

    index += 1;
    candidate = `${normalizedBase}-${index}`.slice(0, 75);
  }
};

const mapRegistration = (shop) => ({
  id: String(shop._id),
  shopName: shop.shopName,
  description: shop.description || '',
  categoryName: shop.category,
  cityId: String(shop.cityId),
  phone: shop.phone,
  shopImageUrl: shop.imageUrl || '',
  openingTime: shop.businessHours?.open || '',
  closingTime: shop.businessHours?.close || '',
  addressLine1: shop.addressLine1,
  area: shop.area,
  pincode: shop.pincode,
  gstNumber: shop.verification?.gstNumber || '',
  businessProofUrl: shop.registrationDetails?.businessProofUrl || '',
  identityProofUrl: shop.registrationDetails?.identityProofUrl || '',
  accountHolderName: shop.registrationDetails?.bankAccountHolderName || '',
  ifscCode: shop.registrationDetails?.bankIfscCode || '',
  status: shop.status,
  rejectionReason: shop.registrationDetails?.rejectionReason || null,
  submittedAt: shop.registrationDetails?.submittedAt || shop.createdAt,
  reviewedAt: shop.registrationDetails?.reviewedAt || null,
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
});

const ALLOWED_REGISTRATION_ASSET_TYPES = ['SHOP_IMAGE', 'BUSINESS_PROOF', 'IDENTITY_PROOF'];

const uploadShopRegistrationDocument = async (req, res) => {
  if (!req.file) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image file is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const assetType = String(req.body.assetType || '').trim().toUpperCase();
  if (!ALLOWED_REGISTRATION_ASSET_TYPES.includes(assetType)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Invalid assetType. Use SHOP_IMAGE, BUSINESS_PROOF, or IDENTITY_PROOF.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only jpg, png and webp formats are allowed.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (Number(req.file.size || 0) > 8 * 1024 * 1024) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image size must be <= 8MB.', ERROR_CODES.VALIDATION_ERROR);
  }

  const uploadsRoot = path.join(__dirname, '..', 'uploads', 'shop-registrations');
  await fs.promises.mkdir(uploadsRoot, { recursive: true });

  const safeAssetType = assetType.toLowerCase();
  const imageId = `${safeAssetType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${imageId}${ext === '.jpeg' ? '.jpg' : ext}`;
  const targetPath = path.join(uploadsRoot, filename);

  await fs.promises.writeFile(targetPath, req.file.buffer);

  const reqBase = `${req.protocol}://${req.get('host')}`;
  const base = reqBase || `${process.env.API_BASE_URL || 'http://localhost:5000/api'}`.replace(/\/api$/i, '');

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Registration asset uploaded successfully.',
    data: {
      assetType,
      imageUrl: `${base}/uploads/shop-registrations/${filename}`,
    },
  });
};

const submitShopRegistration = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  const city = await City.findOne({ _id: req.body.cityId, isActive: true }).lean();
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const category = await Category.findOne({ _id: req.body.categoryId, isActive: true, status: 'PUBLISHED' }).lean();
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  const slug = await buildUniqueSlug({
    base: req.body.shopName,
    cityId: city._id,
  });

  const phone = String(req.body.phone || user.phone || '').replace(/\D/g, '').slice(-10);

  const shop = await Shop.create({
    ownerId: String(user._id),
    ownerType: 'USER',
    contactName: user.name || null,
    registrationSource: 'USER_APP',
    cityId: city._id,
    shopName: req.body.shopName,
    slug,
    publicUrl: `/shops/${slug}`,
    imageUrl: req.body.shopImageUrl,
    description: req.body.description || null,
    category: category.name,
    categoryId: category._id,
    phone,
    email: user.email || null,
    addressLine1: req.body.addressLine1,
    area: req.body.area || city.name,
    pincode: req.body.pincode,
    latitude: Number.isFinite(req.body.latitude) ? req.body.latitude : city.latitude,
    longitude: Number.isFinite(req.body.longitude) ? req.body.longitude : city.longitude,
    businessHours: {
      open: req.body.openingTime,
      close: req.body.closingTime,
      closedDays: [],
    },
    delivery: {
      payer: 'CUSTOMER',
      chargeAmount: 0,
      serviceRadiusKm: 5,
      availableAreas: [req.body.area || city.name],
    },
    verification: {
      gstNumber: req.body.gstNumber,
      status: 'PENDING',
      approvedAt: null,
    },
    registrationDetails: {
      businessProofUrl: req.body.businessProofUrl,
      identityProofUrl: req.body.identityProofUrl,
      bankAccountHolderName: req.body.accountHolderName,
      bankAccountNumberEncrypted: encryptField(req.body.accountNumber),
      bankIfscCode: req.body.ifscCode,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewStatus: 'PENDING',
      rejectionReason: null,
    },
    status: SHOP_STATUS.PENDING,
    publicVisible: false,
    isActive: true,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Shop registration submitted successfully.',
    data: {
      registration: mapRegistration(shop),
    },
  });
};

const listMyShopRegistrations = async (req, res) => {
  const items = await Shop.find({
    ownerId: String(req.user.id),
    ownerType: 'USER',
    registrationSource: 'USER_APP',
  })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop registrations fetched successfully.',
    data: {
      registrations: items.map(mapRegistration),
    },
  });
};

const getMyShopRegistrationById = async (req, res) => {
  const item = await Shop.findOne({
    _id: req.params.registrationId,
    ownerId: String(req.user.id),
    ownerType: 'USER',
    registrationSource: 'USER_APP',
  }).lean();

  if (!item) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Registration not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop registration details fetched successfully.',
    data: {
      registration: mapRegistration(item),
    },
  });
};

module.exports = {
  submitShopRegistration,
  listMyShopRegistrations,
  getMyShopRegistrationById,
  uploadShopRegistrationDocument,
};
