import api from '../../utils/axiosInstance'

export type ShopSettings = {
  id: string
  shopName: string
  ownerName?: string
  phone: string
  city: string
  addressLine1: string
  area: string
  pincode: string
  slug: string
  publicUrl: string
  delivery: {
    payer: 'CUSTOMER' | 'SHOP'
    chargeAmount: number
    serviceRadiusKm: number
  }
  businessHours: {
    open: string
    close: string
    closedDays?: string[]
  }
  updatedAt: string
}

export type ShopSettingsUpdateInput = {
  shopName: string
  ownerName: string
  phone: string
  city: string
  addressLine1: string
  area: string
  pincode: string
  slug?: string
  delivery: {
    payer: 'CUSTOMER' | 'SHOP'
    chargeAmount: number
    serviceRadiusKm: number
  }
  businessHours: {
    open: string
    close: string
  }
}

export type ShopPublicLink = {
  slug: string
  publicUrl: string
}

export type ShopQrCode = {
  qrCodeImage: string
  shopLink: string
  createdAt?: string
}

export type ShopStatsSnapshot = {
  totalOrders: number
  totalEarnings: number
  averageRating: number
  reviewCount: number
  totalProducts: number
  totalCategories: number
  activeOffers: number
  todayOrders: number
  todayEarnings: number
  lastUpdated?: string
}

export type ShopDashboardData = {
  productCount: number
  orderCount: number
  deliveredOrders: number
  totalEarnings: number
  ownerName?: string
}

