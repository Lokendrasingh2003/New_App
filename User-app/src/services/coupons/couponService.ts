import { mockCoupons } from './mockCoupons';

export type AppliedCoupon = {
  code: string;
  discountAmount: number;
  freeDeliveryApplied: boolean;
  finalDeliveryCharge: number;
  finalTotal: number;
  reason: string;
  meta: {
    couponId: string;
    title: string;
    discountType: 'flat' | 'percent' | 'free_delivery';
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    cityId?: string;
  };
};

type ValidateParams = {
  code: string;
  subtotal: number;
  deliveryCharge: number;
  cityId?: string;
};

type SuccessResult = {
  ok: true;
  applied: AppliedCoupon;
};

type FailureResult = {
  ok: false;
  message: string;
};

export type ValidateCouponResult = SuccessResult | FailureResult;

const isExpired = (expiryDate: string) => new Date(expiryDate).getTime() < Date.now();

export function validateAndApplyCoupon({
  code,
  subtotal,
  deliveryCharge,
  cityId,
}: ValidateParams): ValidateCouponResult {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: 'Please enter coupon code.' };
  }

  const coupon = mockCoupons.find((item) => item.code.toUpperCase() === normalizedCode);

  if (!coupon) {
    return { ok: false, message: 'Coupon code not found.' };
  }

  if (!coupon.isActive) {
    return { ok: false, message: 'This coupon is not active right now.' };
  }

  if (isExpired(coupon.expiryDate)) {
    return { ok: false, message: 'This coupon has expired.' };
  }

  if (coupon.cityId && !cityId) {
    return { ok: false, message: 'Select your city to use this coupon.' };
  }

  if (coupon.cityId && cityId && coupon.cityId !== cityId) {
    return { ok: false, message: 'This coupon is not available in your city.' };
  }

  if (typeof coupon.minOrderValue === 'number' && subtotal < coupon.minOrderValue) {
    return {
      ok: false,
      message: `Minimum order ₹${coupon.minOrderValue} required for ${coupon.code}.`,
    };
  }

  let discountAmount = 0;
  let finalDeliveryCharge = Math.max(deliveryCharge, 0);
  let freeDeliveryApplied = false;

  if (coupon.discountType === 'flat') {
    discountAmount = Math.min(Math.max(coupon.discountValue, 0), Math.max(subtotal, 0));
  } else if (coupon.discountType === 'percent') {
    const rawDiscount = (Math.max(subtotal, 0) * coupon.discountValue) / 100;
    discountAmount =
      typeof coupon.maxDiscount === 'number'
        ? Math.min(rawDiscount, coupon.maxDiscount)
        : rawDiscount;

    discountAmount = Math.min(discountAmount, Math.max(subtotal, 0));
  } else if (coupon.discountType === 'free_delivery') {
    freeDeliveryApplied = true;
    discountAmount = 0;
    finalDeliveryCharge = 0;
  }

  discountAmount = Math.max(0, Math.round(discountAmount));

  const finalTotal = Math.max(Math.round(subtotal + finalDeliveryCharge - discountAmount), 0);

  return {
    ok: true,
    applied: {
      code: coupon.code,
      discountAmount,
      freeDeliveryApplied,
      finalDeliveryCharge,
      finalTotal,
      reason: freeDeliveryApplied ? 'Free delivery applied' : 'Coupon discount applied',
      meta: {
        couponId: coupon.id,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscount: coupon.maxDiscount,
        cityId: coupon.cityId,
      },
    },
  };
}
