import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  CC_PUBLISHED_CATEGORIES_KEY,
  CC_PUBLISHED_META_KEY,
  SA_AUDIT_KEY,
  SA_CATEGORIES_KEY,
  SA_CITIES_KEY,
  SA_COUPONS_KEY,
  SA_COMMISSION_KEY,
  SA_CONFIG_KEY,
  SA_ORDERS_KEY,
  SA_PAYOUT_LOGS_KEY,
  SA_PAYOUTS_KEY,
  SA_PAYMENTS_KEY,
  SA_PLANS_KEY,
  SA_REFUND_LOGS_KEY,
  SA_REFUNDS_KEY,
  SA_SHOP_SUBSCRIPTIONS_KEY,
  SA_SHOPS_KEY,
} from '../app/storageKeys'
import { auditSeed } from '../data/seed/audit.seed'
import { categoriesSeed } from '../data/seed/categories.seed'
import { citiesSeed } from '../data/seed/cities.seed'
import { couponsSeed } from '../data/seed/coupons.seed'
import { commissionSeed } from '../data/seed/commission.seed'
import { configSeed } from '../data/seed/config.seed'
import { ordersSeed } from '../data/seed/orders.seed'
import { payoutLogsSeed } from '../data/seed/payoutLogs.seed'
import { payoutsSeed } from '../data/seed/payouts.seed'
import { paymentsSeed } from '../data/seed/payments.seed'
import { plansSeed } from '../data/seed/plans.seed'
import { refundLogsSeed } from '../data/seed/refundLogs.seed'
import { refundsSeed } from '../data/seed/refunds.seed'
import { shopSubscriptionsSeed } from '../data/seed/shopSubscriptions.seed'
import { shopsSeed } from '../data/seed/shops.seed'
import { SYSTEM_RESET } from '../app/auditEventTypes'
import { getLoggedInUsername } from '../auth/authStore'
import type { AuditEvent, AuditEventMeta, AuditEventType } from '../types/AuditEvent'
import type { Category } from '../types/Category'
import type { Coupon, CouponDiscountType, CouponScope } from '../types/Coupon'
import type {
  CommissionConfig,
  CommissionScope,
} from '../types/CommissionConfig'
import type { City } from '../types/City'
import type { Order, OrderStatus, PaymentStatus } from '../types/Order'
import type { Payment, PaymentStatus as GatewayPaymentStatus } from '../types/Payment'
import type { PayoutLogEntry, PayoutRequest, PayoutRequestStatus } from '../types/Payout'
import type { RefundLogEntry, RefundRecord, RefundStatus } from '../types/Refund'
import type { Shop, ShopStatus } from '../types/shop'
import type { ShopSubscription, SubscriptionPlan, SubscriptionStatus } from '../types/Subscription'
import type { SystemConfig } from '../types/SystemConfig'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import type {
  ActionResult,
  CategoryUpdatePatch,
  CityUpsertInput,
  CreateCouponInput,
  CreateRefundInput,
  SuperAdminStoreContextValue,
  UpdateCouponPatch,
  UpdatePlanPatch,
} from './types'

const STORAGE_WARNING_MESSAGE = 'Could not save locally. Changes may reset on refresh.'

const seedCities: City[] = citiesSeed
const seedCategories: Category[] = categoriesSeed
const seedCoupons: Coupon[] = couponsSeed
const seedShops: Shop[] = shopsSeed
const seedOrders: Order[] = ordersSeed
const seedPayments: Payment[] = paymentsSeed
const seedPayoutRequests: PayoutRequest[] = payoutsSeed
const seedPayoutLogs: PayoutLogEntry[] = payoutLogsSeed
const seedRefunds: RefundRecord[] = refundsSeed
const seedRefundLogs: RefundLogEntry[] = refundLogsSeed
const seedPlans: SubscriptionPlan[] = plansSeed
const seedShopSubscriptions: ShopSubscription[] = shopSubscriptionsSeed
const seedConfig: SystemConfig[] = configSeed
const seedCommission: CommissionConfig = commissionSeed
const seedAuditEvents: AuditEvent[] = auditSeed
const MIN_SUBCATEGORIES = 5
const MAX_SUBCATEGORIES = 8
const MAX_SHOP_SLUG_LENGTH = 25
const BOOLEAN_CONFIG_KEYS = new Set(['maintenance_mode', 'launch_offer_enabled'])
const COUPON_CODE_REGEX = /^[A-Z0-9]{4,12}$/

const SuperAdminStoreContext = createContext<SuperAdminStoreContextValue | null>(null)

type SuperAdminStoreProviderProps = {
  children: ReactNode
}

const nowIso = () => new Date().toISOString()

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const sanitizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const sanitizeShopSlug = (value: string) => sanitizeSlug(value).slice(0, MAX_SHOP_SLUG_LENGTH)

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ')

const normalizeCity = (city: City & { commissionOverride?: number }): City => ({
  ...city,
  commissionOverridePercentage: city.commissionOverridePercentage ?? city.commissionOverride ?? null,
})

const normalizeCategory = (category: Category & { active?: boolean }): Category => ({
  ...category,
  isActive: category.isActive ?? category.active ?? true,
  subcategories: Array.isArray(category.subcategories)
    ? category.subcategories.map((sub) => String(sub).trim()).filter((sub) => sub.length > 0)
    : [],
})

const normalizeOrder = (
  order: Order & {
    statusLogs?: Array<{ status: string; at: string; note?: string }>
  },
): Order => {
  const fallbackLog = {
    status: order.status,
    at: order.updatedAt ?? order.createdAt,
  }

  const normalizedLogs = Array.isArray(order.statusLogs)
    ? order.statusLogs
        .map((log) => ({
          status: String(log.status) as OrderStatus,
          at: String(log.at),
          note: log.note,
        }))
        .filter((log) => Boolean(log.status) && Boolean(log.at))
    : []

  return {
    ...order,
    statusLogs: normalizedLogs.length > 0 ? normalizedLogs : [fallbackLog],
  }
}

const normalizeCommission = (value: CommissionConfig): CommissionConfig => {
  const normalizePercentage = (input: number) => {
    const parsed = Number(input)
    if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
      return 0
    }

    return Math.max(0, Math.min(100, parsed))
  }

  return {
    defaultPercentage: normalizePercentage(value.defaultPercentage),
    cityOverrides: Array.isArray(value.cityOverrides)
      ? value.cityOverrides.map((item) => ({
          cityId: item.cityId,
          percentage: normalizePercentage(item.percentage),
          updatedAt: item.updatedAt,
        }))
      : [],
    categoryOverrides: Array.isArray(value.categoryOverrides)
      ? value.categoryOverrides.map((item) => ({
          categoryId: item.categoryId,
          percentage: normalizePercentage(item.percentage),
          updatedAt: item.updatedAt,
        }))
      : [],
    shopOverrides: Array.isArray(value.shopOverrides)
      ? value.shopOverrides.map((item) => ({
          shopId: item.shopId,
          percentage: normalizePercentage(item.percentage),
          updatedAt: item.updatedAt,
        }))
      : [],
    updatedAt: value.updatedAt ?? nowIso(),
  }
}

const normalizeCouponCode = (value: string) => value.toUpperCase().replace(/\s+/g, '').trim()

const normalizeCoupon = (coupon: Coupon): Coupon => ({
  ...coupon,
  code: normalizeCouponCode(coupon.code),
  discountValue:
    coupon.discountType === 'FREE_DELIVERY'
      ? undefined
      : coupon.discountValue !== undefined && coupon.discountValue !== null
        ? Number(coupon.discountValue)
        : undefined,
  maxDiscount: coupon.maxDiscount === undefined ? null : coupon.maxDiscount,
  minOrderValue: coupon.minOrderValue === undefined ? null : coupon.minOrderValue,
  usageLimitGlobal: coupon.usageLimitGlobal === undefined ? null : coupon.usageLimitGlobal,
  usageLimitPerUser: coupon.usageLimitPerUser === undefined ? null : coupon.usageLimitPerUser,
  scope: {
    type: coupon.scope.type,
    cityId: coupon.scope.cityId,
    categoryId: coupon.scope.categoryId,
    shopId: coupon.scope.shopId,
  },
})

const normalizePlan = (plan: SubscriptionPlan): SubscriptionPlan => ({
  ...plan,
  price: Number(plan.price),
  durationDays: Number(plan.durationDays),
  productLimit: plan.productLimit === null ? null : Number(plan.productLimit),
  priorityRank: Number(plan.priorityRank),
  features: Array.isArray(plan.features)
    ? plan.features.map((item) => normalizeName(String(item))).filter((item) => item.length > 0)
    : [],
})

