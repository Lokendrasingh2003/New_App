const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const City = require('../models/City');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const isCouponActiveInWindow = (coupon, now = new Date()) => {
  if (!coupon || !coupon.isActive) {
    return false;
  }

  const validFrom = new Date(coupon.validFrom).getTime();
  const validTill = new Date(coupon.validTill).getTime();
  const nowTs = now.getTime();

  return validFrom <= nowTs && validTill >= nowTs;
};

const calculateDiscount = ({ coupon, cartTotal }) => {
  const total = Number(cartTotal || 0);
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  let discount = 0;

  if (coupon.discountType === 'PERCENT') {
    discount = (total * Number(coupon.discountValue || 0)) / 100;
    const parsedMaxDiscount =
      coupon.maxDiscount !== null && coupon.maxDiscount !== undefined ? Number(coupon.maxDiscount) : null;

    if (parsedMaxDiscount !== null && Number.isFinite(parsedMaxDiscount) && parsedMaxDiscount > 0) {
      discount = Math.min(discount, parsedMaxDiscount);
    }
  } else {
    discount = Number(coupon.discountValue || 0);
  }

  return Number(Math.max(0, Math.min(discount, total)).toFixed(2));
};

const validateCoupon = async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  const cartTotal = Number(req.query.cartTotal || 0);
  const cityId = req.query.cityId ? String(req.query.cityId) : null;
  const shopId = req.query.shopId ? String(req.query.shopId) : null;

  if (!code) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon code is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const coupon = await Coupon.findOne({ code }).lean();

  if (!coupon) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Coupon not found.' },
    });
  }

  if (!isCouponActiveInWindow(coupon)) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Coupon is inactive or expired.' },
    });
  }

  const totalUsed = Number(coupon.usageStats?.totalUsed || 0);
  if (totalUsed >= Number(coupon.maxUsageLimit || 0)) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Coupon usage limit reached.' },
    });
  }

  if (cartTotal < Number(coupon.minOrderValue || 0)) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Minimum order value not met.' },
    });
  }

  if (coupon.applicableCity && cityId && String(coupon.applicableCity) !== String(cityId)) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Coupon is not applicable in this city.' },
    });
  }

  if (coupon.applicableCity && !cityId) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'City context is required for this coupon.' },
    });
  }

  if (Array.isArray(coupon.applicableShops) && coupon.applicableShops.length > 0 && shopId) {
    const applicableShopIds = coupon.applicableShops.map((id) => String(id));
    if (!applicableShopIds.includes(String(shopId))) {
      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Coupon validation completed.',
        data: { valid: false, discount: 0, message: 'Coupon is not applicable for this shop.' },
      });
    }
  }

  if (Array.isArray(coupon.applicableShops) && coupon.applicableShops.length > 0 && !shopId) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: { valid: false, discount: 0, message: 'Shop context is required for this coupon.' },
    });
  }

  if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Coupon validation completed.',
      data: {
        valid: false,
        discount: 0,
        message: 'Coupon applies to specific categories. Validate against cart items.',
      },
    });
  }

  const discount = calculateDiscount({ coupon, cartTotal });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon validation completed.',
    data: {
      valid: true,
      discount,
      message: 'Coupon is valid.',
    },
  });
};

const listPublicCoupons = async (req, res) => {
  const now = new Date();
  const limit = Math.min(Number.parseInt(String(req.query.limit || 20), 10) || 20, 100);
  const offset = Math.max(Number.parseInt(String(req.query.offset || 0), 10) || 0, 0);
  let cityId = req.query.cityId ? String(req.query.cityId) : null;
  const shopId = req.query.shopId ? String(req.query.shopId) : null;

  // Convert city slug to ObjectId if needed
  if (cityId && !mongoose.isValidObjectId(cityId)) {
    try {
      const city = await City.findOne({ slug: cityId.toLowerCase() }).select('_id').lean();
      if (city) {
        cityId = city._id.toString();
      }
    } catch (error) {
      // If city lookup fails, just keep the original cityId
    }
  }

  const query = {
    isActive: true,
    validFrom: { $lte: now },
    validTill: { $gte: now },
  };

  const andFilters = [];

  if (cityId) {
    andFilters.push({
      $or: [{ applicableCity: null }, { applicableCity: cityId }],
    });
  }

  if (shopId && mongoose.isValidObjectId(shopId)) {
    andFilters.push({
      $or: [
        { applicableShops: { $exists: false } },
        { applicableShops: { $size: 0 } },
        { applicableShops: shopId },
      ],
    });
  }

  if (andFilters.length > 0) {
    query.$and = andFilters;
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(query).sort({ validTill: 1, createdAt: -1 }).skip(offset).limit(limit).lean(),
    Coupon.countDocuments(query),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Public coupons fetched successfully.',
    data: {
      coupons: coupons.map((coupon) => ({
        id: coupon._id,
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue || 0),
        maxDiscount: coupon.maxDiscount,
        minOrderValue: Number(coupon.minOrderValue || 0),
        expiryDate: coupon.validTill,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const countUserCouponUsage = async ({ userId, code }) => {
  if (!userId) {
    return 0;
  }

  return Order.countDocuments({
    userId,
    'appliedCoupon.code': code,
    status: { $ne: 'CANCELLED' },
  });
};

module.exports = {
  validateCoupon,
  listPublicCoupons,
  isCouponActiveInWindow,
  calculateDiscount,
  countUserCouponUsage,
};
