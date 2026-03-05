import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { ShopSubscription, SubscriptionPlan } from '../types/Subscription'
import type { UpdatePlanPatch } from '../store/types'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type PlanFeatureApi = {
  id?: string
  name?: string
  icon?: string | null
  description?: string | null
}

type PlanPricingApi = {
  monthlyPrice?: number
  yearlyPrice?: number
  freePeriodMonths?: number
}

type PlanLimitsApi = {
  maxProducts?: number
  maxOffers?: number
  maxImages?: number
  storageGb?: number
}

type PlanBenefitsApi = {
  priorityListing?: boolean
  analyticsAccess?: boolean
  apiAccess?: boolean
  dedicatedSupport?: boolean
}

type PlanApi = {
  id?: string
  _id?: string
  name?: string
  slug?: string
  description?: string | null
  pricing?: PlanPricingApi
  features?: PlanFeatureApi[]
  limits?: PlanLimitsApi
  benefits?: PlanBenefitsApi
  displayOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

type ShopSubscriptionApi = {
  id?: string
  _id?: string
  shopId?: string
  planId?: string
  startDate?: string
  endDate?: string
  status?: string
  autoRenew?: boolean
  createdAt?: string
  updatedAt?: string
}

type PlansPayload = {
  plans: PlanApi[]
}

type ShopSubscriptionsPayload = {
  subscriptions: ShopSubscriptionApi[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

const env = import.meta.env as Record<string, string | undefined>

const apiBaseUrl = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

const getAdminHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}

  const internalKey = getAdminAccessKey()
  if (internalKey) {
    headers['x-internal-key'] = internalKey
  }

  return headers
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message =
    (error.response?.data as { error?: { message?: string }; message?: string } | undefined)?.error?.message ||
    (error.response?.data as { message?: string } | undefined)?.message

  if (message) {
    return message
  }

  if (error.response?.status === 403) {
    return 'Admin access denied. Set VITE_INTERNAL_ADMIN_KEY in frontend env.'
  }

  return fallback
}

const toPlanName = (value: string | undefined): SubscriptionPlan['name'] => {
  const normalized = String(value || '').toUpperCase()

  if (normalized === 'BASIC' || normalized === 'PREMIUM' || normalized === 'PLATINUM') {
    return normalized
  }

  return 'BASIC'
}

const toPlan = (plan: PlanApi): SubscriptionPlan => {
  const price = Number(plan.pricing?.monthlyPrice || 0)
  const freeMonths = Number(plan.pricing?.freePeriodMonths || 1)
  const productLimit = Number(plan.limits?.maxProducts || 0)

  return {
    id: String(plan._id || plan.id || ''),
    name: toPlanName(plan.name),
    price,
    durationDays: Math.max(1, freeMonths * 30),
    productLimit: productLimit > 0 ? productLimit : null,
    priorityRank: Number(plan.displayOrder || 0),
    features: (plan.features || []).map((item) => String(item.name || '')).filter((item) => item.length > 0),
    isActive: Boolean(plan.isActive),
    createdAt: String(plan.createdAt || new Date().toISOString()),
    updatedAt: String(plan.updatedAt || plan.createdAt || new Date().toISOString()),
    slug: String(plan.slug || ''),
    description: plan.description ? String(plan.description) : null,
    pricing: {
      monthlyPrice: Number(plan.pricing?.monthlyPrice || 0),
      yearlyPrice: Number(plan.pricing?.yearlyPrice || 0),
      freePeriodMonths: Number(plan.pricing?.freePeriodMonths || 0),
    },
    limits: {
      maxProducts: Number(plan.limits?.maxProducts || 0),
      maxOffers: Number(plan.limits?.maxOffers || 0),
      maxImages: Number(plan.limits?.maxImages || 0),
      storageGb: Number(plan.limits?.storageGb || 0),
    },
    benefits: {
      priorityListing: Boolean(plan.benefits?.priorityListing),
      analyticsAccess: Boolean(plan.benefits?.analyticsAccess),
      apiAccess: Boolean(plan.benefits?.apiAccess),
      dedicatedSupport: Boolean(plan.benefits?.dedicatedSupport),
    },
    displayOrder: Number(plan.displayOrder || 0),
  }
}

const toSubscription = (item: ShopSubscriptionApi): ShopSubscription => ({
  id: String(item._id || item.id || ''),
  shopId: String(item.shopId || ''),
  planId: String(item.planId || ''),
  startDate: String(item.startDate || new Date().toISOString()),
  expiryDate: String(item.endDate || item.startDate || new Date().toISOString()),
  status: String(item.status || 'ACTIVE').toUpperCase() as ShopSubscription['status'],
  autoRenew: Boolean(item.autoRenew),
  createdAt: String(item.createdAt || new Date().toISOString()),
  updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
})

export const listAdminSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<PlansPayload>>('/api/admin/subscription-plans', {
      headers: getAdminHeaders(),
    })

    return (data?.data?.plans || []).map(toPlan)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load subscription plans.'))
  }
}

