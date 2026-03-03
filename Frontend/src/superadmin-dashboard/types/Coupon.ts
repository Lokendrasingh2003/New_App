export type CouponDiscountType = 'FLAT' | 'PERCENT' | 'FREE_DELIVERY'

export type CouponScopeType = 'GLOBAL' | 'CITY' | 'CATEGORY' | 'SHOP'

export type CouponScope = {
  type: CouponScopeType
  cityId?: string
  categoryId?: string
  shopId?: string
}

export type Coupon = {
  id: string
  code: string
  discountType: CouponDiscountType
  discountValue?: number
  maxDiscount?: number | null
  minOrderValue?: number | null
  validFrom: string
  validTo: string
  usageLimitGlobal?: number | null
  usageLimitPerUser?: number | null
  scope: CouponScope
  isActive: boolean
  createdAt: string
  updatedAt: string
}
