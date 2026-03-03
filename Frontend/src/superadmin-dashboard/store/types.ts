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
  initializeFromStorageOrSeed: () => void
  resetAllDemoData: () => void
  appendAuditEvent: (type: AuditEventType, message: string, meta?: AuditEventMeta) => void
  clearAuditEvents: () => ActionResult
  addCity: (input: CityUpsertInput) => ActionResult
  updateCity: (cityId: string, patch: Partial<CityUpsertInput>) => ActionResult
  toggleCityActive: (cityId: string) => ActionResult
  toggleCityDelivery: (cityId: string) => ActionResult
  addCategory: (name: string) => ActionResult
  updateCategory: (categoryId: string, patch: CategoryUpdatePatch) => ActionResult
  addSubcategory: (categoryId: string, name: string) => ActionResult
  removeSubcategory: (categoryId: string, name: string) => ActionResult
  getCategoryBySlug: (slug: string) => Category | undefined
  getCategoryById: (id: string) => Category | undefined
  publishCategories: () => ActionResult
  approveShop: (shopId: string) => ActionResult
  rejectShop: (shopId: string, reason: string) => ActionResult
  suspendShop: (shopId: string, reasonOptional?: string) => ActionResult
  reactivateShop: (shopId: string) => ActionResult
  toggleShopPublic: (shopId: string) => ActionResult
  updateShopSlug: (shopId: string, slug: string) => ActionResult
  forceCancelOrder: (orderId: string, reason: string) => ActionResult
  triggerRefund: (orderId: string) => ActionResult
  getOrderById: (orderId: string) => Order | undefined
  retryVerifyPayment: (paymentId: string) => ActionResult
  getPaymentById: (id: string) => Payment | undefined
  approvePayout: (payoutRequestId: string) => ActionResult
  rejectPayout: (payoutRequestId: string, reason: string) => ActionResult
  completePayout: (payoutRequestId: string) => ActionResult
  getLogsForPayout: (payoutRequestId: string) => PayoutLogEntry[]
  createRefund: (input: CreateRefundInput) => ActionResult
  setRefundProcessing: (refundId: string) => ActionResult
  completeRefund: (refundId: string) => ActionResult
  failRefund: (refundId: string, note: string) => ActionResult
  getRefundById: (refundId: string) => RefundRecord | undefined
  getLogsForRefund: (refundId: string) => RefundLogEntry[]
  createCoupon: (input: CreateCouponInput) => ActionResult
  updateCoupon: (couponId: string, patch: UpdateCouponPatch) => ActionResult
  toggleCouponActive: (couponId: string) => ActionResult
  updatePlan: (planId: string, patch: UpdatePlanPatch) => ActionResult
  togglePlanActive: (planId: string) => ActionResult
  getPlanById: (planId: string) => SubscriptionPlan | undefined
  getShopSubscriptionForShop: (shopId: string) => ShopSubscription | undefined
  getExpiringSubscriptions: (days?: number) => ShopSubscription[]
  getCityName: (cityId: string) => string
  getShopName: (shopId: string) => string
  updateConfigValue: (key: string, value: string) => ActionResult
  toggleFeatureFlag: (key: string) => ActionResult
  getConfigValue: (key: string) => string | undefined
  getConfigBoolean: (key: string) => boolean
  setDefaultCommission: (percentage: number) => ActionResult
  upsertCityOverride: (cityId: string, percentage: number) => ActionResult
  removeCityOverride: (cityId: string) => ActionResult
  upsertCategoryOverride: (categoryId: string, percentage: number) => ActionResult
  removeCategoryOverride: (categoryId: string) => ActionResult
  upsertShopOverride: (shopId: string, percentage: number) => ActionResult
  removeShopOverride: (shopId: string) => ActionResult
  getEffectiveCommission: (scope: CommissionScope) => number
}

export type SuperAdminStoreContextValue = SuperAdminState & SuperAdminActions
