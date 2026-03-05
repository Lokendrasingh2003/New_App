import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type DefaultCommissionPayload = {
  percentage?: number
  effectiveFrom?: string
}

type OverrideApi = {
  _id?: string
  shopId?: string
  percentage?: number
  effectiveFrom?: string
  effectiveTill?: string | null
  createdAt?: string
  updatedAt?: string
}

type OverridesPayload = {
  overrides: OverrideApi[]
}

export type ShopOverrideRecord = {
  overrideId: string
  shopId: string
  percentage: number
  updatedAt: string
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

export const getAdminDefaultCommission = async (): Promise<number> => {
  try {
    const { data } = await http.get<ApiEnvelope<DefaultCommissionPayload>>('/api/admin/commission/default', {
      headers: getAdminHeaders(),
    })

    return Number(data?.data?.percentage || 0)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load default commission.'))
  }
}

export const listAdminShopCommissionOverrides = async (): Promise<ShopOverrideRecord[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<OverridesPayload>>('/api/admin/commission/overrides', {
      headers: getAdminHeaders(),
    })

    return (data?.data?.overrides || []).map((item) => ({
      overrideId: String(item._id || ''),
      shopId: String(item.shopId || ''),
      percentage: Number(item.percentage || 0),
      updatedAt: String(item.updatedAt || item.effectiveFrom || item.createdAt || new Date().toISOString()),
    }))
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load commission overrides.'))
  }
}

export const updateAdminDefaultCommission = async (percentage: number): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      '/api/admin/commission/default',
      { percentage },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update default commission.'))
  }
}

export const createAdminShopCommissionOverride = async (shopId: string, percentage: number): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      '/api/admin/commission/override',
      { shopId, percentage },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to save shop commission override.'))
  }
}

export const removeAdminShopCommissionOverride = async (overrideId: string): Promise<void> => {
  try {
    await http.delete<ApiEnvelope<Record<string, unknown>>>(`/api/admin/commission/override/${overrideId}`, {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to remove shop commission override.'))
  }
}
