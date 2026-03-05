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
import type { Order, OrderStatus } from '../types/Order'
import type { Payment } from '../types/Payment'
import type { PayoutLogEntry, PayoutRequest } from '../types/Payout'
import type { RefundLogEntry, RefundRecord } from '../types/Refund'
import type { Shop } from '../types/shop'
import type { ShopSubscription, SubscriptionPlan, SubscriptionStatus } from '../types/Subscription'
import type { SystemConfig } from '../types/SystemConfig'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import {
  createAdminCity,
  listAdminCities,
  toggleAdminCityActive,
  toggleAdminCityDelivery,
  updateAdminCity,
} from '../services/adminCitiesService'
import {
  addAdminSubcategory,
  createAdminCategory,
  listAdminCategories,
  publishAdminCategory,
  removeAdminSubcategory,
  updateAdminCategory,
} from '../services/adminCategoriesService'
import {
  approveAdminShop,
  listAdminShops,
  reactivateAdminShop,
  rejectAdminShop,
  suspendAdminShop,
  toggleAdminShopPublic,
} from '../services/adminShopsService'
import {
  forceCancelAdminOrder,
  listAdminOrders,
  triggerAdminRefund,
} from '../services/adminOrdersService'
import {
  listAdminPayments,
  retryVerifyAdminPayment,
} from '../services/adminPaymentsService'
import {
  approveAdminPayout,
  completeAdminPayout,
  listAdminPayouts,
  rejectAdminPayout,
} from '../services/adminPayoutsService'
import {
  completeAdminRefund,
  createAdminRefund,
  failAdminRefund,
  listAdminRefunds,
  processAdminRefund,
} from '../services/adminRefundsService'
import {
  createAdminCoupon,
  listAdminCoupons,
  toggleAdminCouponActive,
  updateAdminCoupon,
} from '../services/adminCouponsService'
import {
  listAdminShopSubscriptions,
  listAdminSubscriptionPlans,
  toggleAdminSubscriptionPlanActive,
  updateAdminSubscriptionPlan,
} from '../services/adminSubscriptionsService'
import {
  listAdminConfig,
  updateAdminConfigValue,
} from '../services/adminConfigService'
import {
  createAdminShopCommissionOverride,
  getAdminDefaultCommission,
  listAdminShopCommissionOverrides,
  removeAdminShopCommissionOverride,
  updateAdminDefaultCommission,
} from '../services/adminCommissionService'
import { listAdminAuditEvents } from '../services/adminAuditService'
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

const DEFAULT_COMMISSION: CommissionConfig = {
  defaultPercentage: 0,
  cityOverrides: [],
  categoryOverrides: [],
  shopOverrides: [],
  updatedAt: new Date().toISOString(),
}
const MIN_SUBCATEGORIES = 0
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
          overrideId: item.overrideId,
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

