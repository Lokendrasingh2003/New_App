import type { Coupon, CouponDiscountType, CouponScopeType } from '../../types/Coupon'
import { categoriesSeed } from './categories.seed'
import { citiesSeed } from './cities.seed'
import { shopsSeed } from './shops.seed'

const DISCOUNT_TYPES: CouponDiscountType[] = ['FLAT', 'PERCENT', 'FREE_DELIVERY']
const SCOPE_TYPES: CouponScopeType[] = ['GLOBAL', 'CITY', 'CATEGORY', 'SHOP']

const validFromByIndex = (index: number) => {
  if (index % 6 === 0) {
    return `2025-01-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`
  }

  return `2026-03-${String((index % 28) + 1).padStart(2, '0')}T09:00:00.000Z`
}

const validToByIndex = (index: number) => {
  if (index % 6 === 0) {
    return `2025-02-${String((index % 28) + 1).padStart(2, '0')}T23:59:00.000Z`
  }

  return `2026-12-${String((index % 28) + 1).padStart(2, '0')}T23:59:00.000Z`
}

const scopeByIndex = (index: number) => {
  const type = SCOPE_TYPES[index % SCOPE_TYPES.length]

  if (type === 'CITY') {
    return {
      type,
      cityId: citiesSeed[index % citiesSeed.length]?.id,
    }
  }

  if (type === 'CATEGORY') {
    return {
      type,
      categoryId: categoriesSeed[index % categoriesSeed.length]?.id,
    }
  }

  if (type === 'SHOP') {
    return {
      type,
      shopId: shopsSeed[index % shopsSeed.length]?.id,
    }
  }

  return { type }
}

export const couponsSeed: Coupon[] = Array.from({ length: 30 }, (_, index) => {
  const discountType = DISCOUNT_TYPES[index % DISCOUNT_TYPES.length]
  const scope = scopeByIndex(index)

  const codeBase = `CPN${String(index + 1).padStart(2, '0')}`
  const code = `${codeBase}${index % 2 === 0 ? 'A' : 'B'}`

  return {
    id: `coupon_${String(index + 1).padStart(4, '0')}`,
    code,
    discountType,
    discountValue: discountType === 'FREE_DELIVERY' ? undefined : discountType === 'FLAT' ? 40 + (index % 6) * 15 : 5 + (index % 8) * 5,
    maxDiscount: discountType === 'PERCENT' ? 100 + (index % 5) * 50 : null,
    minOrderValue: index % 4 === 0 ? null : 199 + (index % 6) * 100,
    validFrom: validFromByIndex(index),
    validTo: validToByIndex(index),
    usageLimitGlobal: index % 5 === 0 ? null : 100 + index * 10,
    usageLimitPerUser: index % 3 === 0 ? 1 : 2,
    scope,
    isActive: index % 7 !== 0,
    createdAt: `2026-02-${String((index % 28) + 1).padStart(2, '0')}T08:00:00.000Z`,
    updatedAt: `2026-03-${String((index % 28) + 1).padStart(2, '0')}T10:00:00.000Z`,
  }
})