const buildUpdatePayload = (plan: SubscriptionPlan, patch: UpdatePlanPatch) => {
  const nextPrice = patch.price !== undefined ? Number(patch.price) : plan.price
  const nextDurationDays = patch.durationDays !== undefined ? Number(patch.durationDays) : plan.durationDays
  const nextProductLimit =
    patch.productLimit !== undefined ? (patch.productLimit === null ? null : Number(patch.productLimit)) : plan.productLimit
  const nextPriorityRank = patch.priorityRank !== undefined ? Number(patch.priorityRank) : plan.priorityRank
  const nextFeatures =
    patch.features !== undefined
      ? patch.features.map((item) => String(item).trim()).filter((item) => item.length > 0)
      : plan.features

  const monthlyPrice = nextPrice
  const yearlyPrice = nextPrice
  const freePeriodMonths = Math.max(0, Math.round(nextDurationDays / 30))

  const limits = plan.limits || {
    maxProducts: nextProductLimit ?? 0,
    maxOffers: 0,
    maxImages: 0,
    storageGb: 0,
  }

  const benefits = plan.benefits || {
    priorityListing: false,
    analyticsAccess: false,
    apiAccess: false,
    dedicatedSupport: false,
  }

  return {
    name: plan.name === 'FREE' ? 'BASIC' : plan.name,
    slug: plan.slug || plan.name.toLowerCase(),
    description: plan.description ?? null,
    pricing: {
      monthlyPrice,
      yearlyPrice,
      freePeriodMonths,
    },
    features: nextFeatures.map((name, index) => ({
      id: `feature-${index + 1}`,
      name,
      icon: null,
      description: null,
    })),
    limits: {
      maxProducts: nextProductLimit ?? Number(limits.maxProducts || 0),
      maxOffers: Number(limits.maxOffers || 0),
      maxImages: Number(limits.maxImages || 0),
      storageGb: Number(limits.storageGb || 0),
    },
    benefits: {
      priorityListing: Boolean(benefits.priorityListing),
      analyticsAccess: Boolean(benefits.analyticsAccess),
      apiAccess: Boolean(benefits.apiAccess),
      dedicatedSupport: Boolean(benefits.dedicatedSupport),
    },
    displayOrder: nextPriorityRank,
    isActive: plan.isActive,
  }
}

export const updateAdminSubscriptionPlan = async (plan: SubscriptionPlan, patch: UpdatePlanPatch): Promise<void> => {
  try {
    await http.put<ApiEnvelope<{ plan?: PlanApi }>>(`/api/admin/subscription-plans/${plan.id}`, buildUpdatePayload(plan, patch), {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update subscription plan.'))
  }
}

export const toggleAdminSubscriptionPlanActive = async (planId: string, isActive: boolean): Promise<void> => {
  try {
    await http.patch<ApiEnvelope<{ plan?: PlanApi }>>(
      `/api/admin/subscription-plans/${planId}/toggle-active`,
      { isActive },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update subscription plan status.'))
  }
}

export const listAdminShopSubscriptions = async (): Promise<ShopSubscription[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<ShopSubscriptionsPayload>>('/api/admin/subscriptions', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.subscriptions || []).map(toSubscription)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load shop subscriptions.'))
  }
}
