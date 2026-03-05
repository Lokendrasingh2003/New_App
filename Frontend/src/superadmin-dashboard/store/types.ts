import type { AuditEvent, AuditEventMeta, AuditEventType } from '../types/AuditEvent'
import type { Category } from '../types/Category'
import type { Coupon } from '../types/Coupon'
import type { CommissionConfig, CommissionScope } from '../types/CommissionConfig'
import type { City } from '../types/City'
import type { Order } from '../types/Order'
import type { Payment } from '../types/Payment'
import type { PayoutLogEntry, PayoutRequest } from '../types/Payout'
import type { RefundLogEntry, RefundRecord } from '../types/Refund'
import type { Shop } from '../types/shop'
import type { ShopSubscription, SubscriptionPlan } from '../types/Subscription'
import type { SystemConfig } from '../types/SystemConfig'

export type SuperAdminState = {
  cities: City[]
  categories: Category[]
  shops: Shop[]
  orders: Order[]
  payments: Payment[]
  payoutRequests: PayoutRequest[]
  payoutLogs: PayoutLogEntry[]
  refunds: RefundRecord[]
  refundLogs: RefundLogEntry[]
  coupons: Coupon[]
  plans: SubscriptionPlan[]
  shopSubscriptions: ShopSubscription[]
  config: SystemConfig[]
  commission: CommissionConfig
  auditEvents: AuditEvent[]
  initialized: boolean
  lastError?: string
}

export type CityUpsertInput = {
  name: string
  slug: string
  isActive: boolean
  deliveryEnabled: boolean
  commissionOverridePercentage?: number | null
}

export type CreateRefundInput = {
  orderId: string
  paymentId: string
  reason: string
  amount?: number
}

export type CreateCouponInput = Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateCouponPatch = Partial<CreateCouponInput>

export type UpdatePlanPatch = Partial<Pick<SubscriptionPlan, 'price' | 'durationDays' | 'productLimit' | 'priorityRank' | 'features'>>

export type ActionResult = {
  ok: boolean
  error?: string
}

export type CategoryUpdatePatch = {
  name?: string
  isActive?: boolean
}

export type SuperAdminActions = {
  initializeFromStorage: () => void
  resetAllData: () => Promise<ActionResult>
  appendAuditEvent: (type: AuditEventType, message: string, meta?: AuditEventMeta) => void
  clearAuditEvents: () => ActionResult
  syncCities: () => Promise<ActionResult>
  syncCategories: () => Promise<ActionResult>
  syncShops: () => Promise<ActionResult>
  syncOrders: () => Promise<ActionResult>
  syncPayments: () => Promise<ActionResult>
  syncPayouts: () => Promise<ActionResult>
  syncRefunds: () => Promise<ActionResult>
  syncCoupons: () => Promise<ActionResult>
  syncPlans: () => Promise<ActionResult>
  syncShopSubscriptions: () => Promise<ActionResult>
  syncConfig: () => Promise<ActionResult>
  syncCommission: () => Promise<ActionResult>
  syncAuditEvents: () => Promise<ActionResult>
  addCity: (input: CityUpsertInput) => Promise<ActionResult>
  updateCity: (cityId: string, patch: Partial<CityUpsertInput>) => Promise<ActionResult>
  toggleCityActive: (cityId: string) => Promise<ActionResult>
  toggleCityDelivery: (cityId: string) => Promise<ActionResult>
  addCategory: (name: string) => Promise<ActionResult>
  updateCategory: (categoryId: string, patch: CategoryUpdatePatch) => Promise<ActionResult>
  addSubcategory: (categoryId: string, name: string) => Promise<ActionResult>
  removeSubcategory: (categoryId: string, name: string) => Promise<ActionResult>
  getCategoryBySlug: (slug: string) => Category | undefined
  getCategoryById: (id: string) => Category | undefined
  publishCategories: () => Promise<ActionResult>
  approveShop: (shopId: string) => Promise<ActionResult>
  rejectShop: (shopId: string, reason: string) => Promise<ActionResult>
  suspendShop: (shopId: string, reasonOptional?: string) => Promise<ActionResult>
  reactivateShop: (shopId: string) => Promise<ActionResult>
  toggleShopPublic: (shopId: string) => Promise<ActionResult>
  updateShopSlug: (shopId: string, slug: string) => Promise<ActionResult>
  forceCancelOrder: (orderId: string, reason: string) => Promise<ActionResult>
  triggerRefund: (orderId: string) => Promise<ActionResult>
  getOrderById: (orderId: string) => Order | undefined
  retryVerifyPayment: (paymentId: string) => Promise<ActionResult>
  getPaymentById: (id: string) => Payment | undefined
  approvePayout: (payoutRequestId: string) => Promise<ActionResult>
  rejectPayout: (payoutRequestId: string, reason: string) => Promise<ActionResult>
  completePayout: (payoutRequestId: string) => Promise<ActionResult>
  getLogsForPayout: (payoutRequestId: string) => PayoutLogEntry[]
  createRefund: (input: CreateRefundInput) => Promise<ActionResult>
  setRefundProcessing: (refundId: string) => Promise<ActionResult>
  completeRefund: (refundId: string) => Promise<ActionResult>
  failRefund: (refundId: string, note: string) => Promise<ActionResult>
  getRefundById: (refundId: string) => RefundRecord | undefined
  getLogsForRefund: (refundId: string) => RefundLogEntry[]
  createCoupon: (input: CreateCouponInput) => Promise<ActionResult>
  updateCoupon: (couponId: string, patch: UpdateCouponPatch) => Promise<ActionResult>
  toggleCouponActive: (couponId: string) => Promise<ActionResult>
  updatePlan: (planId: string, patch: UpdatePlanPatch) => Promise<ActionResult>
  togglePlanActive: (planId: string) => Promise<ActionResult>
  getPlanById: (planId: string) => SubscriptionPlan | undefined
  getShopSubscriptionForShop: (shopId: string) => ShopSubscription | undefined
  getExpiringSubscriptions: (days?: number) => ShopSubscription[]
  getCityName: (cityId: string) => string
  getShopName: (shopId: string) => string
  updateConfigValue: (key: string, value: string) => Promise<ActionResult>
  toggleFeatureFlag: (key: string) => Promise<ActionResult>
  getConfigValue: (key: string) => string | undefined
  getConfigBoolean: (key: string) => boolean
  setDefaultCommission: (percentage: number) => Promise<ActionResult>
  upsertCityOverride: (cityId: string, percentage: number) => Promise<ActionResult>
  removeCityOverride: (cityId: string) => Promise<ActionResult>
  upsertCategoryOverride: (categoryId: string, percentage: number) => Promise<ActionResult>
  removeCategoryOverride: (categoryId: string) => Promise<ActionResult>
  upsertShopOverride: (shopId: string, percentage: number) => Promise<ActionResult>
  removeShopOverride: (shopId: string) => Promise<ActionResult>
  getEffectiveCommission: (scope: CommissionScope) => number
}

export type SuperAdminStoreContextValue = SuperAdminState & SuperAdminActions
