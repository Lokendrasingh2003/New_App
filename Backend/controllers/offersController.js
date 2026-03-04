const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Shopkeeper = require('../models/Shopkeeper');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { findApplicableOffers, normalizeIdList, normalizeTextList } = require('../services/offerService');
const { HTTP_STATUS, ERROR_CODES, MAX_OFFERS_PER_SHOP } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const ensureOwnedShop = async ({ shopkeeperId, shopId }) => {
  const [shopkeeper, shop] = await Promise.all([Shopkeeper.findById(shopkeeperId), Shop.findById(shopId)]);

  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  if (String(shop.ownerId) !== String(shopkeeper._id)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not own this shop.', ERROR_CODES.SHOP_OWNER_MISMATCH);
  }

  if (shopkeeper.status !== 'ACTIVE') {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Active shopkeeper account required.', ERROR_CODES.SHOPKEEPER_SUSPENDED);
  }

  return { shopkeeper, shop };
};

const parseTimeMinutes = (value) => {
  const [h, m] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) {
    return null;
  }

  return h * 60 + m;
};

const validateHours = (hours) => {
  if (!hours) {
    return;
  }

  const from = parseTimeMinutes(hours.from);
  const to = parseTimeMinutes(hours.to);

  if (from === null || to === null || from >= to) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid applicable hours.', ERROR_CODES.VALIDATION_ERROR);
  }
};

const validateScopeAndRefs = async ({ shopId, scope, categoryIds, productIds }) => {
  const categories = normalizeTextList(categoryIds);
  const products = Array.isArray(productIds) ? productIds : [];

  if (scope === 'SHOP') {
    return { categoryIds: [], productIds: [] };
  }

  if (scope === 'CATEGORIES') {
    if (!categories.length) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'subcategory names are required for CATEGORIES scope.',
        ERROR_CODES.OFFER_SCOPE_INVALID
      );
    }

    const availableSubcategories = await Product.distinct('subcategoryName', {
      shopId,
      isDeleted: false,
      subcategoryName: { $nin: [null, ''] },
    });

    const allowed = new Set(availableSubcategories.map((name) => String(name || '').trim().toLowerCase()));
    const hasInvalid = categories.some((name) => !allowed.has(String(name).toLowerCase()));

    if (hasInvalid) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Invalid subcategory selection for offer scope.',
        ERROR_CODES.OFFER_SCOPE_INVALID
      );
    }

    return { categoryIds: categories, productIds: [] };
  }

  if (scope === 'PRODUCTS') {
    if (!products.length) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'productIds are required for PRODUCTS scope.', ERROR_CODES.OFFER_SCOPE_INVALID);
    }

    const count = await Product.countDocuments({ _id: { $in: products }, shopId, isDeleted: false });
    if (count !== products.length) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid productIds for offer scope.', ERROR_CODES.OFFER_SCOPE_INVALID);
    }

    return { categoryIds: [], productIds: products };
  }

  throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid offer scope.', ERROR_CODES.OFFER_SCOPE_INVALID);
};

const validateOfferPayload = async ({ shopId, payload }) => {
  const startsAt = new Date(payload.startsAt);
  const endsAt = new Date(payload.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'startsAt must be before endsAt.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (endsAt.getTime() <= Date.now()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot create or update expired offer.', ERROR_CODES.OFFER_EXPIRED);
  }

  if (payload.type === 'PERCENT' && (Number(payload.value) < 1 || Number(payload.value) > 100)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'PERCENT value must be between 1 and 100.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (payload.type === 'FLAT' && Number(payload.value) <= 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'FLAT value must be greater than 0.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (payload.minOrderValue !== undefined && Number(payload.minOrderValue) < 50) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'minOrderValue must be >= 50.', ERROR_CODES.VALIDATION_ERROR);
  }

  validateHours(payload.applicableHours);

  const scopeResult = await validateScopeAndRefs({
    shopId,
    scope: payload.scope,
    categoryIds: payload.categoryIds || [],
    productIds: payload.productIds || [],
  });

  return {
    startsAt,
    endsAt,
    categoryIds: scopeResult.categoryIds,
    productIds: scopeResult.productIds,
  };
};

const toOfferResponse = (offer) => ({
  id: offer._id,
  shopId: offer.shopId,
  name: offer.name,
  description: offer.description,
  type: offer.type,
  value: offer.value,
  scope: offer.scope,
  categoryIds: offer.categoryIds || [],
  productIds: offer.productIds || [],
  conditions: offer.conditions,
  validity: offer.validity,
  enabled: Boolean(offer.enabled),
  stats: offer.stats || { appliedCount: 0, totalDiscountGiven: 0 },
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
});