const normalizeShopSubscription = (subscription: ShopSubscription): ShopSubscription => {
  const status: SubscriptionStatus = ['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(subscription.status)
    ? subscription.status
    : 'ACTIVE'

  return {
    ...subscription,
    status,
    autoRenew: Boolean(subscription.autoRenew),
  }
}

const isValidPercentage = (value: number) => Number.isFinite(value) && !Number.isNaN(value) && value >= 0 && value <= 100

const PAYMENT_VERIFY_FAILURE_REASONS = [
  'Gateway verification timed out',
  'Gateway signature mismatch on retry',
  'Bank verification rejected',
]

const deterministicScore = (value: string) => {
  return value.split('').reduce((sum, character, index) => sum + character.charCodeAt(0) * (index + 1), 0)
}

const ensureRequiredConfigKeys = (items: SystemConfig[]) => {
  const map = new Map(items.map((item) => [item.key, item]))

  seedConfig.forEach((seedItem) => {
    if (!map.has(seedItem.key)) {
      map.set(seedItem.key, seedItem)
    }
  })

  return Array.from(map.values())
}

const defaultSubcategoriesForCategory = (categoryName: string): string[] => {
  const baseName = normalizeName(categoryName)
  return [
    `${baseName} Essentials`,
    `${baseName} Premium`,
    `${baseName} Budget Picks`,
    `${baseName} New Arrivals`,
    `${baseName} Best Sellers`,
  ]
}

const validateCityInput = (
  input: CityUpsertInput,
  cities: City[],
  cityIdToIgnore?: string,
): { error?: string; normalized: CityUpsertInput } => {
  const normalizedNameValue = normalizeName(input.name)
  const normalizedSlugValue = sanitizeSlug(input.slug || slugify(normalizedNameValue))
  const commissionValue =
    input.commissionOverridePercentage === undefined || input.commissionOverridePercentage === null
      ? null
      : Number(input.commissionOverridePercentage)

  const normalized: CityUpsertInput = {
    name: normalizedNameValue,
    slug: normalizedSlugValue,
    isActive: input.isActive,
    deliveryEnabled: input.deliveryEnabled,
    commissionOverridePercentage: commissionValue,
  }

  if (!normalizedNameValue) {
    return { error: 'City name is required.', normalized }
  }

  if (!normalizedSlugValue) {
    return { error: 'Slug is required.', normalized }
  }

  const lowerName = normalizedNameValue.toLowerCase()
  const lowerSlug = normalizedSlugValue.toLowerCase()

  const duplicateName = cities.some(
    (city) => city.id !== cityIdToIgnore && city.name.toLowerCase() === lowerName,
  )

  if (duplicateName) {
    return { error: 'City name must be unique.', normalized }
  }

  const duplicateSlug = cities.some(
    (city) => city.id !== cityIdToIgnore && city.slug.toLowerCase() === lowerSlug,
  )

  if (duplicateSlug) {
    return { error: 'City slug must be unique.', normalized }
  }

  if (
    commissionValue !== null &&
    (!Number.isFinite(commissionValue) || Number.isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100)
  ) {
    return { error: 'Commission override must be between 0 and 100.', normalized }
  }

  return { normalized }
}

const normalizeAuditEvent = (event: AuditEvent): AuditEvent => ({
  id: event.id,
  type: String(event.type),
  message: String(event.message),
  actor: {
    type: 'SUPERADMIN',
    username:
      event.actor?.username && String(event.actor.username).trim().length > 0
        ? String(event.actor.username)
        : 'admin',
  },
  createdAt: event.createdAt,
  meta: event.meta,
})

const buildAuditEvent = (type: AuditEventType, message: string, username: string, meta?: AuditEventMeta): AuditEvent => {
  const timestamp = nowIso()

  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    actor: {
      type: 'SUPERADMIN',
      username,
    },
    createdAt: timestamp,
    ...(meta ? { meta } : {}),
  }
}

const buildPayoutLogEntry = (
  payoutRequestId: string,
  action: 'CREATED' | 'APPROVED' | 'REJECTED' | 'COMPLETED',
  at: string,
  note?: string,
): PayoutLogEntry => ({
  id: `payout_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  payoutRequestId,
  action,
  note,
  at,
})

const validateCouponInput = (
  input: CreateCouponInput,
  context: {
    coupons: Coupon[]
    cities: City[]
    categories: Category[]
    shops: Shop[]
  },
  couponIdToIgnore?: string,
): { error?: string; normalized?: CreateCouponInput } => {
  const code = normalizeCouponCode(input.code)
  if (!code) {
    return { error: 'Coupon code is required.' }
  }

  if (!COUPON_CODE_REGEX.test(code)) {
    return { error: 'Code must be 4-12 chars, uppercase letters/numbers only.' }
  }

  const duplicateCode = context.coupons.some(
    (coupon) => coupon.id !== couponIdToIgnore && coupon.code.toLowerCase() === code.toLowerCase(),
  )

  if (duplicateCode) {
    return { error: 'Coupon code must be unique.' }
  }

  const validFromTimestamp = new Date(input.validFrom).getTime()
  const validToTimestamp = new Date(input.validTo).getTime()

  if (!Number.isFinite(validFromTimestamp) || Number.isNaN(validFromTimestamp)) {
    return { error: 'Valid From date-time is invalid.' }
  }

  if (!Number.isFinite(validToTimestamp) || Number.isNaN(validToTimestamp)) {
    return { error: 'Valid To date-time is invalid.' }
  }

  if (validToTimestamp <= validFromTimestamp) {
    return { error: 'Valid To must be after Valid From.' }
  }

  const discountType: CouponDiscountType = input.discountType
  const discountValue =
    input.discountValue === undefined || input.discountValue === null ? undefined : Number(input.discountValue)

  if (discountType === 'FLAT') {
    if (!discountValue || !Number.isFinite(discountValue) || discountValue <= 0) {
      return { error: 'Flat discount value must be greater than 0.' }
    }
  }

  if (discountType === 'PERCENT') {
    if (!discountValue || !Number.isFinite(discountValue) || discountValue < 1 || discountValue > 90) {
      return { error: 'Percent discount must be between 1 and 90.' }
    }

    const maxDiscount = Number(input.maxDiscount)
    if (!Number.isFinite(maxDiscount) || Number.isNaN(maxDiscount) || maxDiscount <= 0) {
      return { error: 'Max discount is required for percent coupons.' }
    }
  }

  if (discountType === 'FREE_DELIVERY') {
    if (input.discountValue !== undefined && input.discountValue !== null) {
      return { error: 'Discount value must be empty for free delivery coupons.' }
    }
  }

  const minOrderValue =
    input.minOrderValue === undefined || input.minOrderValue === null ? null : Number(input.minOrderValue)
  if (minOrderValue !== null && (!Number.isFinite(minOrderValue) || Number.isNaN(minOrderValue) || minOrderValue < 0)) {
    return { error: 'Min order value must be 0 or greater.' }
  }

  const usageLimitGlobal =
    input.usageLimitGlobal === undefined || input.usageLimitGlobal === null ? null : Number(input.usageLimitGlobal)
  if (
    usageLimitGlobal !== null &&
    (!Number.isInteger(usageLimitGlobal) || Number.isNaN(usageLimitGlobal) || usageLimitGlobal <= 0)
  ) {
    return { error: 'Global usage limit must be a positive integer.' }
  }

  const usageLimitPerUser =
    input.usageLimitPerUser === undefined || input.usageLimitPerUser === null ? null : Number(input.usageLimitPerUser)
  if (
    usageLimitPerUser !== null &&
    (!Number.isInteger(usageLimitPerUser) || Number.isNaN(usageLimitPerUser) || usageLimitPerUser <= 0)
  ) {
    return { error: 'Per-user usage limit must be a positive integer.' }
  }

  const scope: CouponScope = {
    type: input.scope.type,
    cityId: input.scope.cityId,
    categoryId: input.scope.categoryId,
    shopId: input.scope.shopId,
  }

  if (scope.type === 'CITY') {
    if (!scope.cityId) {
      return { error: 'City is required for CITY scope.' }
    }

    if (!context.cities.some((city) => city.id === scope.cityId)) {
      return { error: 'Selected city does not exist.' }
    }
  }

  if (scope.type === 'CATEGORY') {
    if (!scope.categoryId) {
      return { error: 'Category is required for CATEGORY scope.' }
    }

    if (!context.categories.some((category) => category.id === scope.categoryId)) {
      return { error: 'Selected category does not exist.' }
    }
  }

  if (scope.type === 'SHOP') {
    if (!scope.shopId) {
      return { error: 'Shop is required for SHOP scope.' }
    }

    if (!context.shops.some((shop) => shop.id === scope.shopId)) {
      return { error: 'Selected shop does not exist.' }
    }
  }

  const normalized: CreateCouponInput = {
    code,
    discountType,
    discountValue: discountType === 'FREE_DELIVERY' ? undefined : discountValue,
    maxDiscount:
      discountType === 'PERCENT' ? Number(input.maxDiscount) : input.maxDiscount === undefined ? null : input.maxDiscount,
    minOrderValue,
    validFrom: input.validFrom,
    validTo: input.validTo,
    usageLimitGlobal,
    usageLimitPerUser,
    scope: {
      type: scope.type,
      cityId: scope.type === 'CITY' ? scope.cityId : undefined,
      categoryId: scope.type === 'CATEGORY' ? scope.categoryId : undefined,
      shopId: scope.type === 'SHOP' ? scope.shopId : undefined,
    },
    isActive: input.isActive,
  }

  return { normalized }
}

const buildRefundLogEntry = (
  refundId: string,
  action: 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  at: string,
  note?: string,
): RefundLogEntry => ({
  id: `refund_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  refundId,
  action,
  note,
  at,
})

