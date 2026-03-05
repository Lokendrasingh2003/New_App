import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Shop, ShopStatus } from '../types/shop'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type OwnerApi = {
  id?: string
  phone?: string
  email?: string | null
  name?: string | null
  status?: string
}

type ShopListItemApi = {
  id?: string
  _id?: string
  shopName?: string
  status?: string
  cityId?: string
  createdAt?: string
  owner?: OwnerApi | null
}

type ShopListPayload = {
  shops: ShopListItemApi[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type ShopDetailApi = {
  _id?: string
  shopName?: string
  cityId?: string
  category?: string
  slug?: string
  status?: string
  publicVisible?: boolean
  createdAt?: string
  updatedAt?: string
  phone?: string
}

type ShopDetailPayload = {
  shop: ShopDetailApi
  owner?: OwnerApi | null
  city?: {
    _id?: string
    name?: string
  } | null
  stats?: Record<string, unknown>
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

const toFrontendStatus = (backendStatus?: string): ShopStatus => {
  const normalized = String(backendStatus || '').toUpperCase()

  if (normalized === 'APPROVED') {
    return 'approved'
  }

  if (normalized === 'REJECTED') {
    return 'rejected'
  }

  if (normalized === 'SUSPENDED') {
    return 'suspended'
  }

  return 'pending_approval'
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

const toShop = (detail: ShopDetailApi, owner?: OwnerApi | null, summary?: ShopListItemApi): Shop => ({
  id: String(detail._id || summary?.id || summary?._id || ''),
  shopName: String(detail.shopName || summary?.shopName || ''),
  ownerName: String(owner?.name || summary?.owner?.name || 'Unknown owner'),
  phone: String(owner?.phone || detail.phone || summary?.owner?.phone || ''),
  cityId: String(detail.cityId || summary?.cityId || ''),
  categoryName: String(detail.category || 'Unknown'),
  slug: String(detail.slug || ''),
  status: toFrontendStatus(detail.status || summary?.status),
  isPublic: Boolean(detail.publicVisible),
  rejectReason: undefined,
  createdAt: String(detail.createdAt || summary?.createdAt || new Date().toISOString()),
  updatedAt: String(detail.updatedAt || detail.createdAt || summary?.createdAt || new Date().toISOString()),
})

export const getAdminShopById = async (shopId: string): Promise<Shop> => {
  const { data } = await http.get<ApiEnvelope<ShopDetailPayload>>(`/api/admin/shops/${shopId}`, {
    headers: getAdminHeaders(),
  })

  const payload = data?.data
  if (!payload?.shop) {
    throw new Error(data?.message || 'Shop not found.')
  }

  return toShop(payload.shop, payload.owner)
}

export const listAdminShops = async (): Promise<Shop[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<ShopListPayload>>('/api/admin/shops', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    const shops = data?.data?.shops || []

    const detailed = await Promise.all(
      shops.map(async (summary) => {
        const id = String(summary.id || summary._id || '')
        if (!id) {
          return null
        }

        try {
          const { data: detailResp } = await http.get<ApiEnvelope<ShopDetailPayload>>(`/api/admin/shops/${id}`, {
            headers: getAdminHeaders(),
          })

          const payload = detailResp?.data
          if (!payload?.shop) {
            return toShop(
              {
                _id: id,
                shopName: summary.shopName,
                cityId: summary.cityId,
                status: summary.status,
                createdAt: summary.createdAt,
                updatedAt: summary.createdAt,
                publicVisible: false,
              },
              summary.owner,
              summary,
            )
          }

          return toShop(payload.shop, payload.owner, summary)
        } catch {
          return toShop(
            {
              _id: id,
              shopName: summary.shopName,
              cityId: summary.cityId,
              status: summary.status,
              createdAt: summary.createdAt,
              updatedAt: summary.createdAt,
              publicVisible: false,
            },
            summary.owner,
            summary,
          )
        }
      }),
    )

    return detailed.filter((item): item is Shop => Boolean(item))
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load shops.'))
  }
}

export const approveAdminShop = async (shopId: string): Promise<Shop> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(`/api/admin/shops/${shopId}/approve`, {}, { headers: getAdminHeaders() })
    return await getAdminShopById(shopId)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to approve shop.'))
  }
}

export const rejectAdminShop = async (shopId: string, reason: string): Promise<Shop> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/shops/${shopId}/reject`,
      { reason },
      { headers: getAdminHeaders() },
    )
    return await getAdminShopById(shopId)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to reject shop.'))
  }
}

export const suspendAdminShop = async (shopId: string, reason?: string): Promise<Shop> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/shops/${shopId}/suspend`,
      { reason: reason || '' },
      { headers: getAdminHeaders() },
    )
    return await getAdminShopById(shopId)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to suspend shop.'))
  }
}

export const reactivateAdminShop = async (shopId: string): Promise<Shop> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(`/api/admin/shops/${shopId}/reactivate`, {}, { headers: getAdminHeaders() })
    return await getAdminShopById(shopId)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to reactivate shop.'))
  }
}

export const toggleAdminShopPublic = async (shopId: string, nextPublicVisible: boolean): Promise<Shop> => {
  try {
    await http.patch<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/shops/${shopId}/toggle-public`,
      { publicVisible: nextPublicVisible },
      { headers: getAdminHeaders() },
    )

    return await getAdminShopById(shopId)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update shop visibility.'))
  }
}