export type TodayStats = {
  todayOrders: number
  todayEarnings: number
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type SettingsResponsePayload = {
  shop: {
    id: string
    shopName: string
    ownerName?: string | null
    phone: string
    city: string
    addressLine1: string
    area: string
    pincode: string
    slug: string
    publicUrl: string
    delivery: {
      payer: 'CUSTOMER' | 'SHOP'
      chargeAmount: number
      serviceRadiusKm: number
    }
    businessHours: {
      open: string
      close: string
      closedDays?: string[]
    }
    updatedAt: string
  }
}

type PublicLinkPayload = {
  publicUrl: string
  slug: string
}

type QrCodePayload = {
  qrCodeImage: string
  shopLink: string
  createdAt?: string
}

type UpdateSlugPayload = {
  slug?: string
  publicUrl?: string
  shop?: {
    slug?: string
    publicUrl?: string
  }
}

type ShopStatsPayload = {
  totalOrders?: number
  totalEarnings?: number
  averageRating?: number
  reviewCount?: number
  totalProducts?: number
  totalCategories?: number
  activeOffers?: number
  todayOrders?: number
  todayEarnings?: number
  lastUpdated?: string
}

type ShopDashboardPayload = {
  ownerName?: string | null
  stats?: {
    productCount?: number
    orderCount?: number
    deliveredOrders?: number
    totalEarnings?: number
  }
}

const toShopSettings = (shop: SettingsResponsePayload['shop']): ShopSettings => ({
  id: shop.id,
  shopName: shop.shopName,
  ownerName: shop.ownerName || undefined,
  phone: shop.phone,
  city: shop.city,
  addressLine1: shop.addressLine1,
  area: shop.area,
  pincode: shop.pincode,
  slug: shop.slug,
  publicUrl: shop.publicUrl,
  delivery: {
    payer: shop.delivery.payer,
    chargeAmount: Number(shop.delivery.chargeAmount || 0),
    serviceRadiusKm: Number(shop.delivery.serviceRadiusKm || 0),
  },
  businessHours: {
    open: shop.businessHours.open,
    close: shop.businessHours.close,
    closedDays: shop.businessHours.closedDays || [],
  },
  updatedAt: shop.updatedAt,
})

const toShopPublicLink = (payload: PublicLinkPayload | UpdateSlugPayload | undefined): ShopPublicLink => {
  const base = (payload as UpdateSlugPayload | undefined)?.shop || payload
  const slug = String(base?.slug || '')
  const publicUrl = String((base as { publicUrl?: string } | undefined)?.publicUrl || '')

  if (!slug || !publicUrl) {
    throw new Error('Unable to resolve shop public link.')
  }

  return {
    slug,
    publicUrl,
  }
}

const toShopStatsSnapshot = (payload: ShopStatsPayload | undefined): ShopStatsSnapshot => {
  if (!payload) {
    throw new Error('Unable to load shop stats.')
  }

  return {
    totalOrders: Number(payload.totalOrders || 0),
    totalEarnings: Number(payload.totalEarnings || 0),
    averageRating: Number(payload.averageRating || 0),
    reviewCount: Number(payload.reviewCount || 0),
    totalProducts: Number(payload.totalProducts || 0),
    totalCategories: Number(payload.totalCategories || 0),
    activeOffers: Number(payload.activeOffers || 0),
    todayOrders: Number(payload.todayOrders || 0),
    todayEarnings: Number(payload.todayEarnings || 0),
    lastUpdated: payload.lastUpdated,
  }
}

const toShopDashboardData = (payload: ShopDashboardPayload | undefined): ShopDashboardData => {
  const stats = payload?.stats

  if (!stats) {
    throw new Error('Unable to load dashboard data.')
  }

  return {
    ownerName: payload?.ownerName || undefined,
    productCount: Number(stats.productCount || 0),
    orderCount: Number(stats.orderCount || 0),
    deliveredOrders: Number(stats.deliveredOrders || 0),
    totalEarnings: Number(stats.totalEarnings || 0),
  }
}

export const getShopSettings = async (shopId: string): Promise<ShopSettings> => {
  const { data } = await api.get<ApiEnvelope<SettingsResponsePayload>>(`/api/shops/${shopId}/settings`)

  const shop = data?.data?.shop
  if (!shop) {
    throw new Error(data?.message || 'Unable to load shop settings.')
  }

  return toShopSettings(shop)
}

export const updateShopSettings = async (shopId: string, payload: ShopSettingsUpdateInput): Promise<ShopSettings> => {
  const { data } = await api.put<ApiEnvelope<SettingsResponsePayload>>(`/api/shops/${shopId}/settings`, payload)

  const shop = data?.data?.shop
  if (!shop) {
    throw new Error(data?.message || 'Unable to update shop settings.')
  }

  return toShopSettings({ ...shop, ownerName: payload.ownerName })
}

export const updateBusinessHours = async (
  shopId: string,
  payload: { open: string; close: string; closedDays?: string[] }
): Promise<ShopSettings> => {
  const { data } = await api.patch<ApiEnvelope<SettingsResponsePayload>>(`/api/shops/${shopId}/business-hours`, payload)

  const shop = data?.data?.shop
  if (!shop) {
    throw new Error(data?.message || 'Unable to update business hours.')
  }

  return toShopSettings(shop)
}

export const updateDeliveryConfig = async (
  shopId: string,
  payload: { payer: 'CUSTOMER' | 'SHOP'; chargeAmount: number; serviceRadiusKm: number }
): Promise<ShopSettings> => {
  const { data } = await api.patch<ApiEnvelope<SettingsResponsePayload>>(`/api/shops/${shopId}/delivery-config`, payload)

  const shop = data?.data?.shop
  if (!shop) {
    throw new Error(data?.message || 'Unable to update delivery settings.')
  }

  return toShopSettings(shop)
}

export const getPublicLink = async (shopId: string): Promise<ShopPublicLink> => {
  const { data } = await api.get<ApiEnvelope<PublicLinkPayload>>(`/api/shops/${shopId}/public-link`)
  return toShopPublicLink(data?.data)
}

export const getQRCode = async (shopId: string): Promise<ShopQrCode> => {
  const { data } = await api.get<ApiEnvelope<QrCodePayload>>(`/api/shops/${shopId}/qr-code`)

  const payload = data?.data
  if (!payload?.qrCodeImage || !payload?.shopLink) {
    throw new Error(data?.message || 'Unable to load QR code.')
  }

  return {
    qrCodeImage: payload.qrCodeImage,
    shopLink: payload.shopLink,
    createdAt: payload.createdAt,
  }
}

export const updateSlug = async (shopId: string, slug: string): Promise<ShopPublicLink> => {
  const { data } = await api.patch<ApiEnvelope<UpdateSlugPayload>>(`/api/shops/${shopId}/slug`, {
    slug,
  })

  return toShopPublicLink(data?.data)
}

export const getShopStats = async (shopId: string): Promise<ShopStatsSnapshot> => {
  const { data } = await api.get<ApiEnvelope<ShopStatsPayload>>(`/api/shops/${shopId}/stats`)
  return toShopStatsSnapshot(data?.data)
}

export const getShopDashboard = async (shopId: string): Promise<ShopDashboardData> => {
  const { data } = await api.get<ApiEnvelope<ShopDashboardPayload>>(`/api/shops/${shopId}/dashboard`)
  return toShopDashboardData(data?.data)
}

export const getTodayStats = async (shopId: string): Promise<TodayStats> => {
  const stats = await getShopStats(shopId)
  return {
    todayOrders: stats.todayOrders,
    todayEarnings: stats.todayEarnings,
  }
}