const ensureRequiredConfigKeys = (items: SystemConfig[]) => {
  const map = new Map(items.map((item) => [item.key, item]))
  return Array.from(map.values())
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
  const [commission, setCommission] = useState<CommissionConfig>(DEFAULT_COMMISSION)
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

  const initializeFromStorage = useCallback(() => {
    const loadedCities = loadFromStorage<City[]>(SA_CITIES_KEY, []).map((city) =>
      normalizeCity(city as City & { commissionOverride?: number }),
    )
    const loadedCategories = loadFromStorage<Category[]>(SA_CATEGORIES_KEY, []).map((category) =>
      normalizeCategory(category as Category & { active?: boolean }),
    )
    const loadedShops = loadFromStorage<Shop[]>(SA_SHOPS_KEY, [])
    const loadedOrders = loadFromStorage<Order[]>(SA_ORDERS_KEY, []).map((order) =>
      normalizeOrder(order as Order & { statusLogs?: Array<{ status: string; at: string; note?: string }> }),
    )
    const loadedPayments = loadFromStorage<Payment[]>(SA_PAYMENTS_KEY, [])
    const loadedPayoutRequests = loadFromStorage<PayoutRequest[]>(SA_PAYOUTS_KEY, [])
    const loadedPayoutLogs = loadFromStorage<PayoutLogEntry[]>(SA_PAYOUT_LOGS_KEY, [])
    const loadedRefunds = loadFromStorage<RefundRecord[]>(SA_REFUNDS_KEY, [])
    const loadedRefundLogs = loadFromStorage<RefundLogEntry[]>(SA_REFUND_LOGS_KEY, [])
    const loadedCoupons = loadFromStorage<Coupon[]>(SA_COUPONS_KEY, []).map((coupon) => normalizeCoupon(coupon))
    const loadedPlans = loadFromStorage<SubscriptionPlan[]>(SA_PLANS_KEY, []).map((plan) => normalizePlan(plan))
    const loadedShopSubscriptions = loadFromStorage<ShopSubscription[]>(
      SA_SHOP_SUBSCRIPTIONS_KEY,
      [],
    ).map((subscription) => normalizeShopSubscription(subscription))
    const loadedConfig = ensureRequiredConfigKeys(loadFromStorage<SystemConfig[]>(SA_CONFIG_KEY, []))
    const loadedCommission = normalizeCommission(loadFromStorage<CommissionConfig>(SA_COMMISSION_KEY, DEFAULT_COMMISSION))
    const loadedAuditEvents = loadFromStorage<AuditEvent[]>(SA_AUDIT_KEY, [])
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

  const resetAllData = useCallback(async (): Promise<ActionResult> => {
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

    try {
      const [
        nextCities,
        nextCategories,
        nextShops,
        nextOrders,
        nextPayments,
        nextPayoutRequests,
        nextRefundData,
        nextCoupons,
        nextPlans,
        nextShopSubscriptions,
        nextConfig,
        defaultPercentage,
        shopOverrides,
        nextAuditEvents,
      ] = await Promise.all([
        listAdminCities(),
        listAdminCategories(),
        listAdminShops(),
        listAdminOrders(),
        listAdminPayments(),
        listAdminPayouts(),
        listAdminRefunds(),
        listAdminCoupons(),
        listAdminSubscriptionPlans(),
        listAdminShopSubscriptions(),
        listAdminConfig(),
        getAdminDefaultCommission(),
        listAdminShopCommissionOverrides(),
        listAdminAuditEvents(),
      ])

      setCities(nextCities)
      setCategories(nextCategories)
      setShops(nextShops)
      setOrders(nextOrders)
      setPayments(nextPayments)
      setPayoutRequests(nextPayoutRequests)
      setPayoutLogs([])
      setRefunds(nextRefundData.refunds)
      setRefundLogs(nextRefundData.logs)
      setCoupons(nextCoupons)
      setPlans(nextPlans)
      setShopSubscriptions(nextShopSubscriptions)
      setConfig(nextConfig)
      setAuditEvents(nextAuditEvents)

      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          defaultPercentage,
          shopOverrides: shopOverrides.map((item) => ({
            shopId: item.shopId,
            percentage: item.percentage,
            updatedAt: item.updatedAt,
            overrideId: item.overrideId,
          })),
          updatedAt: nowIso(),
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      persist(SA_CITIES_KEY, nextCities)
      persist(SA_CATEGORIES_KEY, nextCategories)
      persist(SA_SHOPS_KEY, nextShops)
      persist(SA_ORDERS_KEY, nextOrders)
      persist(SA_PAYMENTS_KEY, nextPayments)
      persist(SA_PAYOUTS_KEY, nextPayoutRequests)
      persist(SA_PAYOUT_LOGS_KEY, [])
      persist(SA_REFUNDS_KEY, nextRefundData.refunds)
      persist(SA_REFUND_LOGS_KEY, nextRefundData.logs)
      persist(SA_COUPONS_KEY, nextCoupons)
      persist(SA_PLANS_KEY, nextPlans)
      persist(SA_SHOP_SUBSCRIPTIONS_KEY, nextShopSubscriptions)
      persist(SA_CONFIG_KEY, nextConfig)
      persist(SA_AUDIT_KEY, nextAuditEvents)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to refresh all settings data from backend.'
      return { ok: false, error: message }
    }

    pushAuditEvent(SYSTEM_RESET, 'SuperAdmin local cache reset and backend data re-synced')
    return { ok: true }
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

  const syncCities = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextCities = await listAdminCities()
      setCities(nextCities)
      persist(SA_CITIES_KEY, nextCities)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync cities.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncCategories = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextCategories = await listAdminCategories()
      setCategories(nextCategories)
      persist(SA_CATEGORIES_KEY, nextCategories)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync categories.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncShops = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextShops = await listAdminShops()
      setShops(nextShops)
      persist(SA_SHOPS_KEY, nextShops)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync shops.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncOrders = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextOrders = await listAdminOrders()
      setOrders(nextOrders)
      persist(SA_ORDERS_KEY, nextOrders)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync orders.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncPayments = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextPayments = await listAdminPayments()
      const cityIdByShop = new Map(shops.map((shop) => [shop.id, shop.cityId]))
      const normalizedPayments = nextPayments.map((payment) => ({
        ...payment,
        cityId: payment.cityId || cityIdByShop.get(payment.shopId) || '',
      }))

      setPayments(normalizedPayments)
      persist(SA_PAYMENTS_KEY, normalizedPayments)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync payments.'
      return { ok: false, error: message }
    }
  }, [persist, shops])

  const syncPayouts = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextRequests = await listAdminPayouts()
      setPayoutRequests(nextRequests)
      persist(SA_PAYOUTS_KEY, nextRequests)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync payouts.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncRefunds = useCallback(async (): Promise<ActionResult> => {
    try {
      const { refunds: nextRefunds, logs: nextLogs } = await listAdminRefunds()
      setRefunds(nextRefunds)
      setRefundLogs(nextLogs)
      persist(SA_REFUNDS_KEY, nextRefunds)
      persist(SA_REFUND_LOGS_KEY, nextLogs)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync refunds.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncCoupons = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextCoupons = await listAdminCoupons()
      setCoupons(nextCoupons)
      persist(SA_COUPONS_KEY, nextCoupons)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync coupons.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncPlans = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextPlans = await listAdminSubscriptionPlans()
      setPlans(nextPlans)
      persist(SA_PLANS_KEY, nextPlans)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync subscription plans.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncShopSubscriptions = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextSubscriptions = await listAdminShopSubscriptions()
      setShopSubscriptions(nextSubscriptions)
      persist(SA_SHOP_SUBSCRIPTIONS_KEY, nextSubscriptions)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync shop subscriptions.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncConfig = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextConfig = await listAdminConfig()
      setConfig(nextConfig)
      persist(SA_CONFIG_KEY, nextConfig)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync config.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncCommission = useCallback(async (): Promise<ActionResult> => {
    try {
      const [defaultPercentage, shopOverrides] = await Promise.all([
        getAdminDefaultCommission(),
        listAdminShopCommissionOverrides(),
      ])

      const timestamp = nowIso()
      setCommission((previous) => {
        const next = normalizeCommission({
          ...previous,
          defaultPercentage,
          shopOverrides: shopOverrides.map((item) => ({
            shopId: item.shopId,
            percentage: item.percentage,
            updatedAt: item.updatedAt,
            overrideId: item.overrideId,
          })),
          updatedAt: timestamp,
        })
        persist(SA_COMMISSION_KEY, next)
        return next
      })

      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync commission.'
      return { ok: false, error: message }
    }
  }, [persist])

  const syncAuditEvents = useCallback(async (): Promise<ActionResult> => {
    try {
      const nextEvents = await listAdminAuditEvents()
      setAuditEvents(nextEvents)
      persist(SA_AUDIT_KEY, nextEvents)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sync audit logs.'
      return { ok: false, error: message }
    }
  }, [persist])

  const addCity = useCallback(
    async (input: CityUpsertInput): Promise<ActionResult> => {
      const validation = validateCityInput(input, cities)

      if (validation.error) {
        return { ok: false, error: validation.error }
      }

      try {
        const city = await createAdminCity(validation.normalized)
        const commissionOverridePercentage = validation.normalized.commissionOverridePercentage ?? null
        const cityWithCommission = {
          ...city,
          commissionOverridePercentage,
        }

        setCities((previous) => {
          const next = [...previous, cityWithCommission]
          persist(SA_CITIES_KEY, next)
          return next
        })

        if (commissionOverridePercentage !== null) {
          const timestamp = nowIso()
          setCommission((previous) => {
            const existingIndex = previous.cityOverrides.findIndex((item) => item.cityId === city.id)
            const nextCityOverrides =
              existingIndex >= 0
                ? previous.cityOverrides.map((item, index) =>
                    index === existingIndex ? { cityId: city.id, percentage: commissionOverridePercentage, updatedAt: timestamp } : item,
                  )
                : [...previous.cityOverrides, { cityId: city.id, percentage: commissionOverridePercentage, updatedAt: timestamp }]

            const nextCommission = normalizeCommission({
              ...previous,
              cityOverrides: nextCityOverrides,
              updatedAt: timestamp,
            })
            persist(SA_COMMISSION_KEY, nextCommission)
            return nextCommission
          })
        }

        pushAuditEvent('CITY_CREATED', `City created: ${city.name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create city.'
        return { ok: false, error: message }
      }
    },
    [cities, persist, pushAuditEvent],
  )

  const updateCity = useCallback(
    async (cityId: string, patch: Partial<CityUpsertInput>): Promise<ActionResult> => {
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

      try {
        const updatedCity = await updateAdminCity(cityId, validation.normalized)
        const commissionOverridePercentage = validation.normalized.commissionOverridePercentage ?? null
        const cityWithCommission = {
          ...updatedCity,
          commissionOverridePercentage,
        }

        setCities((previous) => {
          const next = previous.map((city) => (city.id === cityId ? cityWithCommission : city))

          persist(SA_CITIES_KEY, next)
          return next
        })

        const timestamp = nowIso()
        setCommission((previous) => {
          const nextCityOverrides =
            commissionOverridePercentage === null
              ? previous.cityOverrides.filter((item) => item.cityId !== cityId)
              : (() => {
                  const existingIndex = previous.cityOverrides.findIndex((item) => item.cityId === cityId)
                  if (existingIndex >= 0) {
                    return previous.cityOverrides.map((item, index) =>
                      index === existingIndex
                        ? { cityId, percentage: commissionOverridePercentage, updatedAt: timestamp }
                        : item,
                    )
                  }

                  return [...previous.cityOverrides, { cityId, percentage: commissionOverridePercentage, updatedAt: timestamp }]
                })()

          const nextCommission = normalizeCommission({
            ...previous,
            cityOverrides: nextCityOverrides,
            updatedAt: timestamp,
          })

          persist(SA_COMMISSION_KEY, nextCommission)
          return nextCommission
        })

        pushAuditEvent('CITY_UPDATED', `City updated: ${cityWithCommission.name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update city.'
        return { ok: false, error: message }
      }
    },
    [cities, persist, pushAuditEvent],
  )

  const toggleCityActive = useCallback(
    async (cityId: string): Promise<ActionResult> => {
      const currentCity = cities.find((city) => city.id === cityId)

      if (!currentCity) {
        return { ok: false, error: 'City not found.' }
      }

      const nextIsActive = !currentCity.isActive

      try {
        const updatedCity = await toggleAdminCityActive(cityId, nextIsActive)

        setCities((previous) => {
          const next = previous.map((city) => (city.id === cityId ? updatedCity : city))

          persist(SA_CITIES_KEY, next)
          return next
        })

        pushAuditEvent(
          'CITY_TOGGLED_ACTIVE',
          `City ${nextIsActive ? 'activated' : 'deactivated'}: ${currentCity.name}`,
        )

        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update city status.'
        return { ok: false, error: message }
      }
    },
    [cities, persist, pushAuditEvent],
  )

  const toggleCityDelivery = useCallback(
    async (cityId: string): Promise<ActionResult> => {
      const currentCity = cities.find((city) => city.id === cityId)

      if (!currentCity) {
        return { ok: false, error: 'City not found.' }
      }

      const nextDeliveryEnabled = !currentCity.deliveryEnabled

      try {
        const updatedCity = await toggleAdminCityDelivery(cityId, nextDeliveryEnabled)

        setCities((previous) => {
          const next = previous.map((city) => (city.id === cityId ? updatedCity : city))

          persist(SA_CITIES_KEY, next)
          return next
        })

        pushAuditEvent(
          'CITY_TOGGLED_DELIVERY',
          `City delivery ${nextDeliveryEnabled ? 'enabled' : 'disabled'}: ${currentCity.name}`,
        )

        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update city delivery status.'
        return { ok: false, error: message }
      }
    },
    [cities, persist, pushAuditEvent],
  )

  const addCategory = useCallback(
    async (name: string): Promise<ActionResult> => {
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

      try {
        const category = await createAdminCategory(normalizedName)

        setCategories((previous) => {
          const next = [...previous, category]
          persist(SA_CATEGORIES_KEY, next)
          return next
        })

        pushAuditEvent('CATEGORY_CREATED', `Category created: ${category.name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create category.'
        return { ok: false, error: message }
      }
    },
    [categories, persist, pushAuditEvent],
  )

  const updateCategory = useCallback(
    async (categoryId: string, patch: CategoryUpdatePatch): Promise<ActionResult> => {
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

      try {
        const updatedCategory = await updateAdminCategory(
          categoryId,
          { name: nextName, isActive: nextIsActive },
          currentCategory,
        )

        setCategories((previous) => {
          const next = previous.map((category) => (category.id === categoryId ? updatedCategory : category))

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
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update category.'
        return { ok: false, error: message }
      }
    },
    [categories, persist, pushAuditEvent],
  )

  const addSubcategory = useCallback(
    async (categoryId: string, name: string): Promise<ActionResult> => {
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

      try {
        const updatedCategory = await addAdminSubcategory(categoryId, normalizedSubcategory)

        setCategories((previous) => {
          const next = previous.map((category) => (category.id === categoryId ? updatedCategory : category))

          persist(SA_CATEGORIES_KEY, next)
          return next
        })

        pushAuditEvent('SUBCATEGORY_ADDED', `Subcategory added to ${currentCategory.name}: ${normalizedSubcategory}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to add subcategory.'
        return { ok: false, error: message }
      }
    },
    [categories, persist, pushAuditEvent],
  )

  const removeSubcategory = useCallback(
    async (categoryId: string, name: string): Promise<ActionResult> => {
      const currentCategory = categories.find((category) => category.id === categoryId)

      if (!currentCategory) {
        return { ok: false, error: 'Category not found.' }
      }

      if (currentCategory.subcategories.length <= MIN_SUBCATEGORIES) {
        return { ok: false, error: 'No subcategories left to remove.' }
      }

      const exists = currentCategory.subcategories.some((subcategory) => subcategory === name)
      if (!exists) {
        return { ok: false, error: 'Subcategory not found.' }
      }

      try {
        const updatedCategory = await removeAdminSubcategory(categoryId, name)

        setCategories((previous) => {
          const next = previous.map((category) => (category.id === categoryId ? updatedCategory : category))

          persist(SA_CATEGORIES_KEY, next)
          return next
        })

        pushAuditEvent('SUBCATEGORY_REMOVED', `Subcategory removed from ${currentCategory.name}: ${name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to remove subcategory.'
        return { ok: false, error: message }
      }
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

  const publishCategories = useCallback(async (): Promise<ActionResult> => {
    const activeCategories = categories.filter((category) => category.isActive)

    const invalidCategories = activeCategories.filter(
      (category) => category.subcategories.length < MIN_SUBCATEGORIES || category.subcategories.length > MAX_SUBCATEGORIES,
    )

    if (invalidCategories.length > 0) {
      const details = invalidCategories
        .map((category) => `${category.name} (${category.subcategories.length})`)
        .join(', ')
      return {
        ok: false,
        error: `Active categories can have at most ${MAX_SUBCATEGORIES} subcategories. Invalid: ${details}.`,
      }
    }

    try {
      for (const category of activeCategories) {
        if (category.status === 'PUBLISHED') {
          continue
        }

        await publishAdminCategory(category.id)
      }

      const refreshedCategories = await listAdminCategories()
      setCategories(refreshedCategories)
      persist(SA_CATEGORIES_KEY, refreshedCategories)

      const refreshedActive = refreshedCategories.filter((category) => category.isActive)
      const publishedAt = nowIso()
      const categoriesResult = saveToStorage(CC_PUBLISHED_CATEGORIES_KEY, refreshedActive)
      const metaResult = saveToStorage(CC_PUBLISHED_META_KEY, { publishedAt })

      if (!categoriesResult.ok || !metaResult.ok) {
        const message = categoriesResult.error ?? metaResult.error ?? STORAGE_WARNING_MESSAGE
        setLastError(message)
        showWarning(STORAGE_WARNING_MESSAGE)
        return { ok: false, error: 'Could not publish categories to local storage.' }
      }

      pushAuditEvent('CATEGORY_PUBLISHED', `Published ${refreshedActive.length} active categories`)
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to publish categories.'
      return { ok: false, error: message }
    }
  }, [categories, pushAuditEvent, showWarning])

  const approveShop = useCallback(
    async (shopId: string): Promise<ActionResult> => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'pending_approval') {
        return { ok: false, error: 'Only pending approval shops can be approved.' }
      }

      try {
        const updatedShop = await approveAdminShop(shopId)

        setShops((previous) => {
          const next = previous.map((shop) => (shop.id === shopId ? updatedShop : shop))

          persist(SA_SHOPS_KEY, next)
          return next
        })

        pushAuditEvent('SHOP_APPROVED', `Shop approved: ${currentShop.shopName}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to approve shop.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent, shops],
  )

  const rejectShop = useCallback(
    async (shopId: string, reason: string): Promise<ActionResult> => {
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

      try {
        const updatedShop = await rejectAdminShop(shopId, normalizedReason)

        setShops((previous) => {
          const next = previous.map((shop) =>
            shop.id === shopId
              ? {
                  ...updatedShop,
                  rejectReason: normalizedReason,
                }
              : shop,
          )

          persist(SA_SHOPS_KEY, next)
          return next
        })

        pushAuditEvent('SHOP_REJECTED', `Shop rejected: ${currentShop.shopName} (${normalizedReason})`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to reject shop.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent, shops],
  )

  const suspendShop = useCallback(
    async (shopId: string, reasonOptional?: string): Promise<ActionResult> => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'approved' && currentShop.status !== 'reactivated') {
        return { ok: false, error: 'Only approved/reactivated shops can be suspended.' }
      }

      const normalizedReason = reasonOptional ? normalizeName(reasonOptional) : undefined
      try {
        const updatedShop = await suspendAdminShop(shopId, normalizedReason)

        setShops((previous) => {
          const next = previous.map((shop) =>
            shop.id === shopId
              ? {
                  ...updatedShop,
                  rejectReason: normalizedReason,
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
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to suspend shop.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent, shops],
  )

  const reactivateShop = useCallback(
    async (shopId: string): Promise<ActionResult> => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'suspended') {
        return { ok: false, error: 'Only suspended shops can be reactivated.' }
      }

      try {
        const updatedShop = await reactivateAdminShop(shopId)

        setShops((previous) => {
          const next = previous.map((shop) => (shop.id === shopId ? updatedShop : shop))

          persist(SA_SHOPS_KEY, next)
          return next
        })

        pushAuditEvent('SHOP_REACTIVATED', `Shop reactivated: ${currentShop.shopName}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to reactivate shop.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent, shops],
  )

  const toggleShopPublic = useCallback(
    async (shopId: string): Promise<ActionResult> => {
      const currentShop = shops.find((shop) => shop.id === shopId)

      if (!currentShop) {
        return { ok: false, error: 'Shop not found.' }
      }

      if (currentShop.status !== 'approved' && currentShop.status !== 'reactivated') {
        return { ok: false, error: 'Public visibility can be changed only for approved/reactivated shops.' }
      }

      const nextPublic = !currentShop.isPublic

      try {
        const updatedShop = await toggleAdminShopPublic(shopId, nextPublic)

        setShops((previous) => {
          const next = previous.map((shop) => (shop.id === shopId ? updatedShop : shop))

          persist(SA_SHOPS_KEY, next)
          return next
        })

        pushAuditEvent(
          'SHOP_PUBLIC_TOGGLED',
          `Shop public toggled (${nextPublic ? 'public' : 'private'}): ${currentShop.shopName}`,
        )
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update shop visibility.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent, shops],
  )

  const updateShopSlug = useCallback(
    async (shopId: string, slug: string): Promise<ActionResult> => {
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
    async (orderId: string, reason: string): Promise<ActionResult> => {
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

      try {
        await forceCancelAdminOrder(orderId, normalizedReason)
        const refreshed = await listAdminOrders()
        setOrders(refreshed)
        persist(SA_ORDERS_KEY, refreshed)

        pushAuditEvent('ORDER_FORCE_CANCELLED', `Order force-cancelled: ${orderId} (${normalizedReason})`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to cancel order.'
        return { ok: false, error: message }
      }
    },
    [orders, persist, pushAuditEvent],
  )

  const triggerRefund = useCallback(
    async (orderId: string): Promise<ActionResult> => {
      const currentOrder = orders.find((order) => order.id === orderId)

      if (!currentOrder) {
        return { ok: false, error: 'Order not found.' }
      }

      if (!(currentOrder.status === 'cancelled' && currentOrder.paymentStatus === 'success')) {
        return { ok: false, error: 'Refund is allowed only for cancelled orders with successful payment.' }
      }

      try {
        await triggerAdminRefund(orderId)
        const refreshed = await listAdminOrders()
        setOrders(refreshed)
        persist(SA_ORDERS_KEY, refreshed)

        pushAuditEvent('ORDER_REFUND_TRIGGERED', `Refund triggered for order: ${orderId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to trigger refund.'
        return { ok: false, error: message }
      }
    },
    [orders, persist, pushAuditEvent],
  )

  const getOrderById = useCallback(
    (orderId: string) => orders.find((order) => order.id === orderId),
    [orders],
  )

  const retryVerifyPayment = useCallback(
    async (paymentId: string): Promise<ActionResult> => {
      const currentPayment = payments.find((payment) => payment.id === paymentId)

      if (!currentPayment) {
        return { ok: false, error: 'Payment not found.' }
      }

      if (currentPayment.status !== 'PENDING' && currentPayment.status !== 'FAILED') {
        return { ok: false, error: 'Retry is allowed only for pending or failed payments.' }
      }

      try {
        await retryVerifyAdminPayment(paymentId)

        const refreshed = await listAdminPayments()
        const cityIdByShop = new Map(shops.map((shop) => [shop.id, shop.cityId]))
        const normalizedPayments = refreshed.map((payment) => ({
          ...payment,
          cityId: payment.cityId || cityIdByShop.get(payment.shopId) || '',
        }))

        setPayments(normalizedPayments)
        persist(SA_PAYMENTS_KEY, normalizedPayments)

        const updatedPayment = normalizedPayments.find((payment) => payment.id === paymentId)
        pushAuditEvent('PAYMENT_VERIFY_RETRIED', `Payment verify retried: ${paymentId} -> ${updatedPayment?.status || 'PENDING'}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to retry verification.'
        return { ok: false, error: message }
      }
    },
    [payments, persist, pushAuditEvent, shops],
  )

  const getPaymentById = useCallback(
    (id: string) => payments.find((payment) => payment.id === id),
    [payments],
  )

  const approvePayout = useCallback(
    async (payoutRequestId: string): Promise<ActionResult> => {
      const currentRequest = payoutRequests.find((request) => request.id === payoutRequestId)

      if (!currentRequest) {
        return { ok: false, error: 'Payout request not found.' }
      }

      if (currentRequest.status !== 'PENDING') {
        return { ok: false, error: 'Only pending payout requests can be approved.' }
      }

      try {
        await approveAdminPayout(payoutRequestId)
        const refreshed = await listAdminPayouts()
        setPayoutRequests(refreshed)
        persist(SA_PAYOUTS_KEY, refreshed)

        const timestamp = nowIso()
        setPayoutLogs((previous) => {
          const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'APPROVED', timestamp)]
          persist(SA_PAYOUT_LOGS_KEY, next)
          return next
        })

        pushAuditEvent('PAYOUT_APPROVED', `Payout approved: ${payoutRequestId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to approve payout request.'
        return { ok: false, error: message }
      }
    },
    [payoutRequests, persist, pushAuditEvent],
  )

  const rejectPayout = useCallback(
    async (payoutRequestId: string, reason: string): Promise<ActionResult> => {
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

      try {
        await rejectAdminPayout(payoutRequestId, normalizedReason)
        const refreshed = await listAdminPayouts()
        setPayoutRequests(refreshed)
        persist(SA_PAYOUTS_KEY, refreshed)

        const timestamp = nowIso()
        setPayoutLogs((previous) => {
          const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'REJECTED', timestamp, normalizedReason)]
          persist(SA_PAYOUT_LOGS_KEY, next)
          return next
        })

        pushAuditEvent('PAYOUT_REJECTED', `Payout rejected: ${payoutRequestId} (${normalizedReason})`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to reject payout request.'
        return { ok: false, error: message }
      }
    },
    [payoutRequests, persist, pushAuditEvent],
  )

  const completePayout = useCallback(
    async (payoutRequestId: string): Promise<ActionResult> => {
      const currentRequest = payoutRequests.find((request) => request.id === payoutRequestId)

      if (!currentRequest) {
        return { ok: false, error: 'Payout request not found.' }
      }

      if (currentRequest.status !== 'APPROVED') {
        return { ok: false, error: 'Only approved payout requests can be marked completed.' }
      }

      try {
        await completeAdminPayout(payoutRequestId)
        const refreshed = await listAdminPayouts()
        setPayoutRequests(refreshed)
        persist(SA_PAYOUTS_KEY, refreshed)

        const timestamp = nowIso()
        setPayoutLogs((previous) => {
          const next = [...previous, buildPayoutLogEntry(payoutRequestId, 'COMPLETED', timestamp)]
          persist(SA_PAYOUT_LOGS_KEY, next)
          return next
        })

        pushAuditEvent('PAYOUT_COMPLETED', `Payout completed: ${payoutRequestId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to complete payout request.'
        return { ok: false, error: message }
      }
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
    async (input: CreateRefundInput): Promise<ActionResult> => {
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

      try {
        await createAdminRefund({ orderId, reason })

        const { refunds: refreshed, logs } = await listAdminRefunds()
        setRefunds(refreshed)
        setRefundLogs(logs)
        persist(SA_REFUNDS_KEY, refreshed)
        persist(SA_REFUND_LOGS_KEY, logs)

        const latestRefund = refreshed.find((item) => item.orderId === orderId) || refreshed[0]
        pushAuditEvent('REFUND_CREATED', `Refund created: ${latestRefund?.id || orderId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create refund.'
        return { ok: false, error: message }
      }
    },
    [orders, payments, persist, pushAuditEvent],
  )

  const setRefundProcessing = useCallback(
    async (refundId: string): Promise<ActionResult> => {
      const currentRefund = refunds.find((item) => item.id === refundId)

      if (!currentRefund) {
        return { ok: false, error: 'Refund not found.' }
      }

      if (currentRefund.status !== 'REQUESTED') {
        return { ok: false, error: 'Only requested refunds can move to processing.' }
      }

      try {
        await processAdminRefund(refundId)

        const { refunds: refreshed, logs } = await listAdminRefunds()
        setRefunds(refreshed)
        setRefundLogs(logs)
        persist(SA_REFUNDS_KEY, refreshed)
        persist(SA_REFUND_LOGS_KEY, logs)

        pushAuditEvent('REFUND_PROCESSING', `Refund moved to processing: ${refundId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to move refund to processing.'
        return { ok: false, error: message }
      }
    },
    [refunds, persist, pushAuditEvent],
  )

  const completeRefund = useCallback(
    async (refundId: string): Promise<ActionResult> => {
      const currentRefund = refunds.find((item) => item.id === refundId)

      if (!currentRefund) {
        return { ok: false, error: 'Refund not found.' }
      }

      if (currentRefund.status !== 'PROCESSING') {
        return { ok: false, error: 'Only processing refunds can be completed.' }
      }

      try {
        await completeAdminRefund(refundId)

        const { refunds: refreshed, logs } = await listAdminRefunds()
        setRefunds(refreshed)
        setRefundLogs(logs)
        persist(SA_REFUNDS_KEY, refreshed)
        persist(SA_REFUND_LOGS_KEY, logs)

        pushAuditEvent('REFUND_COMPLETED', `Refund completed: ${refundId}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to complete refund.'
        return { ok: false, error: message }
      }
    },
    [refunds, persist, pushAuditEvent],
  )

  const failRefund = useCallback(
    async (refundId: string, note: string): Promise<ActionResult> => {
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

      try {
        await failAdminRefund(refundId, normalizedNote)

        const { refunds: refreshed, logs } = await listAdminRefunds()
        setRefunds(refreshed)
        setRefundLogs(logs)
        persist(SA_REFUNDS_KEY, refreshed)
        persist(SA_REFUND_LOGS_KEY, logs)

        pushAuditEvent('REFUND_FAILED', `Refund failed: ${refundId} (${normalizedNote})`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to mark refund failed.'
        return { ok: false, error: message }
      }
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
    async (input: CreateCouponInput): Promise<ActionResult> => {
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

      if (validation.normalized.discountType === 'FREE_DELIVERY') {
        return { ok: false, error: 'Backend coupons currently support only FLAT and PERCENT discount types.' }
      }

      const normalizedCoupon = validation.normalized

      try {
        await createAdminCoupon(normalizedCoupon)
        const refreshed = await listAdminCoupons()
        setCoupons(refreshed)
        persist(SA_COUPONS_KEY, refreshed)

        const createdCoupon = refreshed.find((item) => item.code.toLowerCase() === normalizedCoupon.code.toLowerCase())
        pushAuditEvent('COUPON_CREATED', `Coupon created: ${createdCoupon?.code || normalizedCoupon.code}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to create coupon.'
        return { ok: false, error: message }
      }
    },
    [categories, cities, coupons, persist, pushAuditEvent, shops],
  )

  const updateCoupon = useCallback(
    async (couponId: string, patch: UpdateCouponPatch): Promise<ActionResult> => {
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

      if (validation.normalized.discountType === 'FREE_DELIVERY') {
        return { ok: false, error: 'Backend coupons currently support only FLAT and PERCENT discount types.' }
      }

      try {
        await updateAdminCoupon(couponId, validation.normalized)
        const refreshed = await listAdminCoupons()
        setCoupons(refreshed)
        persist(SA_COUPONS_KEY, refreshed)

        pushAuditEvent('COUPON_UPDATED', `Coupon updated: ${validation.normalized.code}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update coupon.'
        return { ok: false, error: message }
      }
    },
    [categories, cities, coupons, persist, pushAuditEvent, shops],
  )

  const toggleCouponActive = useCallback(
    async (couponId: string): Promise<ActionResult> => {
      const currentCoupon = coupons.find((item) => item.id === couponId)

      if (!currentCoupon) {
        return { ok: false, error: 'Coupon not found.' }
      }

      const nextActive = !currentCoupon.isActive

      try {
        await toggleAdminCouponActive(couponId, nextActive)
        const refreshed = await listAdminCoupons()
        setCoupons(refreshed)
        persist(SA_COUPONS_KEY, refreshed)

        pushAuditEvent('COUPON_TOGGLED_ACTIVE', `Coupon ${nextActive ? 'activated' : 'deactivated'}: ${currentCoupon.code}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update coupon status.'
        return { ok: false, error: message }
      }
    },
    [coupons, persist, pushAuditEvent],
  )

  const updatePlan = useCallback(
    async (planId: string, patch: UpdatePlanPatch): Promise<ActionResult> => {
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

      try {
        await updateAdminSubscriptionPlan(currentPlan, patch)
        const refreshed = await listAdminSubscriptionPlans()
        setPlans(refreshed)
        persist(SA_PLANS_KEY, refreshed)

        pushAuditEvent('PLAN_UPDATED', `Plan updated: ${currentPlan.name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update plan.'
        return { ok: false, error: message }
      }
    },
    [persist, plans, pushAuditEvent],
  )

  const togglePlanActive = useCallback(
    async (planId: string): Promise<ActionResult> => {
      const currentPlan = plans.find((item) => item.id === planId)

      if (!currentPlan) {
        return { ok: false, error: 'Plan not found.' }
      }

      const nextActive = !currentPlan.isActive

      try {
        await toggleAdminSubscriptionPlanActive(planId, nextActive)
        const refreshed = await listAdminSubscriptionPlans()
        setPlans(refreshed)
        persist(SA_PLANS_KEY, refreshed)

        pushAuditEvent('PLAN_TOGGLED_ACTIVE', `Plan ${nextActive ? 'activated' : 'deactivated'}: ${currentPlan.name}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update plan status.'
        return { ok: false, error: message }
      }
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
    async (key: string, value: string): Promise<ActionResult> => {
      const currentConfig = config.find((item) => item.key === key)

      if (!currentConfig) {
        return { ok: false, error: `Config key not found: ${key}` }
      }

      const normalizedValue = value.trim()
      if (!normalizedValue) {
        return { ok: false, error: 'Config value cannot be empty.' }
      }

      try {
        await updateAdminConfigValue(key, normalizedValue)
        const refreshed = await listAdminConfig()
        setConfig(refreshed)
        persist(SA_CONFIG_KEY, refreshed)

        pushAuditEvent('CONFIG_UPDATED', `Config updated: ${key}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update config.'
        return { ok: false, error: message }
      }
    },
    [config, persist, pushAuditEvent],
  )

  const toggleFeatureFlag = useCallback(
    async (key: string): Promise<ActionResult> => {
      const currentConfig = config.find((item) => item.key === key)

      if (!currentConfig) {
        return { ok: false, error: `Feature flag not found: ${key}` }
      }

      if (!BOOLEAN_CONFIG_KEYS.has(key)) {
        return { ok: false, error: `${key} is not a supported feature flag.` }
      }

      const currentRaw = String(currentConfig.value).toLowerCase()
      if (currentRaw !== 'true' && currentRaw !== 'false') {
        return { ok: false, error: `${key} value must be either "true" or "false".` }
      }

      const nextValue = currentRaw === 'true' ? false : true

      try {
        await updateAdminConfigValue(key, nextValue)
        const refreshed = await listAdminConfig()
        setConfig(refreshed)
        persist(SA_CONFIG_KEY, refreshed)

        pushAuditEvent('FEATURE_FLAG_TOGGLED', `Feature flag toggled: ${key} -> ${String(nextValue)}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to toggle feature flag.'
        return { ok: false, error: message }
      }
    },
    [config, persist, pushAuditEvent],
  )

  const getConfigValue = useCallback(
    (key: string) => config.find((item) => item.key === key)?.value,
    [config],
  )

  const getConfigBoolean = useCallback(
    (key: string) => String(getConfigValue(key) ?? '').toLowerCase() === 'true',
    [getConfigValue],
  )

  const setDefaultCommission = useCallback(
    async (percentage: number): Promise<ActionResult> => {
      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      try {
        await updateAdminDefaultCommission(normalizedPercentage)
        const defaultPercentage = await getAdminDefaultCommission()

        const timestamp = nowIso()
        setCommission((previous) => {
          const next = normalizeCommission({
            ...previous,
            defaultPercentage,
            updatedAt: timestamp,
          })
          persist(SA_COMMISSION_KEY, next)
          return next
        })

        pushAuditEvent('COMMISSION_DEFAULT_UPDATED', `Default commission updated to ${defaultPercentage}%`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update default commission.'
        return { ok: false, error: message }
      }
    },
    [persist, pushAuditEvent],
  )

  const upsertCityOverride = useCallback(
    async (cityId: string, percentage: number): Promise<ActionResult> => {
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
    async (cityId: string): Promise<ActionResult> => {
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
    async (categoryId: string, percentage: number): Promise<ActionResult> => {
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
    async (categoryId: string): Promise<ActionResult> => {
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
    async (shopId: string, percentage: number): Promise<ActionResult> => {
      const normalizedShopId = shopId.trim()
      if (!normalizedShopId) {
        return { ok: false, error: 'Shop is required.' }
      }

      const normalizedPercentage = Number(percentage)
      if (!isValidPercentage(normalizedPercentage)) {
        return { ok: false, error: 'Commission percentage must be between 0 and 100.' }
      }

      try {
        const existing = commission.shopOverrides.find((item) => item.shopId === normalizedShopId)
        if (existing?.overrideId) {
          await removeAdminShopCommissionOverride(existing.overrideId)
        }

        await createAdminShopCommissionOverride(normalizedShopId, normalizedPercentage)
        const refreshedOverrides = await listAdminShopCommissionOverrides()

        const timestamp = nowIso()
        setCommission((previous) => {
          const next = normalizeCommission({
            ...previous,
            shopOverrides: refreshedOverrides.map((item) => ({
              shopId: item.shopId,
              percentage: item.percentage,
              updatedAt: item.updatedAt,
              overrideId: item.overrideId,
            })),
            updatedAt: timestamp,
          })

          persist(SA_COMMISSION_KEY, next)
          return next
        })

        const shopName = shops.find((item) => item.id === normalizedShopId)?.shopName ?? normalizedShopId
        pushAuditEvent('COMMISSION_OVERRIDE_UPSERTED', `Shop commission override saved: ${shopName} -> ${normalizedPercentage}%`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save shop override.'
        return { ok: false, error: message }
      }
    },
    [commission.shopOverrides, persist, pushAuditEvent, shops],
  )

  const removeShopOverride = useCallback(
    async (shopId: string): Promise<ActionResult> => {
      const normalizedShopId = shopId.trim()
      if (!normalizedShopId) {
        return { ok: false, error: 'Shop is required.' }
      }

      const existing = commission.shopOverrides.find((item) => item.shopId === normalizedShopId)
      if (!existing) {
        return { ok: false, error: 'Shop override not found.' }
      }

      try {
        if (existing.overrideId) {
          await removeAdminShopCommissionOverride(existing.overrideId)
        }

        const refreshedOverrides = await listAdminShopCommissionOverrides()

        const timestamp = nowIso()
        setCommission((previous) => {
          const next = normalizeCommission({
            ...previous,
            shopOverrides: refreshedOverrides.map((item) => ({
              shopId: item.shopId,
              percentage: item.percentage,
              updatedAt: item.updatedAt,
              overrideId: item.overrideId,
            })),
            updatedAt: timestamp,
          })
          persist(SA_COMMISSION_KEY, next)
          return next
        })

        const shopName = shops.find((item) => item.id === normalizedShopId)?.shopName ?? normalizedShopId
        pushAuditEvent('COMMISSION_OVERRIDE_REMOVED', `Shop commission override removed: ${shopName}`)
        return { ok: true }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to remove shop override.'
        return { ok: false, error: message }
      }
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
      initializeFromStorage,
      resetAllData,
      appendAuditEvent,
      clearAuditEvents,
      syncCities,
      syncCategories,
      syncShops,
      syncOrders,
      syncPayments,
      syncPayouts,
      syncRefunds,
      syncCoupons,
      syncPlans,
      syncShopSubscriptions,
      syncConfig,
      syncCommission,
      syncAuditEvents,
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
      initializeFromStorage,
      resetAllData,
      appendAuditEvent,
      clearAuditEvents,
      syncCities,
      syncCategories,
      syncShops,
      syncOrders,
      syncPayments,
      syncPayouts,
      syncRefunds,
      syncCoupons,
      syncPlans,
      syncShopSubscriptions,
      syncConfig,
      syncCommission,
      syncAuditEvents,
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
