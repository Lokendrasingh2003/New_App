const Commission = require('../models/Commission');

const DEFAULT_FALLBACK_PERCENTAGE = 3;

const resolveDefaultCommission = async (at = new Date()) => {
  const now = new Date(at);

  const row = await Commission.findOne({
    type: 'DEFAULT',
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTill: null }, { effectiveTill: { $gte: now } }],
  })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .lean();

  if (!row) {
    return {
      percentage: DEFAULT_FALLBACK_PERCENTAGE,
      effectiveFrom: null,
      source: 'FALLBACK',
    };
  }

  return {
    percentage: Number(row.percentage),
    effectiveFrom: row.effectiveFrom,
    source: 'DEFAULT',
    id: row._id,
  };
};

const resolveShopCommission = async ({ shopId, at = new Date() }) => {
  const now = new Date(at);

  const override = await Commission.findOne({
    type: 'SHOP_OVERRIDE',
    shopId,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTill: null }, { effectiveTill: { $gte: now } }],
  })
    .sort({ effectiveFrom: -1, createdAt: -1 })
    .lean();

  if (override) {
    return {
      percentage: Number(override.percentage),
      effectiveFrom: override.effectiveFrom,
      source: 'SHOP_OVERRIDE',
      id: override._id,
    };
  }

  return resolveDefaultCommission(now);
};

const calculateCommissionAmount = ({ amount, percentage }) => {
  const base = Number(amount || 0);
  const pct = Number(percentage || 0);
  return Number(((base * pct) / 100).toFixed(2));
};

module.exports = {
  resolveDefaultCommission,
  resolveShopCommission,
  calculateCommissionAmount,
};
