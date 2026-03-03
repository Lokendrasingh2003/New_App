import type { ShopSubscription, SubscriptionStatus } from '../../types/Subscription'
import { shopsSeed } from './shops.seed'

const eligibleShops = shopsSeed.filter((shop) => shop.status === 'approved' || shop.status === 'reactivated')

const planIds = ['plan_free', 'plan_basic', 'plan_premium'] as const

const dateByOffset = (daysOffset: number) => {
  const date = new Date('2026-03-01T00:00:00.000Z')
  date.setUTCDate(date.getUTCDate() + daysOffset)
  return date.toISOString()
}

const statusByIndex = (index: number): SubscriptionStatus => {
  if (index % 7 === 0) {
    return 'EXPIRED'
  }

  if (index % 11 === 0) {
    return 'CANCELLED'
  }

  return 'ACTIVE'
}

export const shopSubscriptionsSeed: ShopSubscription[] = eligibleShops.map((shop, index) => {
  const status = statusByIndex(index)
  const planId = planIds[index % planIds.length]

  const startDate = dateByOffset(-(20 + (index % 35)))
  const expiryDate =
    status === 'EXPIRED'
      ? dateByOffset(-(1 + (index % 12)))
      : status === 'CANCELLED'
        ? dateByOffset(25 + (index % 20))
        : index % 4 === 0
          ? dateByOffset(1 + (index % 15))
          : dateByOffset(20 + (index % 45))

  return {
    id: `shop_sub_${String(index + 1).padStart(4, '0')}`,
    shopId: shop.id,
    planId,
    startDate,
    expiryDate,
    status,
    autoRenew: status === 'ACTIVE' ? index % 3 !== 0 : false,
    createdAt: startDate,
    updatedAt: dateByOffset(index % 6),
  }
})