export const SuperAdminStoreProvider = ({ children }: SuperAdminStoreProviderProps) => {
  const { showWarning } = useAppSnackbar()

  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([])
  const [payoutLogs, setPayoutLogs] = useState<PayoutLogEntry[]>([])
  const [refunds, setRefunds] = useState<RefundRecord[]>([])
  const [refundLogs, setRefundLogs] = useState<RefundLogEntry[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [shopSubscriptions, setShopSubscriptions] = useState<ShopSubscription[]>([])
  const [config, setConfig] = useState<SystemConfig[]>([])
  const [commission, setCommission] = useState<CommissionConfig>(seedCommission)
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [initialized, setInitialized] = useState(false)
  const [lastError, setLastError] = useState<string | undefined>(undefined)

  const persist = useCallback(
    <T,>(key: string, value: T) => {
      const result = saveToStorage(key, value)

      if (!result.ok) {
        setLastError(result.error)
        showWarning(STORAGE_WARNING_MESSAGE)
      }
    },
    [showWarning],
  )

  const pushAuditEvent = useCallback(
    (type: AuditEventType, message: string, meta?: AuditEventMeta) => {
      try {
        const username = getLoggedInUsername()
        setAuditEvents((previous) => {
          const next = [...previous, buildAuditEvent(type, message, username, meta)].slice(-200)
          persist(SA_AUDIT_KEY, next)
          return next
        })
      } catch {
        showWarning(STORAGE_WARNING_MESSAGE)
      }
    },
    [persist, showWarning],
  )

  const initializeFromStorageOrSeed = useCallback(() => {
    const loadedCities = loadFromStorage<City[]>(SA_CITIES_KEY, seedCities).map((city) =>
      normalizeCity(city as City & { commissionOverride?: number }),
    )
    const loadedCategories = loadFromStorage<Category[]>(SA_CATEGORIES_KEY, seedCategories).map((category) =>
      normalizeCategory(category as Category & { active?: boolean }),
    )
    const loadedShops = loadFromStorage<Shop[]>(SA_SHOPS_KEY, seedShops)
    const loadedOrders = loadFromStorage<Order[]>(SA_ORDERS_KEY, seedOrders).map((order) =>
      normalizeOrder(order as Order & { statusLogs?: Array<{ status: string; at: string; note?: string }> }),
    )
    const loadedPayments = loadFromStorage<Payment[]>(SA_PAYMENTS_KEY, seedPayments)
    const loadedPayoutRequests = loadFromStorage<PayoutRequest[]>(SA_PAYOUTS_KEY, seedPayoutRequests)
    const loadedPayoutLogs = loadFromStorage<PayoutLogEntry[]>(SA_PAYOUT_LOGS_KEY, seedPayoutLogs)
    const loadedRefunds = loadFromStorage<RefundRecord[]>(SA_REFUNDS_KEY, seedRefunds)
    const loadedRefundLogs = loadFromStorage<RefundLogEntry[]>(SA_REFUND_LOGS_KEY, seedRefundLogs)
    const loadedCoupons = loadFromStorage<Coupon[]>(SA_COUPONS_KEY, seedCoupons).map((coupon) => normalizeCoupon(coupon))
    const loadedPlans = loadFromStorage<SubscriptionPlan[]>(SA_PLANS_KEY, seedPlans).map((plan) => normalizePlan(plan))
    const loadedShopSubscriptions = loadFromStorage<ShopSubscription[]>(
      SA_SHOP_SUBSCRIPTIONS_KEY,
      seedShopSubscriptions,
    ).map((subscription) => normalizeShopSubscription(subscription))
    const loadedConfig = ensureRequiredConfigKeys(loadFromStorage<SystemConfig[]>(SA_CONFIG_KEY, seedConfig))
    const loadedCommission = normalizeCommission(loadFromStorage<CommissionConfig>(SA_COMMISSION_KEY, seedCommission))
    const loadedAuditEvents = loadFromStorage<AuditEvent[]>(SA_AUDIT_KEY, seedAuditEvents)
      .map((event) => normalizeAuditEvent(event))
      .slice(-200)

    setCities(loadedCities)
    setCategories(loadedCategories)
    setShops(loadedShops)
    setOrders(loadedOrders)
    setPayments(loadedPayments)
    setPayoutRequests(loadedPayoutRequests)
    setPayoutLogs(loadedPayoutLogs)
    setRefunds(loadedRefunds)
    setRefundLogs(loadedRefundLogs)
    setCoupons(loadedCoupons)
    setPlans(loadedPlans)
    setShopSubscriptions(loadedShopSubscriptions)
    setConfig(loadedConfig)
    setCommission(loadedCommission)
    setAuditEvents(loadedAuditEvents)

    persist(SA_CITIES_KEY, loadedCities)
    persist(SA_CATEGORIES_KEY, loadedCategories)
    persist(SA_SHOPS_KEY, loadedShops)
    persist(SA_ORDERS_KEY, loadedOrders)
    persist(SA_PAYMENTS_KEY, loadedPayments)
    persist(SA_PAYOUTS_KEY, loadedPayoutRequests)
    persist(SA_PAYOUT_LOGS_KEY, loadedPayoutLogs)
    persist(SA_REFUNDS_KEY, loadedRefunds)
    persist(SA_REFUND_LOGS_KEY, loadedRefundLogs)
    persist(SA_COUPONS_KEY, loadedCoupons)
    persist(SA_PLANS_KEY, loadedPlans)
    persist(SA_SHOP_SUBSCRIPTIONS_KEY, loadedShopSubscriptions)
    persist(SA_CONFIG_KEY, loadedConfig)
    persist(SA_COMMISSION_KEY, loadedCommission)
    persist(SA_AUDIT_KEY, loadedAuditEvents)

    setLastError(undefined)
    setInitialized(true)
  }, [persist])

  const resetAllDemoData = useCallback(() => {
    try {
      localStorage.removeItem(SA_CITIES_KEY)
      localStorage.removeItem(SA_CATEGORIES_KEY)
      localStorage.removeItem(SA_SHOPS_KEY)
      localStorage.removeItem(SA_ORDERS_KEY)
      localStorage.removeItem(SA_PAYMENTS_KEY)
      localStorage.removeItem(SA_PAYOUTS_KEY)
      localStorage.removeItem(SA_PAYOUT_LOGS_KEY)
      localStorage.removeItem(SA_REFUNDS_KEY)
      localStorage.removeItem(SA_REFUND_LOGS_KEY)
      localStorage.removeItem(SA_COUPONS_KEY)
      localStorage.removeItem(SA_PLANS_KEY)
      localStorage.removeItem(SA_SHOP_SUBSCRIPTIONS_KEY)
      localStorage.removeItem(SA_CONFIG_KEY)
      localStorage.removeItem(SA_COMMISSION_KEY)
      localStorage.removeItem(SA_AUDIT_KEY)
      localStorage.removeItem(CC_PUBLISHED_CATEGORIES_KEY)
      localStorage.removeItem(CC_PUBLISHED_META_KEY)
    } catch {
      showWarning(STORAGE_WARNING_MESSAGE)
    }

    setCities(seedCities)
    setCategories(seedCategories)
    setShops(seedShops)
    setOrders(seedOrders)
    setPayments(seedPayments)
    setPayoutRequests(seedPayoutRequests)
    setPayoutLogs(seedPayoutLogs)
    setRefunds(seedRefunds)
    setRefundLogs(seedRefundLogs)
    setCoupons(seedCoupons)
    setPlans(seedPlans)
    setShopSubscriptions(seedShopSubscriptions)
    setConfig(seedConfig)
    setCommission(seedCommission)

    setAuditEvents(seedAuditEvents)

    persist(SA_CITIES_KEY, seedCities)
    persist(SA_CATEGORIES_KEY, seedCategories)
    persist(SA_SHOPS_KEY, seedShops)
    persist(SA_ORDERS_KEY, seedOrders)
    persist(SA_PAYMENTS_KEY, seedPayments)
    persist(SA_PAYOUTS_KEY, seedPayoutRequests)
    persist(SA_PAYOUT_LOGS_KEY, seedPayoutLogs)
    persist(SA_REFUNDS_KEY, seedRefunds)
    persist(SA_REFUND_LOGS_KEY, seedRefundLogs)
    persist(SA_COUPONS_KEY, seedCoupons)
    persist(SA_PLANS_KEY, seedPlans)
    persist(SA_SHOP_SUBSCRIPTIONS_KEY, seedShopSubscriptions)
    persist(SA_CONFIG_KEY, seedConfig)
    persist(SA_COMMISSION_KEY, seedCommission)
    persist(SA_AUDIT_KEY, seedAuditEvents)
    pushAuditEvent(SYSTEM_RESET, 'System reset to demo seed data')
  }, [persist, pushAuditEvent, showWarning])

  const appendAuditEvent = useCallback(
    (type: AuditEventType, message: string, meta?: AuditEventMeta) => {
      pushAuditEvent(type, message, meta)
    },
    [pushAuditEvent],
  )

  const clearAuditEvents = useCallback((): ActionResult => {
    try {
      setAuditEvents([])
      persist(SA_AUDIT_KEY, [])
      return { ok: true }
    } catch {
      showWarning(STORAGE_WARNING_MESSAGE)
      return { ok: false, error: STORAGE_WARNING_MESSAGE }
    }
  }, [persist, showWarning])

  const addCity = useCallback(
    (input: CityUpsertInput): ActionResult => {
      const validation = validateCityInput(input, cities)

      if (validation.error) {
        return { ok: false, error: validation.error }
      }

      const timestamp = nowIso()
      const city: City = {
        id: `city_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: validation.normalized.name,
        slug: validation.normalized.slug,
        isActive: validation.normalized.isActive,
        deliveryEnabled: validation.normalized.deliveryEnabled,
        commissionOverridePercentage: validation.normalized.commissionOverridePercentage ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setCities((previous) => {
        const next = [...previous, city]
        persist(SA_CITIES_KEY, next)
        return next
      })

      pushAuditEvent('CITY_CREATED', `City created: ${city.name}`)
      return { ok: true }
    },
    [cities, persist, pushAuditEvent],
  )

  const updateCity = useCallback(
    (cityId: string, patch: Partial<CityUpsertInput>): ActionResult => {
      const currentCity = cities.find((city) => city.id === cityId)

      if (!currentCity) {
        return { ok: false, error: 'City not found.' }
      }

      const mergedInput: CityUpsertInput = {
        name: patch.name ?? currentCity.name,
        slug: patch.slug ?? currentCity.slug,
        isActive: patch.isActive ?? currentCity.isActive,
        deliveryEnabled: patch.deliveryEnabled ?? currentCity.deliveryEnabled,
        commissionOverridePercentage:
          patch.commissionOverridePercentage !== undefined
            ? patch.commissionOverridePercentage
            : currentCity.commissionOverridePercentage ?? null,
      }

      const validation = validateCityInput(mergedInput, cities, cityId)

      if (validation.error) {
        return { ok: false, error: validation.error }
      }

      const timestamp = nowIso()

      setCities((previous) => {
        const next = previous.map((city) =>
          city.id === cityId
            ? {
                ...city,
                name: validation.normalized.name,
                slug: validation.normalized.slug,
                isActive: validation.normalized.isActive,
                deliveryEnabled: validation.normalized.deliveryEnabled,
                commissionOverridePercentage: validation.normalized.commissionOverridePercentage ?? null,
                updatedAt: timestamp,
              }
            : city,
        )

        persist(SA_CITIES_KEY, next)
        return next
      })

      pushAuditEvent('CITY_UPDATED', `City updated: ${validation.normalized.name}`)
      return { ok: true }
    },
    [cities, persist, pushAuditEvent],
  )

  const toggleCityActive = useCallback(
    (cityId: string): ActionResult => {
      const currentCity = cities.find((city) => city.id === cityId)

      if (!currentCity) {
        return { ok: false, error: 'City not found.' }
      }

      const nextIsActive = !currentCity.isActive

      setCities((previous) => {
        const next = previous.map((city) =>
          city.id === cityId
            ? {
                ...city,
                isActive: nextIsActive,
                updatedAt: nowIso(),
              }
            : city,
        )

        persist(SA_CITIES_KEY, next)
        return next
      })

      pushAuditEvent(
        'CITY_TOGGLED_ACTIVE',
        `City ${nextIsActive ? 'activated' : 'deactivated'}: ${currentCity.name}`,
      )

      return { ok: true }
    },
    [cities, persist, pushAuditEvent],
  )

  const toggleCityDelivery = useCallback(
    (cityId: string): ActionResult => {
      const currentCity = cities.find((city) => city.id === cityId)

      if (!currentCity) {
        return { ok: false, error: 'City not found.' }
      }

      const nextDeliveryEnabled = !currentCity.deliveryEnabled

      setCities((previous) => {
        const next = previous.map((city) =>
          city.id === cityId
            ? {
                ...city,
                deliveryEnabled: nextDeliveryEnabled,
                updatedAt: nowIso(),
              }
            : city,
        )

        persist(SA_CITIES_KEY, next)
        return next
      })

      pushAuditEvent(
        'CITY_TOGGLED_DELIVERY',
        `City delivery ${nextDeliveryEnabled ? 'enabled' : 'disabled'}: ${currentCity.name}`,
      )

      return { ok: true }
    },
    [cities, persist, pushAuditEvent],
  )

  const addCategory = useCallback(
    (name: string): ActionResult => {
      const normalizedName = normalizeName(name)

      if (!normalizedName) {
        return { ok: false, error: 'Category name is required.' }
      }

      const lowerName = normalizedName.toLowerCase()
      const duplicateName = categories.some((category) => category.name.toLowerCase() === lowerName)
      if (duplicateName) {
        return { ok: false, error: 'Category name must be unique.' }
      }

      const slug = slugify(normalizedName)
      if (!slug) {
        return { ok: false, error: 'Category slug is invalid.' }
      }

      const duplicateSlug = categories.some((category) => category.slug.toLowerCase() === slug.toLowerCase())
      if (duplicateSlug) {
        return { ok: false, error: 'Category slug must be unique.' }
      }

      const timestamp = nowIso()
      const category: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: normalizedName,
        slug,
        isActive: true,
        subcategories: defaultSubcategoriesForCategory(normalizedName),
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setCategories((previous) => {
        const next = [...previous, category]
        persist(SA_CATEGORIES_KEY, next)
        return next
      })

      pushAuditEvent('CATEGORY_CREATED', `Category created: ${category.name}`)
      return { ok: true }
    },
    [categories, persist, pushAuditEvent],
  )

  const updateCategory = useCallback(
    (categoryId: string, patch: CategoryUpdatePatch): ActionResult => {
      const currentCategory = categories.find((category) => category.id === categoryId)

      if (!currentCategory) {
        return { ok: false, error: 'Category not found.' }
      }

      const nextName = patch.name !== undefined ? normalizeName(patch.name) : currentCategory.name

      if (!nextName) {
        return { ok: false, error: 'Category name is required.' }
      }

      const nextSlug = slugify(nextName)
      if (!nextSlug) {
        return { ok: false, error: 'Category slug is invalid.' }
      }

      const duplicateName = categories.some(
        (category) => category.id !== categoryId && category.name.toLowerCase() === nextName.toLowerCase(),
      )
      if (duplicateName) {
        return { ok: false, error: 'Category name must be unique.' }
      }

      const duplicateSlug = categories.some(
        (category) => category.id !== categoryId && category.slug.toLowerCase() === nextSlug.toLowerCase(),
      )
      if (duplicateSlug) {
        return { ok: false, error: 'Category slug must be unique.' }
      }

      const nextIsActive = patch.isActive ?? currentCategory.isActive
      const timestamp = nowIso()

      setCategories((previous) => {
        const next = previous.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                name: nextName,
                slug: nextSlug,
                isActive: nextIsActive,
                updatedAt: timestamp,
              }
            : category,
        )

        persist(SA_CATEGORIES_KEY, next)
        return next
      })

      if (patch.isActive !== undefined && patch.isActive !== currentCategory.isActive) {
        pushAuditEvent(
          'CATEGORY_TOGGLED_ACTIVE',
          `Category ${nextIsActive ? 'activated' : 'deactivated'}: ${nextName}`,
        )
      } else {
        pushAuditEvent('CATEGORY_UPDATED', `Category updated: ${nextName}`)
      }

      return { ok: true }
    },
    [categories, persist, pushAuditEvent],
  )

  const addSubcategory = useCallback(
    (categoryId: string, name: string): ActionResult => {
      const currentCategory = categories.find((category) => category.id === categoryId)

      if (!currentCategory) {
        return { ok: false, error: 'Category not found.' }
      }

      const normalizedSubcategory = normalizeName(name)
      if (!normalizedSubcategory) {
        return { ok: false, error: 'Subcategory name is required.' }
      }

      if (currentCategory.subcategories.length >= MAX_SUBCATEGORIES) {
        return { ok: false, error: `Maximum ${MAX_SUBCATEGORIES} subcategories allowed.` }
      }

      const duplicate = currentCategory.subcategories.some(
        (subcategory) => subcategory.toLowerCase() === normalizedSubcategory.toLowerCase(),
      )
      if (duplicate) {
        return { ok: false, error: 'Subcategory must be unique in this category.' }
      }

      const timestamp = nowIso()
      setCategories((previous) => {
        const next = previous.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: [...category.subcategories, normalizedSubcategory],
                updatedAt: timestamp,
              }
            : category,
        )

        persist(SA_CATEGORIES_KEY, next)
        return next
      })

      pushAuditEvent('SUBCATEGORY_ADDED', `Subcategory added to ${currentCategory.name}: ${normalizedSubcategory}`)
      return { ok: true }
    },
    [categories, persist, pushAuditEvent],
  )

  const removeSubcategory = useCallback(
    (categoryId: string, name: string): ActionResult => {
      const currentCategory = categories.find((category) => category.id === categoryId)

      if (!currentCategory) {
        return { ok: false, error: 'Category not found.' }
      }

      if (currentCategory.subcategories.length <= MIN_SUBCATEGORIES) {
        return { ok: false, error: `At least ${MIN_SUBCATEGORIES} subcategories are required.` }
      }

      const exists = currentCategory.subcategories.some((subcategory) => subcategory === name)
      if (!exists) {
        return { ok: false, error: 'Subcategory not found.' }
      }

      const timestamp = nowIso()
      setCategories((previous) => {
        const next = previous.map((category) =>
          category.id === categoryId
            ? {
                ...category,
                subcategories: category.subcategories.filter((subcategory) => subcategory !== name),
                updatedAt: timestamp,
              }
            : category,
        )

        persist(SA_CATEGORIES_KEY, next)
        return next
      })

      pushAuditEvent('SUBCATEGORY_REMOVED', `Subcategory removed from ${currentCategory.name}: ${name}`)
      return { ok: true }
    },
    [categories, persist, pushAuditEvent],
  )

  const getCategoryBySlug = useCallback(
    (slug: string) => categories.find((category) => category.slug.toLowerCase() === slug.toLowerCase()),
    [categories],
  )

  const getCategoryById = useCallback(
    (id: string) => categories.find((category) => category.id === id),
    [categories],
  )

  const publishCategories = useCallback((): ActionResult => {
    const activeCategories = categories.filter((category) => category.isActive)

    if (activeCategories.length < 5) {
      return { ok: false, error: 'At least 5 active categories are required before publish.' }
    }

    const invalidCategories = activeCategories.filter(
      (category) => category.subcategories.length < MIN_SUBCATEGORIES || category.subcategories.length > MAX_SUBCATEGORIES,
    )

    if (invalidCategories.length > 0) {
      const details = invalidCategories
        .map((category) => `${category.name} (${category.subcategories.length})`)
        .join(', ')
      return {
        ok: false,
        error: `Active categories must have ${MIN_SUBCATEGORIES}-${MAX_SUBCATEGORIES} subcategories. Invalid: ${details}.`,
      }
    }

    const publishedAt = nowIso()
    const categoriesResult = saveToStorage(CC_PUBLISHED_CATEGORIES_KEY, activeCategories)
    const metaResult = saveToStorage(CC_PUBLISHED_META_KEY, { publishedAt })

    if (!categoriesResult.ok || !metaResult.ok) {
      const message = categoriesResult.error ?? metaResult.error ?? STORAGE_WARNING_MESSAGE
      setLastError(message)
      showWarning(STORAGE_WARNING_MESSAGE)
      return { ok: false, error: 'Could not publish categories to local storage.' }
    }

    pushAuditEvent('CATEGORY_PUBLISHED', `Published ${activeCategories.length} active categories`)
    return { ok: true }
  }, [categories, pushAuditEvent, showWarning])

  const approveShop = useCallback(
    (shopId: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'pending_approval') {
        return { ok: false, error: 'Only pending approval shops can be approved.' }
      }

      const approvedStatus: ShopStatus = 'approved'

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                status: approvedStatus,
                isPublic: true,
                rejectReason: undefined,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent('SHOP_APPROVED', `Shop approved: ${currentShop.shopName}`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const rejectShop = useCallback(
    (shopId: string, reason: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'pending_approval') {
        return { ok: false, error: 'Only pending approval shops can be rejected.' }
      }

      const normalizedReason = normalizeName(reason)
      if (!normalizedReason) {
        return { ok: false, error: 'Rejection reason is required.' }
      }

      const rejectedStatus: ShopStatus = 'rejected'

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                status: rejectedStatus,
                isPublic: false,
                rejectReason: normalizedReason,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent('SHOP_REJECTED', `Shop rejected: ${currentShop.shopName} (${normalizedReason})`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const suspendShop = useCallback(
    (shopId: string, reasonOptional?: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'approved' && currentShop.status !== 'reactivated') {
        return { ok: false, error: 'Only approved/reactivated shops can be suspended.' }
      }

      const normalizedReason = reasonOptional ? normalizeName(reasonOptional) : undefined
      const suspendedStatus: ShopStatus = 'suspended'

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                status: suspendedStatus,
                isPublic: false,
                rejectReason: normalizedReason,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent(
        'SHOP_SUSPENDED',
        `Shop suspended: ${currentShop.shopName}${normalizedReason ? ` (${normalizedReason})` : ''}`,
      )
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const reactivateShop = useCallback(
    (shopId: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'suspended') {
        return { ok: false, error: 'Only suspended shops can be reactivated.' }
      }

      const reactivatedStatus: ShopStatus = 'reactivated'

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                status: reactivatedStatus,
                isPublic: true,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent('SHOP_REACTIVATED', `Shop reactivated: ${currentShop.shopName}`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const toggleShopPublic = useCallback(
    (shopId: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'approved' && currentShop.status !== 'reactivated') {
        return { ok: false, error: 'Public visibility can be changed only for approved/reactivated shops.' }
      }

      const nextPublic = !currentShop.isPublic

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                isPublic: nextPublic,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent('SHOP_PUBLIC_TOGGLED', `Shop public toggled (${nextPublic ? 'public' : 'private'}): ${currentShop.shopName}`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const updateShopSlug = useCallback(
    (shopId: string, slug: string): ActionResult => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      const normalizedSlug = sanitizeShopSlug(slug)

      if (!normalizedSlug) {
        return { ok: false, error: 'Slug is required.' }
      }

      if (normalizedSlug.length > MAX_SHOP_SLUG_LENGTH) {
        return { ok: false, error: `Slug must be at most ${MAX_SHOP_SLUG_LENGTH} characters.` }
      }

      const duplicate = shops.some(
        (shop) => shop.id !== shopId && shop.slug.toLowerCase() === normalizedSlug.toLowerCase(),
      )

      if (duplicate) {
        return { ok: false, error: 'Slug must be unique.' }
      }

      setShops((previous) => {
        const next = previous.map((shop) =>
          shop.id === shopId
            ? {
                ...shop,
                slug: normalizedSlug,
                updatedAt: nowIso(),
              }
            : shop,
        )

        persist(SA_SHOPS_KEY, next)
        return next
      })

      pushAuditEvent('SHOP_SLUG_UPDATED', `Shop slug updated: ${currentShop.shopName} -> ${normalizedSlug}`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const forceCancelOrder = useCallback(
    (orderId: string, reason: string): ActionResult => {
      const currentOrder = orders.find((order) => order.id === orderId)

      if (!currentOrder) {
        return { ok: false, error: 'Order not found.' }
      }

      const normalizedReason = normalizeName(reason)
      if (normalizedReason.length < 5) {
        return { ok: false, error: 'Reason must be at least 5 characters.' }
      }

      if (currentOrder.status === 'delivered' || currentOrder.status === 'refunded') {
        return { ok: false, error: 'Delivered or refunded orders cannot be force cancelled.' }
      }

      const timestamp = nowIso()
      const cancelledStatus: OrderStatus = 'cancelled'

      setOrders((previous) => {
        const next = previous.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: cancelledStatus,
                updatedAt: timestamp,
                statusLogs: [
                  ...order.statusLogs,
                  {
                    status: cancelledStatus,
                    at: timestamp,
                    note: normalizedReason,
                  },
                ],
              }
            : order,
        )

        persist(SA_ORDERS_KEY, next)
        return next
      })

      pushAuditEvent('ORDER_FORCE_CANCELLED', `Order force-cancelled: ${orderId} (${normalizedReason})`)
      return { ok: true }
    },
    [orders, persist, pushAuditEvent],
  )

  const triggerRefund = useCallback(
    (orderId: string): ActionResult => {
      const currentOrder = orders.find((order) => order.id === orderId)

      if (!currentOrder) {
        return { ok: false, error: 'Order not found.' }
      }

      if (!(currentOrder.status === 'cancelled' && currentOrder.paymentStatus === 'success')) {
        return { ok: false, error: 'Refund is allowed only for cancelled orders with successful payment.' }
      }

      const timestamp = nowIso()
      const refundedStatus: OrderStatus = 'refunded'
      const refundedPaymentStatus: PaymentStatus = 'refunded'

      setOrders((previous) => {
        const next = previous.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: refundedStatus,
                paymentStatus: refundedPaymentStatus,
                updatedAt: timestamp,
                statusLogs: [
                  ...order.statusLogs,
                  {
                    status: refundedStatus,
                    at: timestamp,
                  },
                ],
              }
            : order,
        )

        persist(SA_ORDERS_KEY, next)
        return next
      })

      pushAuditEvent('ORDER_REFUND_TRIGGERED', `Refund triggered for order: ${orderId}`)
      return { ok: true }
    },
    [orders, persist, pushAuditEvent],
  )

  const getOrderById = useCallback(
    (orderId: string) => orders.find((order) => order.id === orderId),
    [orders],
  )

  const retryVerifyPayment = useCallback(
    (paymentId: string): ActionResult => {
      const currentPayment = payments.find((payment) => payment.id === paymentId)

      if (!currentPayment) {
        return { ok: false, error: 'Payment not found.' }
      }

      if (currentPayment.status !== 'PENDING' && currentPayment.status !== 'FAILED') {
        return { ok: false, error: 'Retry is allowed only for pending or failed payments.' }
      }

      const timestamp = nowIso()
      const score = deterministicScore(currentPayment.id)

      let nextStatus: GatewayPaymentStatus = currentPayment.status
      let failureReason: string | undefined = currentPayment.failureReason

      if (currentPayment.status === 'PENDING') {
        const succeeds = score % 10 < 7
        nextStatus = succeeds ? 'SUCCESS' : 'FAILED'
        failureReason = succeeds ? undefined : PAYMENT_VERIFY_FAILURE_REASONS[score % PAYMENT_VERIFY_FAILURE_REASONS.length]
      } else {
        const moveToPending = score % 2 === 0
        nextStatus = moveToPending ? 'PENDING' : 'FAILED'
        failureReason = moveToPending ? undefined : PAYMENT_VERIFY_FAILURE_REASONS[(score + 1) % PAYMENT_VERIFY_FAILURE_REASONS.length]
      }

      setPayments((previous) => {
        const next = previous.map((payment) =>
          payment.id === paymentId
            ? {
                ...payment,
                status: nextStatus,
                failureReason,
                updatedAt: timestamp,
              }
            : payment,
        )

        persist(SA_PAYMENTS_KEY, next)
        return next
      })

      pushAuditEvent('PAYMENT_VERIFY_RETRIED', `Payment verify retried: ${paymentId} -> ${nextStatus}`)
      return { ok: true }
    },
    [payments, persist, pushAuditEvent],
  )

  const getPaymentById = useCallback(
    (id: string) => payments.find((payment) => payment.id === id),
    [payments],
  )

  const approvePayout = useCallback(
    (payoutRequestId: string): ActionResult => {
      const currentRequest = payoutRequests.find((request) => request.id === payoutRequestId)

      if (!currentRequest) {
        return { ok: false, error: 'Payout request not found.' }
      }

      if (currentRequest.status !== 'PENDING') {
        return { ok: false, error: 'Only pending payout requests can be approved.' }
      }

      const timestamp = nowIso()
      const approvedStatus: PayoutRequestStatus = 'APPROVED'

      setPayoutRequests((previous) => {
        const next = previous.map((request) =>
          request.id === payoutRequestId
            ? {
                ...request,
                status: approvedStatus,
                processedAt: timestamp,
                rejectReason: undefined,
              }
            : request,
        )

        persist(SA_PAYOUTS_KEY, next)
        return next
      })

      setPayoutLogs((previous) => {
        const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'APPROVED', timestamp)]
        persist(SA_PAYOUT_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('PAYOUT_APPROVED', `Payout approved: ${payoutRequestId}`)
      return { ok: true }
    },
    [payoutRequests, persist, pushAuditEvent],
  )

  const rejectPayout = useCallback(
    (payoutRequestId: string, reason: string): ActionResult => {
      const currentRequest = payoutRequests.find((request) => request.id === payoutRequestId)

      if (!currentRequest) {
        return { ok: false, error: 'Payout request not found.' }
      }

      if (currentRequest.status !== 'PENDING') {
        return { ok: false, error: 'Only pending payout requests can be rejected.' }
      }

      const normalizedReason = normalizeName(reason)
      if (!normalizedReason) {
        return { ok: false, error: 'Reject reason is required.' }
      }

      const timestamp = nowIso()
      const rejectedStatus: PayoutRequestStatus = 'REJECTED'

      setPayoutRequests((previous) => {
        const next = previous.map((request) =>
          request.id === payoutRequestId
            ? {
                ...request,
                status: rejectedStatus,
                processedAt: timestamp,
                rejectReason: normalizedReason,
              }
            : request,
        )

        persist(SA_PAYOUTS_KEY, next)
        return next
      })

      setPayoutLogs((previous) => {
        const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'REJECTED', timestamp, normalizedReason)]
        persist(SA_PAYOUT_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('PAYOUT_REJECTED', `Payout rejected: ${payoutRequestId} (${normalizedReason})`)
      return { ok: true }
    },
    [payoutRequests, persist, pushAuditEvent],
  )

  const completePayout = useCallback(
    (payoutRequestId: string): ActionResult => {
      const currentRequest = payoutRequests.find((request) => request.id === payoutRequestId)

      if (!currentRequest) {
        return { ok: false, error: 'Payout request not found.' }
      }

      if (currentRequest.status !== 'APPROVED') {
        return { ok: false, error: 'Only approved payout requests can be marked completed.' }
      }

      const timestamp = nowIso()
      const completedStatus: PayoutRequestStatus = 'COMPLETED'

      setPayoutRequests((previous) => {
        const next = previous.map((request) =>
          request.id === payoutRequestId
            ? {
                ...request,
                status: completedStatus,
                processedAt: timestamp,
              }
            : request,
        )

        persist(SA_PAYOUTS_KEY, next)
        return next
      })

      setPayoutLogs((previous) => {
        const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'COMPLETED', timestamp)]
        persist(SA_PAYOUT_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('PAYOUT_COMPLETED', `Payout completed: ${payoutRequestId}`)
      return { ok: true }
    },
    [payoutRequests, persist, pushAuditEvent],
  )

  const getLogsForPayout = useCallback(
    (payoutRequestId: string) =>
      payoutLogs
        .filter((entry) => entry.payoutRequestId === payoutRequestId)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [payoutLogs],
  )

  const createRefund = useCallback(
    (input: CreateRefundInput): ActionResult => {
      const orderId = input.orderId.trim()
      const paymentId = input.paymentId.trim()
      const reason = normalizeName(input.reason)

      if (!orderId) {
        return { ok: false, error: 'Order ID is required.' }
      }

      if (!paymentId) {
        return { ok: false, error: 'Payment ID is required.' }
      }

      if (reason.length < 5) {
        return { ok: false, error: 'Reason must be at least 5 characters.' }
      }

      const order = orders.find((item) => item.id === orderId)
      const payment = payments.find((item) => item.id === paymentId)

      const cityId = order?.cityId ?? payment?.cityId
      const shopId = order?.shopId ?? payment?.shopId

      if (!cityId || !shopId) {
        return { ok: false, error: 'Order/payment mapping not found for city and shop.' }
      }

      const fallbackAmount =
        input.amount !== undefined && input.amount !== null ? Number(input.amount) : undefined

      const computedAmount = payment?.amount ?? order?.total ?? fallbackAmount

      if (!computedAmount || !Number.isFinite(computedAmount) || Number.isNaN(computedAmount) || computedAmount <= 0) {
        return { ok: false, error: 'Refund amount is invalid. Provide a valid amount.' }
      }

      const timestamp = nowIso()
      const requestedStatus: RefundStatus = 'REQUESTED'
      const refund: RefundRecord = {
        id: `refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        orderId,
        paymentId,
        cityId,
        shopId,
        amount: computedAmount,
        status: requestedStatus,
        reason,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setRefunds((previous) => {
        const next = [refund, ...previous]
        persist(SA_REFUNDS_KEY, next)
        return next
      })

      setRefundLogs((previous) => {
        const next = [...previous, buildRefundLogEntry(refund.id, 'CREATED', timestamp, reason)]
        persist(SA_REFUND_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('REFUND_CREATED', `Refund created: ${refund.id}`)
      return { ok: true }
    },
    [orders, payments, persist, pushAuditEvent],
  )

  const setRefundProcessing = useCallback(
    (refundId: string): ActionResult => {
      const currentRefund = refunds.find((item) => item.id === refundId)

      if (!currentRefund) {
        return { ok: false, error: 'Refund not found.' }
      }

      if (currentRefund.status !== 'REQUESTED') {
        return { ok: false, error: 'Only requested refunds can move to processing.' }
      }

      const timestamp = nowIso()
      const processingStatus: RefundStatus = 'PROCESSING'

      setRefunds((previous) => {
        const next = previous.map((item) =>
          item.id === refundId
            ? {
                ...item,
                status: processingStatus,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_REFUNDS_KEY, next)
        return next
      })

      setRefundLogs((previous) => {
        const next = [...previous, buildRefundLogEntry(refundId, 'PROCESSING', timestamp)]
        persist(SA_REFUND_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('REFUND_PROCESSING', `Refund moved to processing: ${refundId}`)
      return { ok: true }
    },
    [refunds, persist, pushAuditEvent],
  )

  const completeRefund = useCallback(
    (refundId: string): ActionResult => {
      const currentRefund = refunds.find((item) => item.id === refundId)

      if (!currentRefund) {
        return { ok: false, error: 'Refund not found.' }
      }

      if (currentRefund.status !== 'PROCESSING') {
        return { ok: false, error: 'Only processing refunds can be completed.' }
      }

      const timestamp = nowIso()
      const completedStatus: RefundStatus = 'COMPLETED'

      setRefunds((previous) => {
        const next = previous.map((item) =>
          item.id === refundId
            ? {
                ...item,
                status: completedStatus,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_REFUNDS_KEY, next)
        return next
      })

      setRefundLogs((previous) => {
        const next = [...previous, buildRefundLogEntry(refundId, 'COMPLETED', timestamp)]
        persist(SA_REFUND_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('REFUND_COMPLETED', `Refund completed: ${refundId}`)
      return { ok: true }
    },
    [refunds, persist, pushAuditEvent],
  )

  const failRefund = useCallback(
    (refundId: string, note: string): ActionResult => {
      const currentRefund = refunds.find((item) => item.id === refundId)

      if (!currentRefund) {
        return { ok: false, error: 'Refund not found.' }
      }

      if (currentRefund.status !== 'PROCESSING') {
        return { ok: false, error: 'Only processing refunds can be marked failed.' }
      }

      const normalizedNote = normalizeName(note)
      if (!normalizedNote) {
        return { ok: false, error: 'Failure note is required.' }
      }

      const timestamp = nowIso()
      const failedStatus: RefundStatus = 'FAILED'

      setRefunds((previous) => {
        const next = previous.map((item) =>
          item.id === refundId
            ? {
                ...item,
                status: failedStatus,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_REFUNDS_KEY, next)
        return next
      })

      setRefundLogs((previous) => {
        const next = [...previous, buildRefundLogEntry(refundId, 'FAILED', timestamp, normalizedNote)]
        persist(SA_REFUND_LOGS_KEY, next)
        return next
      })

      pushAuditEvent('REFUND_FAILED', `Refund failed: ${refundId} (${normalizedNote})`)
      return { ok: true }
    },
    [refunds, persist, pushAuditEvent],
  )

  const getRefundById = useCallback(
    (refundId: string) => refunds.find((item) => item.id === refundId),
    [refunds],
  )

  const getLogsForRefund = useCallback(
    (refundId: string) =>
      refundLogs
        .filter((entry) => entry.refundId === refundId)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [refundLogs],
  )

  const createCoupon = useCallback(
    (input: CreateCouponInput): ActionResult => {
      const validation = validateCouponInput(
        input,
        {
          coupons,
          cities,
          categories,
          shops,
        },
      )

      if (validation.error || !validation.normalized) {
        return { ok: false, error: validation.error ?? 'Coupon validation failed.' }
      }

      const timestamp = nowIso()
      const coupon: Coupon = {
        id: `coupon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ...validation.normalized,
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setCoupons((previous) => {
        const next = [coupon, ...previous]
        persist(SA_COUPONS_KEY, next)
        return next
      })

      pushAuditEvent('COUPON_CREATED', `Coupon created: ${coupon.code}`)
      return { ok: true }
    },
    [categories, cities, coupons, persist, pushAuditEvent, shops],
  )

  const updateCoupon = useCallback(
    (couponId: string, patch: UpdateCouponPatch): ActionResult => {
      const currentCoupon = coupons.find((item) => item.id === couponId)

      if (!currentCoupon) {
        return { ok: false, error: 'Coupon not found.' }
      }

      const mergedInput: CreateCouponInput = {
        code: patch.code ?? currentCoupon.code,
        discountType: patch.discountType ?? currentCoupon.discountType,
        discountValue: patch.discountValue !== undefined ? patch.discountValue : currentCoupon.discountValue,
        maxDiscount: patch.maxDiscount !== undefined ? patch.maxDiscount : currentCoupon.maxDiscount,
        minOrderValue: patch.minOrderValue !== undefined ? patch.minOrderValue : currentCoupon.minOrderValue,
        validFrom: patch.validFrom ?? currentCoupon.validFrom,
        validTo: patch.validTo ?? currentCoupon.validTo,
        usageLimitGlobal:
          patch.usageLimitGlobal !== undefined ? patch.usageLimitGlobal : currentCoupon.usageLimitGlobal,
        usageLimitPerUser:
          patch.usageLimitPerUser !== undefined ? patch.usageLimitPerUser : currentCoupon.usageLimitPerUser,
        scope: {
          type: patch.scope?.type ?? currentCoupon.scope.type,
          cityId: patch.scope?.cityId !== undefined ? patch.scope.cityId : currentCoupon.scope.cityId,
          categoryId:
            patch.scope?.categoryId !== undefined ? patch.scope.categoryId : currentCoupon.scope.categoryId,
          shopId: patch.scope?.shopId !== undefined ? patch.scope.shopId : currentCoupon.scope.shopId,
        },
        isActive: patch.isActive ?? currentCoupon.isActive,
      }

      const validation = validateCouponInput(
        mergedInput,
        {
          coupons,
          cities,
          categories,
          shops,
        },
        couponId,
      )

      if (validation.error || !validation.normalized) {
        return { ok: false, error: validation.error ?? 'Coupon validation failed.' }
      }

      const timestamp = nowIso()

      setCoupons((previous) => {
        const next = previous.map((item) =>
          item.id === couponId
            ? {
                ...item,
                ...validation.normalized,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_COUPONS_KEY, next)
        return next
      })

      pushAuditEvent('COUPON_UPDATED', `Coupon updated: ${validation.normalized.code}`)
      return { ok: true }
    },
    [categories, cities, coupons, persist, pushAuditEvent, shops],
  )

  const toggleCouponActive = useCallback(
    (couponId: string): ActionResult => {
      const currentCoupon = coupons.find((item) => item.id === couponId)

      if (!currentCoupon) {
        return { ok: false, error: 'Coupon not found.' }
      }

      const nextActive = !currentCoupon.isActive
      const timestamp = nowIso()

      setCoupons((previous) => {
        const next = previous.map((item) =>
          item.id === couponId
            ? {
                ...item,
                isActive: nextActive,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_COUPONS_KEY, next)
        return next
      })

      pushAuditEvent('COUPON_TOGGLED_ACTIVE', `Coupon ${nextActive ? 'activated' : 'deactivated'}: ${currentCoupon.code}`)
      return { ok: true }
    },
    [coupons, persist, pushAuditEvent],
  )

  const updatePlan = useCallback(
    (planId: string, patch: UpdatePlanPatch): ActionResult => {
      const currentPlan = plans.find((item) => item.id === planId)

      if (!currentPlan) {
        return { ok: false, error: 'Plan not found.' }
      }

      const nextPrice = patch.price !== undefined ? Number(patch.price) : currentPlan.price
      const nextDurationDays = patch.durationDays !== undefined ? Number(patch.durationDays) : currentPlan.durationDays
      const nextProductLimit =
        patch.productLimit !== undefined
          ? patch.productLimit === null
            ? null
            : Number(patch.productLimit)
          : currentPlan.productLimit
      const nextPriorityRank =
        patch.priorityRank !== undefined ? Number(patch.priorityRank) : currentPlan.priorityRank
      const nextFeatures =
        patch.features !== undefined
          ? patch.features.map((item) => normalizeName(item)).filter((item) => item.length > 0)
          : currentPlan.features

      if (!Number.isFinite(nextPrice) || Number.isNaN(nextPrice) || nextPrice < 0) {
        return { ok: false, error: 'Price must be 0 or greater.' }
      }

      if (!Number.isInteger(nextDurationDays) || nextDurationDays <= 0) {
        return { ok: false, error: 'Duration must be at least 1 day.' }
      }

      if (
        nextProductLimit !== null &&
        (!Number.isInteger(nextProductLimit) || Number.isNaN(nextProductLimit) || nextProductLimit <= 0)
      ) {
        return { ok: false, error: 'Product limit must be a positive integer or unlimited.' }
      }

      if (!Number.isInteger(nextPriorityRank) || nextPriorityRank < 0) {
        return { ok: false, error: 'Priority rank must be 0 or greater.' }
      }

      if (nextFeatures.length === 0) {
        return { ok: false, error: 'At least one feature is required.' }
      }

      const timestamp = nowIso()

      setPlans((previous) => {
        const next = previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                price: nextPrice,
                durationDays: nextDurationDays,
                productLimit: nextProductLimit,
                priorityRank: nextPriorityRank,
                features: nextFeatures,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_PLANS_KEY, next)
        return next
      })

      pushAuditEvent('PLAN_UPDATED', `Plan updated: ${currentPlan.name}`)
      return { ok: true }
    },
    [persist, plans, pushAuditEvent],
  )

  const togglePlanActive = useCallback(
    (planId: string): ActionResult => {
      const currentPlan = plans.find((item) => item.id === planId)

      if (!currentPlan) {
        return { ok: false, error: 'Plan not found.' }
      }

      const nextActive = !currentPlan.isActive
      const timestamp = nowIso()

      setPlans((previous) => {
        const next = previous.map((item) =>
          item.id === planId
            ? {
                ...item,
                isActive: nextActive,
                updatedAt: timestamp,
              }
            : item,
        )
        persist(SA_PLANS_KEY, next)
        return next
      })

      pushAuditEvent('PLAN_TOGGLED_ACTIVE', `Plan ${nextActive ? 'activated' : 'deactivated'}: ${currentPlan.name}`)
      return { ok: true }
    },
    [persist, plans, pushAuditEvent],
  )

  const getPlanById = useCallback(
    (planId: string) => plans.find((item) => item.id === planId),
    [plans],
  )

  const getShopSubscriptionForShop = useCallback(
    (shopId: string) => {
      return shopSubscriptions
        .filter((item) => item.shopId === shopId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    },
    [shopSubscriptions],
  )

  const getExpiringSubscriptions = useCallback(
    (days = 15) => {
      const now = new Date().getTime()
      const maxTime = now + days * 24 * 60 * 60 * 1000

      return shopSubscriptions
        .filter((item) => {
          if (item.status !== 'ACTIVE') {
            return false
          }

          const expiry = new Date(item.expiryDate).getTime()
          return Number.isFinite(expiry) && expiry >= now && expiry <= maxTime
        })
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    },
    [shopSubscriptions],
  )

  const getCityName = useCallback(
    (cityId: string) => cities.find((city) => city.id === cityId)?.name ?? 'Unknown city',
    [cities],
  )

  const getShopName = useCallback(
    (shopId: string) => shops.find((shop) => shop.id === shopId)?.shopName ?? 'Unknown shop',
    [shops],
  )

  const updateConfigValue = useCallback(
    (key: string, value: string): ActionResult => {
      const currentConfig = config.find((item) => item.key === key)

      if (!currentConfig) {
        return { ok: false, error: `Config key not found: ${key}` }
      }

      const normalizedValue = value.trim()
      if (!normalizedValue) {
        return { ok: false, error: 'Config value cannot be empty.' }
      }

      const timestamp = nowIso()

      setConfig((previous) => {
        const next = previous.map((item) =>
          item.key === key
            ? {
                ...item,
                value: normalizedValue,
                updatedAt: timestamp,
              }
            : item,
        )

        persist(SA_CONFIG_KEY, next)
        return next
      })

      pushAuditEvent('CONFIG_UPDATED', `Config updated: ${key}`)
      return { ok: true }
    },
    [config, persist, pushAuditEvent],
  )

  const toggleFeatureFlag = useCallback(
    (key: string): ActionResult => {
      const currentConfig = config.find((item) => item.key === key)

      if (!currentConfig) {
        return { ok: false, error: `Feature flag not found: ${key}` }
      }

      if (!BOOLEAN_CONFIG_KEYS.has(key)) {
        return { ok: false, error: `${key} is not a supported feature flag.` }
      }

      if (currentConfig.value !== 'true' && currentConfig.value !== 'false') {
        return { ok: false, error: `${key} value must be either "true" or "false".` }
      }

      const nextValue = currentConfig.value === 'true' ? 'false' : 'true'
      const timestamp = nowIso()

      setConfig((previous) => {
        const next = previous.map((item) =>
          item.key === key
            ? {
                ...item,
                value: nextValue,
                updatedAt: timestamp,
              }
            : item,
        )

        persist(SA_CONFIG_KEY, next)
        return next
      })

      pushAuditEvent('FEATURE_FLAG_TOGGLED', `Feature flag toggled: ${key} -> ${nextValue}`)
      return { ok: true }
    },
    [config, persist, pushAuditEvent],
  )

  const getConfigValue = useCallback(
    (key: string) => config.find((item) => item.key === key)?.value,
    [config],
  )

  const getConfigBoolean = useCallback(
    (key: string) => getConfigValue(key) === 'true',
    [getConfigValue],
  )

  const setDefaultCommission = useCallback(
    (percentage: number): ActionResult => {
      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          defaultPercentage: normalizedPercentage,
          updatedAt: timestamp,
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      pushAuditEvent('COMMISSION_DEFAULT_UPDATED', `Default commission updated to ${normalizedPercentage}%`)
      return { ok: true }
    },
    [persist, pushAuditEvent],
  )

  const upsertCityOverride = useCallback(
    (cityId: string, percentage: number): ActionResult => {
      const normalizedCityId = cityId.trim()
      if (!normalizedCityId) {
        return { ok: false, error: 'City is required.' }
      }

      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const existingIndex = previous.cityOverrides.findIndex((item) => item.cityId === normalizedCityId)
        const nextCityOverrides =
          existingIndex >= 0
            ? previous.cityOverrides.map((item, index) =>
                index === existingIndex
                  ? { cityId: normalizedCityId, percentage: normalizedPercentage, updatedAt: timestamp }
                  : item,
              )
            : [...previous.cityOverrides, { cityId: normalizedCityId, percentage: normalizedPercentage, updatedAt: timestamp }]

        const next = normalizeCommission({
          ...previous,
          cityOverrides: nextCityOverrides,
          updatedAt: timestamp,
        })

        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const cityName = cities.find((item) => item.id === normalizedCityId)?.name ?? normalizedCityId
      pushAuditEvent('COMMISSION_OVERRIDE_UPSERTED', `City commission override saved: ${cityName} -> ${normalizedPercentage}%`)
      return { ok: true }
    },
    [cities, persist, pushAuditEvent],
  )

  const removeCityOverride = useCallback(
    (cityId: string): ActionResult => {
      const normalizedCityId = cityId.trim()
      if (!normalizedCityId) {
        return { ok: false, error: 'City is required.' }
      }

      const existing = commission.cityOverrides.find((item) => item.cityId === normalizedCityId)
      if (!existing) {
        return { ok: false, error: 'City override not found.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          cityOverrides: previous.cityOverrides.filter((item) => item.cityId !== normalizedCityId),
          updatedAt: timestamp,
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const cityName = cities.find((item) => item.id === normalizedCityId)?.name ?? normalizedCityId
      pushAuditEvent('COMMISSION_OVERRIDE_REMOVED', `City commission override removed: ${cityName}`)
      return { ok: true }
    },
    [cities, commission.cityOverrides, persist, pushAuditEvent],
  )

  const upsertCategoryOverride = useCallback(
    (categoryId: string, percentage: number): ActionResult => {
      const normalizedCategoryId = categoryId.trim()
      if (!normalizedCategoryId) {
        return { ok: false, error: 'Category is required.' }
      }

      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const existingIndex = previous.categoryOverrides.findIndex((item) => item.categoryId === normalizedCategoryId)
        const nextCategoryOverrides =
          existingIndex >= 0
            ? previous.categoryOverrides.map((item, index) =>
                index === existingIndex
                  ? { categoryId: normalizedCategoryId, percentage: normalizedPercentage, updatedAt: timestamp }
                  : item,
              )
            : [
                ...previous.categoryOverrides,
                { categoryId: normalizedCategoryId, percentage: normalizedPercentage, updatedAt: timestamp },
              ]

        const next = normalizeCommission({
          ...previous,
          categoryOverrides: nextCategoryOverrides,
          updatedAt: timestamp,
        })

        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const categoryName = categories.find((item) => item.id === normalizedCategoryId)?.name ?? normalizedCategoryId
      pushAuditEvent(
        'COMMISSION_OVERRIDE_UPSERTED',
        `Category commission override saved: ${categoryName} -> ${normalizedPercentage}%`,
      )
      return { ok: true }
    },
    [categories, persist, pushAuditEvent],
  )

  const removeCategoryOverride = useCallback(
    (categoryId: string): ActionResult => {
      const normalizedCategoryId = categoryId.trim()
      if (!normalizedCategoryId) {
        return { ok: false, error: 'Category is required.' }
      }

      const existing = commission.categoryOverrides.find((item) => item.categoryId === normalizedCategoryId)
      if (!existing) {
        return { ok: false, error: 'Category override not found.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          categoryOverrides: previous.categoryOverrides.filter((item) => item.categoryId !== normalizedCategoryId),
          updatedAt: timestamp,
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const categoryName = categories.find((item) => item.id === normalizedCategoryId)?.name ?? normalizedCategoryId
      pushAuditEvent('COMMISSION_OVERRIDE_REMOVED', `Category commission override removed: ${categoryName}`)
      return { ok: true }
    },
    [categories, commission.categoryOverrides, persist, pushAuditEvent],
  )

  const upsertShopOverride = useCallback(
    (shopId: string, percentage: number): ActionResult => {
      const normalizedShopId = shopId.trim()
      if (!normalizedShopId) {
        return { ok: false, error: 'Shop is required.' }
      }

      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const existingIndex = previous.shopOverrides.findIndex((item) => item.shopId === normalizedShopId)
        const nextShopOverrides =
          existingIndex >= 0
            ? previous.shopOverrides.map((item, index) =>
                index === existingIndex
                  ? { shopId: normalizedShopId, percentage: normalizedPercentage, updatedAt: timestamp }
                  : item,
              )
            : [...previous.shopOverrides, { shopId: normalizedShopId, percentage: normalizedPercentage, updatedAt: timestamp }]

        const next = normalizeCommission({
          ...previous,
          shopOverrides: nextShopOverrides,
          updatedAt: timestamp,
        })

        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const shopName = shops.find((item) => item.id === normalizedShopId)?.shopName ?? normalizedShopId
      pushAuditEvent('COMMISSION_OVERRIDE_UPSERTED', `Shop commission override saved: ${shopName} -> ${normalizedPercentage}%`)
      return { ok: true }
    },
    [persist, pushAuditEvent, shops],
  )

  const removeShopOverride = useCallback(
    (shopId: string): ActionResult => {
      const normalizedShopId = shopId.trim()
      if (!normalizedShopId) {
        return { ok: false, error: 'Shop is required.' }
      }

      const existing = commission.shopOverrides.find((item) => item.shopId === normalizedShopId)
      if (!existing) {
        return { ok: false, error: 'Shop override not found.' }
      }

      const timestamp = nowIso()
      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          shopOverrides: previous.shopOverrides.filter((item) => item.shopId !== normalizedShopId),
          updatedAt: timestamp,
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      const shopName = shops.find((item) => item.id === normalizedShopId)?.shopName ?? normalizedShopId
      pushAuditEvent('COMMISSION_OVERRIDE_REMOVED', `Shop commission override removed: ${shopName}`)
      return { ok: true }
    },
    [commission.shopOverrides, persist, pushAuditEvent, shops],
  )

  const getEffectiveCommission = useCallback(
    (scope: CommissionScope): number => {
      if (scope.shopId) {
        const shopOverride = commission.shopOverrides.find((item) => item.shopId === scope.shopId)
        if (shopOverride) {
          return shopOverride.percentage
        }
      }

      if (scope.categoryId) {
        const categoryOverride = commission.categoryOverrides.find((item) => item.categoryId === scope.categoryId)
        if (categoryOverride) {
          return categoryOverride.percentage
        }
      }

      if (scope.cityId) {
        const cityOverride = commission.cityOverrides.find((item) => item.cityId === scope.cityId)
        if (cityOverride) {
          return cityOverride.percentage
        }
      }

      return commission.defaultPercentage
    },
    [commission],
  )

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_CITIES_KEY, cities)
  }, [cities, initialized, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_CATEGORIES_KEY, categories)
  }, [categories, initialized, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_SHOPS_KEY, shops)
  }, [initialized, persist, shops])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_ORDERS_KEY, orders)
  }, [initialized, orders, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_PAYMENTS_KEY, payments)
  }, [initialized, payments, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_PAYOUTS_KEY, payoutRequests)
  }, [initialized, payoutRequests, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_PAYOUT_LOGS_KEY, payoutLogs)
  }, [initialized, payoutLogs, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_REFUNDS_KEY, refunds)
  }, [initialized, refunds, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_REFUND_LOGS_KEY, refundLogs)
  }, [initialized, refundLogs, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_COUPONS_KEY, coupons)
  }, [coupons, initialized, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_PLANS_KEY, plans)
  }, [initialized, persist, plans])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_SHOP_SUBSCRIPTIONS_KEY, shopSubscriptions)
  }, [initialized, persist, shopSubscriptions])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_CONFIG_KEY, config)
  }, [config, initialized, persist])

  useEffect(() => {
    if (!initialized) {
      return
    }

    persist(SA_COMMISSION_KEY, commission)
  }, [commission, initialized, persist])

  const value = useMemo<SuperAdminStoreContextValue>(
    () => ({
      cities,
      categories,
      shops,
      orders,
      payments,
      payoutRequests,
      payoutLogs,
      refunds,
      refundLogs,
      coupons,
      plans,
      shopSubscriptions,
      config,
      commission,
      auditEvents,
      initialized,
      lastError,
      initializeFromStorageOrSeed,
      resetAllDemoData,
      appendAuditEvent,
      clearAuditEvents,
      addCity,
      updateCity,
      toggleCityActive,
      toggleCityDelivery,
      addCategory,
      updateCategory,
      addSubcategory,
      removeSubcategory,
      getCategoryBySlug,
      getCategoryById,
      publishCategories,
      approveShop,
      rejectShop,
      suspendShop,
      reactivateShop,
      toggleShopPublic,
      updateShopSlug,
      forceCancelOrder,
      triggerRefund,
      getOrderById,
      retryVerifyPayment,
      getPaymentById,
      approvePayout,
      rejectPayout,
      completePayout,
      getLogsForPayout,
      createRefund,
      setRefundProcessing,
      completeRefund,
      failRefund,
      getRefundById,
      getLogsForRefund,
      createCoupon,
      updateCoupon,
      toggleCouponActive,
      updatePlan,
      togglePlanActive,
      getPlanById,
      getShopSubscriptionForShop,
      getExpiringSubscriptions,
      getCityName,
      getShopName,
      updateConfigValue,
      toggleFeatureFlag,
      getConfigValue,
      getConfigBoolean,
      setDefaultCommission,
      upsertCityOverride,
      removeCityOverride,
      upsertCategoryOverride,
      removeCategoryOverride,
      upsertShopOverride,
      removeShopOverride,
      getEffectiveCommission,
    }),
    [
      auditEvents,
      categories,
      cities,
      config,
      commission,
      initialized,
      lastError,
      orders,
      payments,
      payoutRequests,
      payoutLogs,
      refunds,
      refundLogs,
      coupons,
      plans,
      shopSubscriptions,
      shops,
      initializeFromStorageOrSeed,
      resetAllDemoData,
      appendAuditEvent,
      clearAuditEvents,
      addCity,
      updateCity,
      toggleCityActive,
      toggleCityDelivery,
      addCategory,
      updateCategory,
      addSubcategory,
      removeSubcategory,
      getCategoryBySlug,
      getCategoryById,
      publishCategories,
      approveShop,
      rejectShop,
      suspendShop,
      reactivateShop,
      toggleShopPublic,
      updateShopSlug,
      forceCancelOrder,
      triggerRefund,
      getOrderById,
      retryVerifyPayment,
      getPaymentById,
      approvePayout,
      rejectPayout,
      completePayout,
      getLogsForPayout,
      createRefund,
      setRefundProcessing,
      completeRefund,
      failRefund,
      getRefundById,
      getLogsForRefund,
      createCoupon,
      updateCoupon,
      toggleCouponActive,
      updatePlan,
      togglePlanActive,
      getPlanById,
      getShopSubscriptionForShop,
      getExpiringSubscriptions,
      getCityName,
      getShopName,
      updateConfigValue,
      toggleFeatureFlag,
      getConfigValue,
      getConfigBoolean,
      setDefaultCommission,
      upsertCityOverride,
      removeCityOverride,
      upsertCategoryOverride,
      removeCategoryOverride,
      upsertShopOverride,
      removeShopOverride,
      getEffectiveCommission,
    ],
  )

  return <SuperAdminStoreContext.Provider value={value}>{children}</SuperAdminStoreContext.Provider>
}

export const useSuperAdminStore = () => {
  const context = useContext(SuperAdminStoreContext)

  if (!context) {
    throw new Error('useSuperAdminStore must be used within SuperAdminStoreProvider')
  }

  return context
}
