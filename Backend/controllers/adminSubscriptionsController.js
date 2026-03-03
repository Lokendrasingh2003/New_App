const mongoose = require('mongoose');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ShopSubscription = require('../models/ShopSubscription');
const Shop = require('../models/Shop');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const createSubscriptionPlan = async (req, res) => {
  const slug = normalizeSlug(req.body.slug || req.body.name);

  const exists = await SubscriptionPlan.exists({ slug });
  if (exists) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Plan slug already exists.', ERROR_CODES.VALIDATION_ERROR);
  }

  const plan = await SubscriptionPlan.create({
    name: String(req.body.name || '').toUpperCase(),
    slug,
    description: req.body.description ? String(req.body.description).trim() : null,
    pricing: {
      monthlyPrice: Number(req.body.pricing.monthlyPrice),
      yearlyPrice: Number(req.body.pricing.yearlyPrice),
      freePeriodMonths: Number(req.body.pricing.freePeriodMonths ?? 6),
    },
    features: Array.isArray(req.body.features) ? req.body.features : [],
    limits: req.body.limits,
    benefits: req.body.benefits,
    isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
    displayOrder: Number(req.body.displayOrder || 0),
  });

  await logAudit(
    AUDIT_EVENT_TYPES.SUBSCRIPTION_PLAN_UPDATED,
    buildActorFromRequest(req),
    { type: 'SUBSCRIPTION_PLAN', id: plan._id, name: plan.name },
    'CREATED',
    { before: null, after: plan.toObject() },
    'Subscription plan created by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Subscription plan created successfully.',
    data: { success: true, plan },
  });
};

const listSubscriptionPlans = async (req, res) => {
  const filter = {};
  if (req.query.active !== undefined) {
    filter.isActive = String(req.query.active).toLowerCase() === 'true';
  }

  const plans = await SubscriptionPlan.find(filter).sort({ displayOrder: 1, createdAt: -1 }).lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subscription plans fetched successfully.',
    data: { plans },
  });
};

const updateSubscriptionPlan = async (req, res) => {
  const { planId } = req.params;

  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subscription plan not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  const hasSubscribers = await ShopSubscription.exists({ planId: plan._id });
  if (hasSubscribers) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot modify a plan with subscribed shops.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const nextSlug = normalizeSlug(req.body.slug || req.body.name);
  const existingSlug = await SubscriptionPlan.findOne({ slug: nextSlug, _id: { $ne: plan._id } }).lean();
  if (existingSlug) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Plan slug already exists.', ERROR_CODES.VALIDATION_ERROR);
  }

  const before = plan.toObject();

  plan.name = String(req.body.name || '').toUpperCase();
  plan.slug = nextSlug;
  plan.description = req.body.description ? String(req.body.description).trim() : null;
  plan.pricing = {
    monthlyPrice: Number(req.body.pricing.monthlyPrice),
    yearlyPrice: Number(req.body.pricing.yearlyPrice),
    freePeriodMonths: Number(req.body.pricing.freePeriodMonths ?? 6),
  };
  plan.features = Array.isArray(req.body.features) ? req.body.features : [];
  plan.limits = req.body.limits;
  plan.benefits = req.body.benefits;
  plan.displayOrder = Number(req.body.displayOrder || 0);
  if (req.body.isActive !== undefined) {
    plan.isActive = Boolean(req.body.isActive);
  }

  await plan.save();

  await logAudit(
    AUDIT_EVENT_TYPES.SUBSCRIPTION_PLAN_UPDATED,
    buildActorFromRequest(req),
    { type: 'SUBSCRIPTION_PLAN', id: plan._id, name: plan.name },
    'UPDATED',
    { before, after: plan.toObject() },
    'Subscription plan updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subscription plan updated successfully.',
    data: { plan },
  });
};

const toggleSubscriptionPlanActive = async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.planId);
  if (!plan) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subscription plan not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  plan.isActive = Boolean(req.body.isActive);
  await plan.save();

  await logAudit(
    AUDIT_EVENT_TYPES.SUBSCRIPTION_PLAN_UPDATED,
    buildActorFromRequest(req),
    { type: 'SUBSCRIPTION_PLAN', id: plan._id, name: plan.name },
    'UPDATED',
    { before: null, after: { isActive: plan.isActive } },
    'Subscription plan active status updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subscription plan active status updated successfully.',
    data: { plan },
  });
};

const listShopSubscriptions = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.planId) {
    filter.planId = req.query.planId;
  }

  if (req.query.cityId) {
    const cityShopIds = await Shop.find({ cityId: req.query.cityId }).select('_id').lean();
    filter.shopId = { $in: cityShopIds.map((shop) => shop._id) };
  }

  const [subscriptions, total] = await Promise.all([
    ShopSubscription.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    ShopSubscription.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop subscriptions fetched successfully.',
    data: {
      subscriptions,
      pagination: { total, limit, offset },
    },
  });
};

const getShopSubscriptionById = async (req, res) => {
  const subscription = await ShopSubscription.findById(req.params.subscriptionId)
    .populate('shopId', 'shopName cityId ownerId')
    .populate('planId', 'name slug pricing benefits limits')
    .lean();

  if (!subscription) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subscription not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop subscription fetched successfully.',
    data: { subscription },
  });
};

const getShopSubscriptionStats = async (_req, res) => {
  const [activeSubscriptions, expiredSubscriptions, revenueAgg, subscriptionsByPlanAgg] = await Promise.all([
    ShopSubscription.countDocuments({ status: 'ACTIVE' }),
    ShopSubscription.countDocuments({ status: 'EXPIRED' }),
    ShopSubscription.aggregate([
      { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paymentHistory.amount' },
        },
      },
    ]),
    ShopSubscription.aggregate([
      {
        $group: {
          _id: '$planId',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          planId: '$_id',
          planName: '$plan.name',
          count: 1,
        },
      },
    ]),
  ]);

  const subscriptionsByPlan = subscriptionsByPlanAgg.reduce((acc, row) => {
    acc[String(row.planName || row.planId)] = Number(row.count || 0);
    return acc;
  }, {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subscription stats fetched successfully.',
    data: {
      activeSubscriptions,
      expiredSubscriptions,
      totalRevenue: Number(Number(revenueAgg?.[0]?.totalRevenue || 0).toFixed(2)),
      subscriptionsByPlan,
    },
  });
};

module.exports = {
  createSubscriptionPlan,
  listSubscriptionPlans,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
  listShopSubscriptions,
  getShopSubscriptionById,
  getShopSubscriptionStats,
};
