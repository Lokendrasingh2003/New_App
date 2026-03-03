export type SubscriptionPlanName = 'FREE' | 'BASIC' | 'PREMIUM'

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED'

export type SubscriptionPlan = {
  id: string
  name: SubscriptionPlanName
  price: number
  durationDays: number
  productLimit: number | null
  priorityRank: number
  features: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ShopSubscription = {
  id: string
  shopId: string
  planId: string
  startDate: string
  expiryDate: string
  status: SubscriptionStatus
  autoRenew: boolean
  createdAt: string
  updatedAt: string
}
