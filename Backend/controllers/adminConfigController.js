const mongoose = require('mongoose');
const Config = require('../models/Config');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES, AUDIT_EVENT_TYPES } = require('../config/constants');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');

const DEFAULT_CONFIGS = [
  { key: 'commission.default', value: 3, category: 'COMMISSION', description: 'Default commission percentage' },
  { key: 'commission.min', value: 1, category: 'COMMISSION', description: 'Minimum allowed commission percentage' },
  { key: 'commission.max', value: 50, category: 'COMMISSION', description: 'Maximum allowed commission percentage' },
  { key: 'order.minValue', value: 100, category: 'ORDER', description: 'Minimum order value' },
  { key: 'order.maxValue', value: 50000, category: 'ORDER', description: 'Maximum order value' },
  { key: 'delivery.maxRadius', value: 50, category: 'DELIVERY', description: 'Maximum delivery radius in KM' },
  { key: 'delivery.minCharge', value: 0, category: 'DELIVERY', description: 'Minimum delivery charge' },
  { key: 'delivery.maxCharge', value: 500, category: 'DELIVERY', description: 'Maximum delivery charge' },
  {
    key: 'subscription.freePeriodMonths',
    value: 6,
    category: 'SUBSCRIPTION',
    description: 'Default subscription free period months',
  },
  { key: 'subscription.basicPrice', value: 299, category: 'SUBSCRIPTION', description: 'Default basic plan monthly price' },
  {
    key: 'subscription.premiumPrice',
    value: 999,
    category: 'SUBSCRIPTION',
    description: 'Default premium plan monthly price',
  },
  { key: 'otp.expiryMinutes', value: 10, category: 'OTP', description: 'OTP expiry in minutes' },
  { key: 'otp.maxAttempts', value: 3, category: 'OTP', description: 'Maximum OTP attempts' },
  { key: 'otp.attemptWindowMinutes', value: 5, category: 'OTP', description: 'OTP attempt window in minutes' },
  { key: 'cart.expiryDays', value: 30, category: 'CART', description: 'Cart expiry in days' },
  { key: 'cart.maxItems', value: 50, category: 'CART', description: 'Maximum cart items' },
  { key: 'review.minLength', value: 10, category: 'REVIEW', description: 'Minimum review length' },
  { key: 'review.maxLength', value: 500, category: 'REVIEW', description: 'Maximum review length' },
  { key: 'payment.timeout', value: 900, category: 'PAYMENT', description: 'Payment timeout in seconds' },
  { key: 'refund.deadlineDays', value: 7, category: 'REFUND', description: 'Refund deadline in days' },
];

const DEFAULT_CONFIG_MAP = new Map(DEFAULT_CONFIGS.map((item) => [item.key, item]));

const ensureDefaults = async () => {
  const ops = DEFAULT_CONFIGS.map((item) => ({
    updateOne: {
      filter: { key: item.key },
      update: {
        $setOnInsert: {
          key: item.key,
          value: item.value,
          category: item.category,
          description: item.description,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    await Config.bulkWrite(ops);
  }
};

const auditConfigChange = async ({ req, key, action, beforeValue, afterValue, notes }) => {
  const actor = buildActorFromRequest(req);

  await logAudit(
    action === 'RESET' ? AUDIT_EVENT_TYPES.CONFIG_RESET : AUDIT_EVENT_TYPES.CONFIG_UPDATED,
    actor,
    { type: 'CONFIG', id: key, name: key },
    action,
    { before: beforeValue, after: afterValue },
    notes || null,
    buildMetadataFromRequest(req)
  );
};

const listConfig = async (req, res) => {
  await ensureDefaults();

  const filter = {};
  if (req.query.category) {
    filter.category = String(req.query.category).toUpperCase();
  }

  const configs = await Config.find(filter).sort({ category: 1, key: 1 }).lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Configuration fetched successfully.',
    data: { configs },
  });
};

const getConfigByKey = async (req, res) => {
  await ensureDefaults();

  const config = await Config.findOne({ key: req.params.key }).lean();
  if (!config) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Config key not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Configuration item fetched successfully.',
    data: { config },
  });
};

const updateConfigByKey = async (req, res) => {
  await ensureDefaults();

  const { key } = req.params;
  const config = await Config.findOne({ key });
  if (!config) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Config key not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  const beforeValue = config.value;
  config.value = req.body.value;
  config.lastModifiedBy = req.user?.id && mongoose.isValidObjectId(String(req.user.id)) ? req.user.id : null;
  config.lastModifiedAt = new Date();
  await config.save();

  await auditConfigChange({
    req,
    key,
    action: 'UPDATED',
    beforeValue,
    afterValue: config.value,
    notes: 'Configuration value updated via admin config API.',
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Configuration updated successfully.',
    data: { success: true, config },
  });
};

const resetConfigToDefault = async (req, res) => {
  await ensureDefaults();

  const key = String(req.body.key || '').trim();
  if (!key) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'key is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const defaultEntry = DEFAULT_CONFIG_MAP.get(key);
  if (!defaultEntry) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No default value is configured for this key.', ERROR_CODES.VALIDATION_ERROR);
  }

  const config = await Config.findOne({ key });
  if (!config) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Config key not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  const beforeValue = config.value;

  config.value = defaultEntry.value;
  config.category = defaultEntry.category;
  config.description = defaultEntry.description;
  config.lastModifiedBy = req.user?.id && mongoose.isValidObjectId(String(req.user.id)) ? req.user.id : null;
  config.lastModifiedAt = new Date();
  await config.save();

  await auditConfigChange({
    req,
    key,
    action: 'RESET',
    beforeValue,
    afterValue: config.value,
    notes: 'Configuration reset to default.',
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Configuration reset successfully.',
    data: { success: true, message: 'Config reset to default value.' },
  });
};

module.exports = {
  listConfig,
  getConfigByKey,
  updateConfigByKey,
  resetConfigToDefault,
};
