import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { AdminUser, AdminUserDetail } from '../types/user'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type BackendUser = {
  id: string
  phone: string
  isVerified: boolean
  role?: 'USER' | 'SHOPKEEPER'
  shopkeeperId?: string | null
  shopId?: string | null
  shopName?: string | null
  name: string | null
  email: string | null
  cityId: string | null
  cityName: string | null
  referralCode: string | null
  referredBy: string | null
  addressesCount: number
  savedPaymentMethodsCount: number
  defaultAddress: AdminUser['defaultAddress']
  orderStats: AdminUser['orderStats']
  shopRegistrationStats: AdminUser['shopRegistrationStats']
  createdAt: string
  updatedAt: string
}

type ListUsersPayload = {
  users: BackendUser[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type UserDetailPayload = {
  user: AdminUserDetail
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

const toFrontendUser = (user: BackendUser): AdminUser => ({
  ...user,
  id: String(user.id || ''),
  phone: String(user.phone || ''),
  name: user.name || null,
  email: user.email || null,
  cityId: user.cityId || null,
  cityName: user.cityName || null,
  referralCode: user.referralCode || null,
  referredBy: user.referredBy || null,
  addressesCount: Number(user.addressesCount || 0),
  savedPaymentMethodsCount: Number(user.savedPaymentMethodsCount || 0),
  orderStats: {
    count: Number(user.orderStats?.count || 0),
    totalSpent: Number(user.orderStats?.totalSpent || 0),
    lastOrderAt: user.orderStats?.lastOrderAt || null,
  },
  shopRegistrationStats: {
    applications: Number(user.shopRegistrationStats?.applications || 0),
    approved: Number(user.shopRegistrationStats?.approved || 0),
    pending: Number(user.shopRegistrationStats?.pending || 0),
    rejected: Number(user.shopRegistrationStats?.rejected || 0),
  },
  role: user.role === 'SHOPKEEPER' ? 'SHOPKEEPER' : 'USER',
  shopkeeperId: user.shopkeeperId || null,
  shopId: user.shopId || null,
  shopName: user.shopName || null,
  createdAt: String(user.createdAt || new Date().toISOString()),
  updatedAt: String(user.updatedAt || new Date().toISOString()),
})

export const listAdminUsers = async (query?: {
  search?: string
  verified?: 'all' | 'verified' | 'unverified'
}): Promise<AdminUser[]> => {
  try {
    const verifiedValue =
      query?.verified === 'verified' ? true : query?.verified === 'unverified' ? false : undefined

    const { data } = await http.get<ApiEnvelope<ListUsersPayload>>('/api/admin/users', {
      params: {
        limit: 100,
        offset: 0,
        search: query?.search?.trim() || undefined,
        verified: verifiedValue,
      },
      headers: getAdminHeaders(),
    })

    return (data?.data?.users || []).map(toFrontendUser)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch users.'))
  }
}

export const getAdminUserById = async (userId: string): Promise<AdminUserDetail> => {
  try {
    const { data } = await http.get<ApiEnvelope<UserDetailPayload>>(`/api/admin/users/${userId}`, {
      headers: getAdminHeaders(),
    })

    const user = data?.data?.user
    if (!user) {
      throw new Error(data?.message || 'User not found.')
    }

    return user
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to fetch user details.'))
  }
}