const createOffer = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const currentCount = await Offer.countDocuments({ shopId });
  if (currentCount >= MAX_OFFERS_PER_SHOP) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Maximum ${MAX_OFFERS_PER_SHOP} offers allowed per shop.`,
      ERROR_CODES.OFFER_LIMIT_EXCEEDED
    );
  }

  const payload = req.body;
  const validated = await validateOfferPayload({ shopId, payload });

  const offer = await Offer.create({
    shopId,
    name: payload.name,
    description: payload.description || null,
    type: payload.type,
    value: Number(payload.value),
    scope: payload.scope,
    categoryIds: validated.categoryIds,
    productIds: validated.productIds,
    conditions: {
      minOrderValue: payload.minOrderValue !== undefined ? Number(payload.minOrderValue) : 50,
      maxDiscount: payload.maxDiscount !== undefined ? Number(payload.maxDiscount) : null,
      applicableDays: payload.applicableDays || [],
      applicableHours: payload.applicableHours || { from: null, to: null },
    },
    validity: {
      startsAt: validated.startsAt,
      endsAt: validated.endsAt,
    },
    enabled: payload.enabled !== undefined ? Boolean(payload.enabled) : true,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Offer created successfully.',
    data: { offer: toOfferResponse(offer) },
  });
};

const listOffers = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const active = req.query.active;
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = { shopId };

  if (active !== undefined) {
    const isActive = String(active).toLowerCase() === 'true';
    const now = new Date();

    if (isActive) {
      filter.enabled = true;
      filter['validity.startsAt'] = { $lte: now };
      filter['validity.endsAt'] = { $gte: now };
    }
  }

  const [offers, total] = await Promise.all([
    Offer.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Offer.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Offers fetched successfully.',
    data: {
      offers: offers.map((offer) => toOfferResponse(offer)),
      pagination: { total, limit, offset },
    },
  });
};

const getOfferById = async (req, res) => {
  const { shopId, offerId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const offer = await Offer.findOne({ _id: offerId, shopId }).lean();
  if (!offer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Offer not found.', ERROR_CODES.OFFER_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Offer fetched successfully.',
    data: { offer: toOfferResponse(offer) },
  });
};

const updateOffer = async (req, res) => {
  const { shopId, offerId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const offer = await Offer.findOne({ _id: offerId, shopId });
  if (!offer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Offer not found.', ERROR_CODES.OFFER_NOT_FOUND);
  }

  const payload = req.body;
  const validated = await validateOfferPayload({ shopId, payload });

  offer.name = payload.name;
  offer.description = payload.description || null;
  offer.type = payload.type;
  offer.value = Number(payload.value);
  offer.scope = payload.scope;
  offer.categoryIds = validated.categoryIds;
  offer.productIds = validated.productIds;
  offer.conditions = {
    minOrderValue: payload.minOrderValue !== undefined ? Number(payload.minOrderValue) : 50,
    maxDiscount: payload.maxDiscount !== undefined ? Number(payload.maxDiscount) : null,
    applicableDays: payload.applicableDays || [],
    applicableHours: payload.applicableHours || { from: null, to: null },
  };
  offer.validity = {
    startsAt: validated.startsAt,
    endsAt: validated.endsAt,
  };
  offer.enabled = payload.enabled !== undefined ? Boolean(payload.enabled) : offer.enabled;

  await offer.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Offer updated successfully.',
    data: { offer: toOfferResponse(offer) },
  });
};

const deleteOffer = async (req, res) => {
  const { shopId, offerId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const offer = await Offer.findOneAndDelete({ _id: offerId, shopId });
  if (!offer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Offer not found.', ERROR_CODES.OFFER_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Offer deleted successfully.',
    data: {},
  });
};

const toggleOffer = async (req, res) => {
  const { shopId, offerId } = req.params;
  const { enabled } = req.body;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const offer = await Offer.findOne({ _id: offerId, shopId });
  if (!offer) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Offer not found.', ERROR_CODES.OFFER_NOT_FOUND);
  }

  offer.enabled = Boolean(enabled);
  await offer.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Offer status updated successfully.',
    data: { offer: toOfferResponse(offer) },
  });
};

const getApplicableOffers = async (req, res) => {
  const now = req.query.timestamp ? new Date(req.query.timestamp) : new Date();
  const cartTotal = Number(req.query.cartTotal || 0);
  const categoryIds = normalizeTextList(req.query.categoryIds);
  const productIds = normalizeIdList(req.query.productIds);
  const shopId = req.query.shopId && mongoose.isValidObjectId(req.query.shopId) ? req.query.shopId : undefined;

  const offers = await findApplicableOffers({
    cartTotal,
    categoryIds,
    productIds,
    shopId,
    timestamp: now,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Applicable offers fetched successfully.',
    data: {
      offers: offers.map((offer) => ({
        ...toOfferResponse(offer),
        estimatedDiscount: offer.estimatedDiscount,
      })),
    },
  });
};

module.exports = {
  createOffer,
  listOffers,
  getOfferById,
  updateOffer,
  deleteOffer,
  toggleOffer,
  getApplicableOffers,
};
