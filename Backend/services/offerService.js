const mongoose = require('mongoose');
const Offer = require('../models/Offer');
const { OFFER_PERCENT_MAX_OF_ORDER } = require('../config/constants');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeIdList = (input) => {
  if (Array.isArray(input)) {
    return input.map((item) => String(item)).filter((item) => mongoose.isValidObjectId(item));
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((item) => item.trim())
      .filter((item) => mongoose.isValidObjectId(item));
  }

  return [];
};

const normalizeTextList = (input) => {
  if (Array.isArray(input)) {
    return [...new Set(input.map((item) => String(item || '').trim()).filter((item) => item.length > 0))];
  }

  if (typeof input === 'string') {
    return [
      ...new Set(
        input
          .split(',')
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      ),
    ];
  }

  return [];
};

const dayCode = (date) => {
  const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  return map[new Date(date).getDay()] || 'SUN';
};

const minutesOfDay = (date) => {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
};

const parseTimeMinutes = (value) => {
  const [h, m] = String(value || '').split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) {
    return null;
  }

  return h * 60 + m;
};

const isWithinValidityWindow = (offer, at = new Date()) => {
  const ts = new Date(at).getTime();
  const start = new Date(offer.validity?.startsAt).getTime();
  const end = new Date(offer.validity?.endsAt).getTime();

  return ts >= start && ts <= end;
};

const isWithinConditionsWindow = (offer, at = new Date()) => {
  const days = Array.isArray(offer.conditions?.applicableDays) ? offer.conditions.applicableDays : [];
  if (days.length > 0 && !days.includes(dayCode(at))) {
    return false;
  }

  const from = parseTimeMinutes(offer.conditions?.applicableHours?.from);
  const to = parseTimeMinutes(offer.conditions?.applicableHours?.to);

  if (from !== null && to !== null) {
    const now = minutesOfDay(at);
    if (from >= to) {
      return false;
    }

    if (now < from || now > to) {
      return false;
    }
  }

  return true;
};

const isScopeApplicable = (offer, { categoryIds, productIds }) => {
  if (offer.scope === 'SHOP') {
    return true;
  }

  if (offer.scope === 'CATEGORIES') {
    const offerCategoryIds = new Set((offer.categoryIds || []).map((id) => String(id || '').trim().toLowerCase()));
    return categoryIds.some((id) => offerCategoryIds.has(String(id || '').trim().toLowerCase()));
  }

  if (offer.scope === 'PRODUCTS') {
    const offerProductIds = (offer.productIds || []).map((id) => String(id));
    return productIds.some((id) => offerProductIds.includes(String(id)));
  }

  return false;
};

const calculateOfferDiscount = (offer, cartTotal) => {
  const orderTotal = Math.max(0, toNumber(cartTotal, 0));
  if (orderTotal <= 0) {
    return 0;
  }

  let discount = 0;
  if (offer.type === 'PERCENT') {
    discount = orderTotal * (toNumber(offer.value, 0) / 100);
    const percentCap = orderTotal * (OFFER_PERCENT_MAX_OF_ORDER / 100);
    discount = Math.min(discount, percentCap);
  } else if (offer.type === 'FLAT') {
    discount = toNumber(offer.value, 0);
  }

  if (offer.conditions?.maxDiscount !== null && offer.conditions?.maxDiscount !== undefined) {
    discount = Math.min(discount, toNumber(offer.conditions.maxDiscount, 0));
  }

  discount = Math.min(discount, orderTotal);

  return Number(discount.toFixed(2));
};

const findApplicableOffers = async ({ cartTotal = 0, categoryIds = [], productIds = [], shopId, timestamp = new Date() }) => {
  const now = new Date(timestamp);

  const filter = {
    enabled: true,
    'validity.startsAt': { $lte: now },
    'validity.endsAt': { $gte: now },
  };

  if (shopId) {
    filter.shopId = shopId;
  }

  const offers = await Offer.find(filter).sort({ createdAt: -1 }).lean();

  return offers
    .filter((offer) => isWithinValidityWindow(offer, now))
    .filter((offer) => isWithinConditionsWindow(offer, now))
    .filter((offer) => toNumber(cartTotal, 0) >= toNumber(offer.conditions?.minOrderValue, 0))
    .filter((offer) => isScopeApplicable(offer, { categoryIds, productIds }))
    .map((offer) => ({
      ...offer,
      estimatedDiscount: calculateOfferDiscount(offer, cartTotal),
    }))
    .sort((a, b) => b.estimatedDiscount - a.estimatedDiscount);
};

const getBestApplicableOffer = async (input) => {
  const offers = await findApplicableOffers(input);

  if (!offers.length) {
    return null;
  }

  return offers[0];
};

const incrementOfferStats = async ({ offerId, discountAmount = 0 }) => {
  if (!offerId || !mongoose.isValidObjectId(String(offerId))) {
    return;
  }

  await Offer.updateOne(
    { _id: offerId },
    {
      $inc: {
        'stats.appliedCount': 1,
        'stats.totalDiscountGiven': Number(discountAmount || 0),
      },
    }
  );
};

module.exports = {
  normalizeIdList,
  normalizeTextList,
  calculateOfferDiscount,
  findApplicableOffers,
  getBestApplicableOffer,
  incrementOfferStats,
};
