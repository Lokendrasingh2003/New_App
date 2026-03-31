const {
  CART_TAX_RATE,
  CART_COUPON_MAX_DISCOUNT_PERCENT,
  FREE_DELIVERY_MIN_ORDER,
  CART_EXPIRY_DAYS,
  OFFER_PERCENT_MAX_OF_ORDER,
} = require('../config/constants');

const toFixed2 = (value) => Number(Number(value || 0).toFixed(2));

const computeSubtotal = (items) => {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
};

const computeOfferDiscount = (appliedOffer, subtotal) => {
  if (!appliedOffer || !appliedOffer.type || Number(appliedOffer.value || 0) <= 0) {
    return 0;
  }

  let rawDiscount = 0;
  let cap = subtotal;

  if (appliedOffer.type === 'PERCENT') {
    rawDiscount = subtotal * (Number(appliedOffer.value || 0) / 100);
    cap = subtotal * (OFFER_PERCENT_MAX_OF_ORDER / 100);
  } else if (appliedOffer.type === 'FLAT') {
    rawDiscount = Number(appliedOffer.value || 0);
    cap = subtotal;
  }

  if (appliedOffer.maxDiscount !== null && appliedOffer.maxDiscount !== undefined) {
    cap = Math.min(cap, Number(appliedOffer.maxDiscount || 0));
  }

  return Math.max(0, Math.min(rawDiscount, cap));
};

const computeCouponDiscount = (coupon, subtotal, baseDiscount) => {
  if (!coupon || !coupon.discountType) {
    return 0;
  }

  const remainingSubtotal = Math.max(subtotal - baseDiscount, 0);

  let raw = 0;
  if (coupon.discountType === 'PERCENT') {
    raw = remainingSubtotal * (Number(coupon.discountValue || 0) / 100);
  } else if (coupon.discountType === 'FLAT') {
    raw = Number(coupon.discountValue || 0);
  } else if (coupon.discountType === 'FREE_DELIVERY') {
    raw = 0;
  }

  const parsedMaxDiscount =
    coupon.maxDiscount !== null && coupon.maxDiscount !== undefined ? Number(coupon.maxDiscount) : null;

  // Legacy coupons may have maxDiscount = 0. Treat non-positive values as no cap.
  if (parsedMaxDiscount !== null && Number.isFinite(parsedMaxDiscount) && parsedMaxDiscount > 0) {
    raw = Math.min(raw, parsedMaxDiscount);
  }

  const couponCap = subtotal * (CART_COUPON_MAX_DISCOUNT_PERCENT / 100);

  return Math.max(0, Math.min(raw, couponCap));
};

const computeDeliveryCharge = (shop, subtotal, coupon) => {
  if (!shop) {
    return 0;
  }

  const baseCharge = Number(shop.delivery?.chargeAmount || 0);

  if (coupon?.discountType === 'FREE_DELIVERY' && subtotal >= Number(coupon.minOrderValue || 0)) {
    return 0;
  }

  if (subtotal >= FREE_DELIVERY_MIN_ORDER) {
    return 0;
  }

  return Math.max(0, baseCharge);
};

const recalculateCartTotals = ({ cart, shop, coupon }) => {
  const subtotal = computeSubtotal(cart.items || []);
  const offerDiscount = computeOfferDiscount(cart.appliedOffer, subtotal);
  const couponDiscount = computeCouponDiscount(coupon, subtotal, offerDiscount);
  const discount = offerDiscount + couponDiscount;

  const deliveryCharge = computeDeliveryCharge(shop, subtotal, coupon);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = taxableAmount * CART_TAX_RATE;
  const total = taxableAmount + deliveryCharge + tax;

  cart.subtotal = toFixed2(subtotal);
  cart.discount = toFixed2(discount);
  cart.deliveryCharge = toFixed2(deliveryCharge);
  cart.tax = toFixed2(tax);
  cart.total = toFixed2(total);

  if (coupon) {
    cart.appliedCoupon = {
      couponId: String(coupon._id),
      code: coupon.code,
      discountAmount: toFixed2(couponDiscount),
    };
  }

  if (cart.appliedOffer && cart.appliedOffer.offerId) {
    cart.appliedOffer.discountAmount = toFixed2(offerDiscount);
  }

  cart.expiresAt = new Date(Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  return cart;
};

module.exports = {
  recalculateCartTotals,
};
