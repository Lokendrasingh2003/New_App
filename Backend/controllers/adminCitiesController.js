const mongoose = require('mongoose');
const City = require('../models/City');
const Shop = require('../models/Shop');
const Category = require('../models/Category');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, SHOP_STATUS, ORDER_STATUS, AUDIT_EVENT_TYPES } = require('../config/constants');

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const ensurePublishedCategoryExists = async () => {
  const exists = await Category.exists({ isActive: true, status: 'PUBLISHED' });
  if (!exists) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Active city requires at least one published category.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const ensureUniqueCity = async ({ name, slug, excludeId = null }) => {
  const query = {
    $or: [{ name: { $regex: `^${name}$`, $options: 'i' } }, { slug }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await City.findOne(query).lean();
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'City name or slug already exists.', ERROR_CODES.VALIDATION_ERROR);
  }
};

const buildCityPayload = (input) => ({
  name: String(input.name || '').trim(),
  slug: toSlug(input.slug || input.name),
  description: input.description ? String(input.description).trim() : null,
  state: String(input.state || '').trim(),
  latitude: Number(input.latitude),
  longitude: Number(input.longitude),
  deliveryAvailable: Boolean(input.deliveryAvailable),
  populationEstimate:
    input.populationEstimate !== undefined && input.populationEstimate !== null
      ? Number(input.populationEstimate)
      : null,
});

const createCity = async (req, res) => {
  const payload = buildCityPayload(req.body);
  const nextIsActive = req.body.isActive === undefined ? true : Boolean(req.body.isActive);

  if (nextIsActive) {
    await ensurePublishedCategoryExists();
  }

  await ensureUniqueCity({ name: payload.name, slug: payload.slug });

  const city = await City.create({
    ...payload,
    isActive: nextIsActive,
    shopCount: 0,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.CITY_CREATED,
    buildActorFromRequest(req),
    { type: 'CITY', id: city._id, name: city.name },
    'CREATED',
    { before: null, after: city.toObject() },
    'City created by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'City created successfully.',
    data: { city },
  });
};

const listCities = async (req, res) => {
  const search = String(req.query.search || '').trim();
  const active = req.query.active;
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { state: { $regex: search, $options: 'i' } },
    ];
  }

  if (active !== undefined) {
    filter.isActive = String(active).toLowerCase() === 'true';
  }

  const [cities, total] = await Promise.all([
    City.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    City.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Cities fetched successfully.',
    data: {
      cities,
      pagination: { total, limit, offset },
    },
  });
};

const getCityBaseStats = async (cityId) => {
  const objectId = new mongoose.Types.ObjectId(String(cityId));

  const [shopCount, userAgg, orderCount, deliveredOrderCount, revenueAgg] = await Promise.all([
    Shop.countDocuments({ cityId: objectId, status: SHOP_STATUS.APPROVED, isActive: true }),
    User.aggregate([
      { $unwind: { path: '$addresses', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'cities',
          let: { cityName: '$addresses.city' },
          pipeline: [
            {
              $match: {
                _id: objectId,
              },
            },
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: '$name' }, { $toLower: '$$cityName' }],
                },
              },
            },
          ],
          as: 'cityMatch',
        },
      },
      { $match: { cityMatch: { $ne: [] } } },
      { $group: { _id: '$_id' } },
      { $count: 'userCount' },
    ]),
    Order.countDocuments({ cityId: objectId }),
    Order.countDocuments({ cityId: objectId, status: ORDER_STATUS.DELIVERED }),
    Order.aggregate([
      { $match: { cityId: objectId, status: ORDER_STATUS.DELIVERED } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
  ]);

  const userCount = Number(userAgg?.[0]?.userCount || 0);
  const totalRevenue = Number(Number(revenueAgg?.[0]?.total || 0).toFixed(2));
  const averageOrderValue = deliveredOrderCount > 0 ? Number((totalRevenue / deliveredOrderCount).toFixed(2)) : 0;

  return {
    shopCount,
    userCount,
    orderCount,
    totalRevenue,
    averageOrderValue,
  };
};

const getCityById = async (req, res) => {
  const { cityId } = req.params;

  const city = await City.findById(cityId).lean();
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const stats = await getCityBaseStats(city._id);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City fetched successfully.',
    data: {
      city,
      stats,
    },
  });
};

const updateCity = async (req, res) => {
  const { cityId } = req.params;

  const city = await City.findById(cityId);
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const payload = buildCityPayload(req.body);
  const nextIsActive = req.body.isActive === undefined ? city.isActive : Boolean(req.body.isActive);

  if (nextIsActive) {
    await ensurePublishedCategoryExists();
  }

  await ensureUniqueCity({ name: payload.name, slug: payload.slug, excludeId: city._id });

  const before = city.toObject();

  city.name = payload.name;
  city.slug = payload.slug;
  city.description = payload.description;
  city.state = payload.state;
  city.latitude = payload.latitude;
  city.longitude = payload.longitude;
  city.isActive = nextIsActive;
  city.deliveryAvailable = payload.deliveryAvailable;
  city.populationEstimate = payload.populationEstimate;

  await city.save();

  await logAudit(
    AUDIT_EVENT_TYPES.CITY_UPDATED,
    buildActorFromRequest(req),
    { type: 'CITY', id: city._id, name: city.name },
    'UPDATED',
    { before, after: city.toObject() },
    'City updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City updated successfully.',
    data: { city },
  });
};

const toggleCityActive = async (req, res) => {
  const { cityId } = req.params;
  const { isActive } = req.body;

  const city = await City.findById(cityId);
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  if (isActive === false) {
    const activeShops = await Shop.countDocuments({ cityId: city._id, isActive: true, status: SHOP_STATUS.APPROVED });
    if (activeShops > 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Cannot disable city while approved active shops exist.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }
  }

  if (isActive === true) {
    await ensurePublishedCategoryExists();
  }

  const before = city.toObject();

  city.isActive = Boolean(isActive);
  await city.save();

  await logAudit(
    AUDIT_EVENT_TYPES.CITY_TOGGLED_ACTIVE,
    buildActorFromRequest(req),
    { type: 'CITY', id: city._id, name: city.name },
    'UPDATED',
    { before, after: city.toObject() },
    `City active status changed to ${city.isActive}.`,
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City active status updated successfully.',
    data: { city },
  });
};

const toggleCityDelivery = async (req, res) => {
  const { cityId } = req.params;
  const { deliveryAvailable } = req.body;

  const city = await City.findById(cityId);
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  city.deliveryAvailable = Boolean(deliveryAvailable);
  await city.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City delivery availability updated successfully.',
    data: { city },
  });
};

const getCityStats = async (req, res) => {
  const { cityId } = req.params;

  const city = await City.findById(cityId).lean();
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const stats = await getCityBaseStats(city._id);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City stats fetched successfully.',
    data: stats,
  });
};

module.exports = {
  createCity,
  listCities,
  getCityById,
  updateCity,
  toggleCityActive,
  toggleCityDelivery,
  getCityStats,
};
