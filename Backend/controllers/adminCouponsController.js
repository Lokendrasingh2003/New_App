const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const generateCouponCode = () => `CC${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

const validateCouponBusinessRules = (input) => {
  const discountType = String(input.discountType || '').toUpperCase();
  const discountValue = Number(input.discountValue || 0);
  const maxDiscount = input.maxDiscount !== undefined && input.maxDiscount !== null ? Number(input.maxDiscount) : null;
  const minOrderValue = Number(input.minOrderValue || 0);
  const validFrom = new Date(input.validFrom);
  const validTill = new Date(input.validTill);
  const maxUsageLimit = Number(input.maxUsageLimit || 0);
  const maxUsagePerUser = Number(input.maxUsagePerUser || 0);

  if (!['PERCENT', 'FLAT'].includes(discountType)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'discountType must be PERCENT or FLAT.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (discountType === 'PERCENT' && (discountValue < 1 || discountValue > 100)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'PERCENT discount value must be between 1 and 100.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (discountType === 'FLAT' && discountValue <= 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'FLAT discount value must be greater than 0.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (maxDiscount !== null && maxDiscount >= minOrderValue) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'maxDiscount must be less than minOrderValue.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTill.getTime()) || validFrom >= validTill) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'validFrom must be earlier than validTill.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!Number.isFinite(maxUsageLimit) || maxUsageLimit < 1) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'maxUsageLimit must be at least 1.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!Number.isFinite(maxUsagePerUser) || maxUsagePerUser < 1 || maxUsagePerUser > maxUsageLimit) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'maxUsagePerUser must be at least 1 and less than or equal to maxUsageLimit.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const buildCouponPayload = (req) => {
  const code = normalizeCode(req.body.code || generateCouponCode());
  const rawMaxDiscount = req.body.maxDiscount !== undefined ? Number(req.body.maxDiscount) : null;
  const normalizedMaxDiscount = Number.isFinite(rawMaxDiscount) && rawMaxDiscount > 0 ? rawMaxDiscount : null;

  return {
    code,
    description: req.body.description ? String(req.body.description).trim() : null,
    discountType: String(req.body.discountType).toUpperCase(),
    discountValue: Number(req.body.discountValue),
    maxDiscount: normalizedMaxDiscount,
    minOrderValue: Number(req.body.minOrderValue || 0),
    maxUsageLimit: Number(req.body.maxUsageLimit),
    maxUsagePerUser: Number(req.body.maxUsagePerUser),
    validFrom: new Date(req.body.validFrom),
    validTill: new Date(req.body.validTill),
    applicableCity: req.body.applicableCity || null,
    applicableShops: Array.isArray(req.body.applicableShops) ? req.body.applicableShops : [],
    applicableCategories: Array.isArray(req.body.applicableCategories) ? req.body.applicableCategories : [],
    isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
    createdBy: req.user?.id && mongoose.isValidObjectId(req.user.id) ? req.user.id : null,
  };
};

const createCoupon = async (req, res) => {
  validateCouponBusinessRules(req.body);

  const payload = buildCouponPayload(req);
  const exists = await Coupon.exists({ code: payload.code });

  if (exists) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Coupon code already exists.', ERROR_CODES.VALIDATION_ERROR);
  }

  const coupon = await Coupon.create(payload);

  await logAudit(
    AUDIT_EVENT_TYPES.COUPON_CREATED,
    buildActorFromRequest(req),
    { type: 'COUPON', id: coupon._id, name: coupon.code },
    'CREATED',
    { before: null, after: coupon.toObject() },
    'Coupon created by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Coupon created successfully.',
    data: { success: true, coupon },
  });
};

const listCoupons = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.active !== undefined) {
    filter.isActive = String(req.query.active).toLowerCase() === 'true';
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupons fetched successfully.',
    data: {
      coupons,
      pagination: { total, limit, offset },
    },
  });
};

const updateCoupon = async (req, res) => {
  const { couponId } = req.params;
  const coupon = await Coupon.findById(couponId);

  if (!coupon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Coupon not found.', ERROR_CODES.COUPON_INVALID);
  }

  validateCouponBusinessRules(req.body);

  const before = coupon.toObject();

  const payload = buildCouponPayload(req);
  const existing = await Coupon.findOne({ code: payload.code, _id: { $ne: coupon._id } }).lean();
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Coupon code already exists.', ERROR_CODES.VALIDATION_ERROR);
  }

  Object.assign(coupon, {
    code: payload.code,
    description: payload.description,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxDiscount: payload.maxDiscount,
    minOrderValue: payload.minOrderValue,
    maxUsageLimit: payload.maxUsageLimit,
    maxUsagePerUser: payload.maxUsagePerUser,
    validFrom: payload.validFrom,
    validTill: payload.validTill,
    applicableCity: payload.applicableCity,
    applicableShops: payload.applicableShops,
    applicableCategories: payload.applicableCategories,
    isActive: payload.isActive,
  });

  await coupon.save();

  await logAudit(
    AUDIT_EVENT_TYPES.COUPON_UPDATED,
    buildActorFromRequest(req),
    { type: 'COUPON', id: coupon._id, name: coupon.code },
    'UPDATED',
    { before, after: coupon.toObject() },
    'Coupon updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon updated successfully.',
    data: { coupon },
  });
};

const deleteCoupon = async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Coupon not found.', ERROR_CODES.COUPON_INVALID);
  }

  const usedInOrders = await Order.exists({ 'appliedCoupon.code': coupon.code });
  if (Number(coupon.usageStats?.totalUsed || 0) > 0 || usedInOrders) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only unused coupons can be deleted.', ERROR_CODES.VALIDATION_ERROR);
  }

  await Coupon.deleteOne({ _id: coupon._id });

  await logAudit(
    AUDIT_EVENT_TYPES.COUPON_UPDATED,
    buildActorFromRequest(req),
    { type: 'COUPON', id: coupon._id, name: coupon.code },
    'DELETED',
    { before: coupon.toObject(), after: null },
    'Coupon deleted by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon deleted successfully.',
    data: { success: true, message: 'Coupon deleted successfully.' },
  });
};

const toggleCouponActive = async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId);
  if (!coupon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Coupon not found.', ERROR_CODES.COUPON_INVALID);
  }

  coupon.isActive = Boolean(req.body.isActive);
  await coupon.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon active status updated successfully.',
    data: { coupon },
  });
};

const getCouponAnalytics = async (req, res) => {
  const coupon = await Coupon.findById(req.params.couponId).lean();
  if (!coupon) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Coupon not found.', ERROR_CODES.COUPON_INVALID);
  }

  const [usageByDate, topShops, uniqueUsersAgg] = await Promise.all([
    Order.aggregate([
      { $match: { 'appliedCoupon.code': coupon.code } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          totalUsed: { $sum: 1 },
          totalDiscountGiven: { $sum: '$appliedCoupon.discountAmount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalUsed: 1,
          totalDiscountGiven: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: { 'appliedCoupon.code': coupon.code } },
      {
        $group: {
          _id: '$shopId',
          totalUsed: { $sum: 1 },
        },
      },
      { $sort: { totalUsed: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'shops',
          localField: '_id',
          foreignField: '_id',
          as: 'shop',
        },
      },
      { $unwind: { path: '$shop', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          shopId: '$_id',
          shopName: '$shop.shopName',
          totalUsed: 1,
        },
      },
    ]),
    Order.aggregate([
      { $match: { 'appliedCoupon.code': coupon.code } },
      {
        $group: {
          _id: '$userId',
        },
      },
      { $count: 'count' },
    ]),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon analytics fetched successfully.',
    data: {
      totalUsed: Number(coupon.usageStats?.totalUsed || 0),
      uniqueUsers: Number(uniqueUsersAgg?.[0]?.count || coupon.usageStats?.uniqueUsers || 0),
      totalDiscountGiven: Number(coupon.usageStats?.totalDiscountGiven || 0),
      usageByDate,
      topShops,
    },
  });
};

module.exports = {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  getCouponAnalytics,
};
