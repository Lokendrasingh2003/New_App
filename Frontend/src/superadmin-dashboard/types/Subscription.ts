export type SubscriptionPlanName = 'FREE' | 'BASIC' | 'PREMIUM' | 'PLATINUM'

export type SubscriptionPlanPricing = {
  monthlyPrice: number
  yearlyPrice: number
  freePeriodMonths: number
}

export type SubscriptionPlanLimits = {
  maxProducts: number
  maxOffers: number
  maxImages: number
  storageGb: number
}

export type SubscriptionPlanBenefits = {
  priorityListing: boolean
  analyticsAccess: boolean
  apiAccess: boolean
  dedicatedSupport: boolean
}

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
  slug?: string
  description?: string | null
  pricing?: SubscriptionPlanPricing
  limits?: SubscriptionPlanLimits
  benefits?: SubscriptionPlanBenefits
  displayOrder?: number
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
