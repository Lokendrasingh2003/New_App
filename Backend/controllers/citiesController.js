const mongoose = require('mongoose');
const City = require('../models/City');
const Shop = require('../models/Shop');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getCities = async (req, res) => {
  const search = (req.query.search || '').toString().trim();
  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const query = { isActive: true };

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const [items, total] = await Promise.all([
    City.find(query).sort({ name: 1 }).skip(offset).limit(limit).lean(),
    City.countDocuments(query),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Cities fetched successfully.',
    data: {
      cities: items,
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getCityById = async (req, res) => {
  const { cityId } = req.params;

  if (!mongoose.isValidObjectId(cityId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const city = await City.findById(cityId).lean();

  if (!city || !city.isActive) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const activeShops = await Shop.countDocuments({
    cityId: city._id,
    publicVisible: true,
    isActive: true,
    'subscription.isActive': true,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City details fetched successfully.',
    data: {
      city: {
        ...city,
        shopCount: city.shopCount ?? activeShops,
      },
    },
  });
};

const getCityStats = async (req, res) => {
  const { cityId } = req.params;

  if (!mongoose.isValidObjectId(cityId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const city = await City.findById(cityId).lean();

  if (!city || !city.isActive) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const activeShops = await Shop.countDocuments({
    cityId: city._id,
    publicVisible: true,
    isActive: true,
    'subscription.isActive': true,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'City stats fetched successfully.',
    data: {
      shopCount: city.shopCount ?? activeShops,
      deliveryAvailable: city.deliveryAvailable,
      activeShops,
    },
  });
};

module.exports = {
  getCities,
  getCityById,
  getCityStats,
};
