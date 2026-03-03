const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const City = require('../models/City');
const Review = require('../models/Review');
const Product = require('../models/Product');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { haversineDistanceKm, isOpenNow, toDiscoveryShopResponse } = require('../utils/discovery');

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildDiscoverableFilter = () => ({
  publicVisible: true,
  isActive: true,
  'subscription.isActive': true,
});

const ensureCityExists = async (cityId) => {
  if (!mongoose.isValidObjectId(cityId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const city = await City.findById(cityId).lean();
  if (!city || !city.isActive) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  return city;
};

const getCityShops = async (req, res) => {
  const { cityId } = req.params;
  await ensureCityExists(cityId);

  const search = (req.query.search || '').toString().trim();
  const category = (req.query.category || '').toString().trim();
  const area = (req.query.area || '').toString().trim();
  const sort = (req.query.sort || 'rating').toString();

  const lat = req.query.lat !== undefined ? toNumber(req.query.lat, null) : null;
  const lng = req.query.lng !== undefined ? toNumber(req.query.lng, null) : null;
  const radiusKm = toNumber(req.query.radiusKm, 10);

  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const query = {
    cityId,
    ...buildDiscoverableFilter(),
  };

  if (category) {
    query.category = { $regex: `^${category}$`, $options: 'i' };
  }

  if (area) {
    query.area = { $regex: `^${area}$`, $options: 'i' };
  }

  if (search) {
    query.$or = [
      { shopName: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
      { area: { $regex: search, $options: 'i' } },
    ];
  }

  let shops = await Shop.find(query).lean();

  const hasLocationInput = Number.isFinite(lat) && Number.isFinite(lng);

  if (hasLocationInput) {
    shops = shops
      .map((shop) => ({
        ...shop,
        _distance: haversineDistanceKm(lat, lng, shop.latitude, shop.longitude),
      }))
      .filter((shop) => shop._distance <= radiusKm);
  }

  if (sort === 'distance' && hasLocationInput) {
    shops.sort((a, b) => a._distance - b._distance);
  } else if (sort === 'recent') {
    shops.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    shops.sort((a, b) => {
      if ((b.stats?.rating || 0) !== (a.stats?.rating || 0)) {
        return (b.stats?.rating || 0) - (a.stats?.rating || 0);
      }
      return (b.stats?.reviewCount || 0) - (a.stats?.reviewCount || 0);
    });
  }

  const total = shops.length;
  const paginated = shops.slice(offset, offset + limit);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shops fetched successfully.',
    data: {
      shops: paginated.map((shop) => toDiscoveryShopResponse(shop, shop._distance)),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getShopById = async (req, res) => {
  const { shopId } = req.params;

  if (!mongoose.isValidObjectId(shopId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const shop = await Shop.findOne({
    _id: shopId,
    ...buildDiscoverableFilter(),
  }).lean();

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop details fetched successfully.',
    data: {
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        slug: shop.slug,
        publicUrl: shop.publicUrl,
        description: shop.description,
        category: shop.category,
        phone: shop.phone,
        email: shop.email,
        addressLine1: shop.addressLine1,
        area: shop.area,
        pincode: shop.pincode,
        latitude: shop.latitude,
        longitude: shop.longitude,
        businessHours: shop.businessHours,
        delivery: shop.delivery,
        rating: shop.stats?.rating || 0,
        reviewCount: shop.stats?.reviewCount || 0,
        isOpen: isOpenNow(shop.businessHours),
        imageUrl: shop.imageUrl || null,
      },
    },
  });
};

const getShopReviews = async (req, res) => {
  const { shopId } = req.params;

  if (!mongoose.isValidObjectId(shopId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const shopExists = await Shop.exists({ _id: shopId, ...buildDiscoverableFilter() });
  if (!shopExists) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const [reviews, total] = await Promise.all([
    Review.find({ shopId }).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Review.countDocuments({ shopId }),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop reviews fetched successfully.',
    data: {
      reviews: reviews.map((review) => ({
        id: review._id,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        date: review.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getNearbyShops = async (req, res) => {
  const lat = toNumber(req.query.lat, null);
  const lng = toNumber(req.query.lng, null);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'lat and lng are required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const radiusKm = toNumber(req.query.radiusKm, 10);
  const limit = Math.min(toInteger(req.query.limit, 20), 100);

  const shops = await Shop.find(buildDiscoverableFilter()).lean();

  const nearest = shops
    .map((shop) => ({
      ...shop,
      _distance: haversineDistanceKm(lat, lng, shop.latitude, shop.longitude),
    }))
    .filter((shop) => shop._distance <= radiusKm)
    .sort((a, b) => a._distance - b._distance)
    .slice(0, limit)
    .map((shop) => toDiscoveryShopResponse(shop, shop._distance));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Nearby shops fetched successfully.',
    data: {
      shops: nearest,
    },
  });
};

const getPublicShopBySlug = async (req, res) => {
  const { citySlug, shopSlug } = req.params;

  const city = await City.findOne({ slug: citySlug, isActive: true }).lean();
  if (!city) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const shop = await Shop.findOne({
    cityId: city._id,
    slug: shopSlug,
    ...buildDiscoverableFilter(),
  }).lean();

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const [products, reviews] = await Promise.all([
    Product.find({ shopId: shop._id, active: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Review.find({ shopId: shop._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Public shop fetched successfully.',
    data: {
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        slug: shop.slug,
        publicUrl: shop.publicUrl,
        category: shop.category,
        city: city.name,
        area: shop.area,
        addressLine1: shop.addressLine1,
        businessHours: shop.businessHours,
        delivery: shop.delivery,
        rating: shop.stats?.rating || 0,
        reviewCount: shop.stats?.reviewCount || 0,
        isOpen: isOpenNow(shop.businessHours),
      },
      products: products.map((product) => ({
        id: product._id,
        name: product.name,
        images: product.images || [],
        inStock: product.inStock,
        basePrice: product.basePrice,
        baseMrp: product.baseMrp,
        rating: product.rating,
        reviewCount: product.reviewCount,
      })),
      reviews: reviews.map((review) => ({
        id: review._id,
        userName: review.userName,
        rating: review.rating,
        comment: review.comment,
        date: review.createdAt,
      })),
      orderingEnabled: true,
    },
  });
};

module.exports = {
  getCityShops,
  getShopById,
  getShopReviews,
  getNearbyShops,
  getPublicShopBySlug,
};
