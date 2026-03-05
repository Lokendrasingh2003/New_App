import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Coupon, CouponScope } from '../types/Coupon'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type CouponApi = {
  id?: string
  _id?: string
  code?: string
  discountType?: string
  discountValue?: number
  maxDiscount?: number | null
  minOrderValue?: number
  validFrom?: string
  validTill?: string
  maxUsageLimit?: number
  maxUsagePerUser?: number
  applicableCity?: string | null
  applicableShops?: string[]
  applicableCategories?: string[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

type CouponListPayload = {
  coupons: CouponApi[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type CouponWritePayload = {
  coupon?: CouponApi
}

type CouponInput = Omit<Coupon, 'id' | 'createdAt' | 'updatedAt'>

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

const toScope = (item: CouponApi): CouponScope => {
  const cityId = item.applicableCity ? String(item.applicableCity) : undefined
  const categoryId = item.applicableCategories?.[0] ? String(item.applicableCategories[0]) : undefined
  const shopId = item.applicableShops?.[0] ? String(item.applicableShops[0]) : undefined

  if (cityId) {
    return {
      type: 'CITY',
      cityId,
    }
  }

  if (categoryId) {
    return {
      type: 'CATEGORY',
      categoryId,
    }
  }

  if (shopId) {
    return {
      type: 'SHOP',
      shopId,
    }
  }

  return {
    type: 'GLOBAL',
  }
}

const toCoupon = (item: CouponApi): Coupon => ({
  id: String(item._id || item.id || ''),
  code: String(item.code || ''),
  discountType: String(item.discountType || 'FLAT').toUpperCase() as Coupon['discountType'],
  discountValue: item.discountValue !== undefined && item.discountValue !== null ? Number(item.discountValue) : undefined,
  maxDiscount: item.maxDiscount === undefined ? null : item.maxDiscount,
  minOrderValue: item.minOrderValue === undefined ? null : Number(item.minOrderValue),
  validFrom: String(item.validFrom || new Date().toISOString()),
  validTo: String(item.validTill || item.validFrom || new Date().toISOString()),
  usageLimitGlobal: item.maxUsageLimit === undefined ? null : Number(item.maxUsageLimit),
  usageLimitPerUser: item.maxUsagePerUser === undefined ? null : Number(item.maxUsagePerUser),
  scope: toScope(item),
  isActive: Boolean(item.isActive),
  createdAt: String(item.createdAt || new Date().toISOString()),
  updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
})

const toApiPayload = (input: CouponInput) => {
  if (input.discountType === 'FREE_DELIVERY') {
    throw new Error('Backend coupons currently support only FLAT and PERCENT discount types.')
  }

  return {
    code: input.code,
    discountType: input.discountType,
    discountValue: Number(input.discountValue || 0),
    maxDiscount: input.maxDiscount ?? null,
    minOrderValue: Number(input.minOrderValue || 0),
    maxUsageLimit: Number(input.usageLimitGlobal || 0),
    maxUsagePerUser: Number(input.usageLimitPerUser || 0),
    validFrom: input.validFrom,
    validTill: input.validTo,
    applicableCity: input.scope.type === 'CITY' ? input.scope.cityId || null : null,
    applicableShops: input.scope.type === 'SHOP' && input.scope.shopId ? [input.scope.shopId] : [],
    applicableCategories: input.scope.type === 'CATEGORY' && input.scope.categoryId ? [input.scope.categoryId] : [],
    isActive: input.isActive,
  }
}

export const listAdminCoupons = async (): Promise<Coupon[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<CouponListPayload>>('/api/admin/coupons', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.coupons || []).map(toCoupon)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load coupons.'))
  }
}

export const createAdminCoupon = async (input: CouponInput): Promise<void> => {
  try {
    await http.post<ApiEnvelope<CouponWritePayload>>('/api/admin/coupons', toApiPayload(input), {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create coupon.'))
  }
}

export const updateAdminCoupon = async (couponId: string, input: CouponInput): Promise<void> => {
  try {
    await http.put<ApiEnvelope<CouponWritePayload>>(`/api/admin/coupons/${couponId}`, toApiPayload(input), {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update coupon.'))
  }
}

export const toggleAdminCouponActive = async (couponId: string, isActive: boolean): Promise<void> => {
  try {
    await http.patch<ApiEnvelope<CouponWritePayload>>(
      `/api/admin/coupons/${couponId}/toggle-active`,
      { isActive },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update coupon status.'))
  }
}
