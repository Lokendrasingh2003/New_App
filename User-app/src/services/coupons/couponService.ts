import { apiRequest } from '../api/httpClient';

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

type CouponValidationPayload = {
  valid?: boolean;
  discount?: number;
  message?: string;
};

export async function validateAndApplyCoupon({
  code,
  subtotal,
  deliveryCharge,
  cityId,
  shopId,
}: ValidateParams & { shopId?: string }): Promise<ValidateCouponResult> {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: 'Please enter coupon code.' };
  }

  try {
    const response = await apiRequest<CouponValidationPayload>('/api/coupons/validate', {
      method: 'GET',
      query: {
        code: normalizedCode,
        cartTotal: subtotal,
        cityId,
        shopId,
      },
    });

    if (!response.valid) {
      return { ok: false, message: response.message || 'Coupon is not valid.' };
    }

    const discountAmount = Math.max(0, Math.round(Number(response.discount || 0)));
    const finalDeliveryCharge = Math.max(deliveryCharge, 0);
    const finalTotal = Math.max(Math.round(subtotal + finalDeliveryCharge - discountAmount), 0);

    return {
      ok: true,
      applied: {
        code: normalizedCode,
        discountAmount,
        freeDeliveryApplied: false,
        finalDeliveryCharge,
        finalTotal,
        reason: response.message || 'Coupon discount applied',
        meta: {
          couponId: normalizedCode,
          title: normalizedCode,
          discountType: 'flat',
          discountValue: discountAmount,
          cityId,
        },
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unable to validate coupon.',
    };
  }
}
