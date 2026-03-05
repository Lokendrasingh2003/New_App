import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Order, OrderStatus, PaymentStatus } from '../types/Order'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type AdminOrderSummary = {
  id?: string
  orderId?: string
  status?: string
  paymentStatus?: string | null
  amount?: number
  customer?: {
    phone?: string | null
  } | null
  shop?: {
    id?: string
    cityId?: string
  } | null
  createdAt?: string
  updatedAt?: string
}

type OrderListPayload = {
  orders: AdminOrderSummary[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type RefundPayload = {
  refund?: {
    id?: string
    status?: string
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

const mapOrderStatus = (status: string | undefined, paymentStatus: PaymentStatus): OrderStatus => {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'CANCELLED') {
    return 'cancelled'
  }

  if (normalized === 'DELIVERED') {
    return 'delivered'
  }

  if (normalized === 'DISPATCHED') {
    return 'out_for_delivery'
  }

  if (normalized === 'PREPARING') {
    return 'preparing'
  }

  if (normalized === 'ACCEPTED') {
    return 'accepted'
  }

  if (normalized === 'NEW') {
    return paymentStatus === 'pending' ? 'pending_payment' : 'confirmed'
  }

  return 'confirmed'
}

const mapPaymentStatus = (status: string | null | undefined): PaymentStatus => {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'SUCCESS') {
    return 'success'
  }

  if (normalized === 'FAILED') {
    return 'failed'
  }

  if (normalized === 'REFUNDED') {
    return 'refunded'
  }

  return 'pending'
}

const mapOrder = (order: AdminOrderSummary): Order => {
  const paymentStatus = mapPaymentStatus(order.paymentStatus)
  const status = mapOrderStatus(order.status, paymentStatus)
  const eventAt = String(order.updatedAt || order.createdAt || new Date().toISOString())

  return {
    id: String(order.orderId || order.id || ''),
    cityId: String(order.shop?.cityId || ''),
    shopId: String(order.shop?.id || ''),
    userPhone: String(order.customer?.phone || ''),
    total: Number(order.amount || 0),
    status,
    paymentStatus,
    createdAt: String(order.createdAt || eventAt),
    updatedAt: String(order.updatedAt || eventAt),
    statusLogs: [
      {
        status,
        at: eventAt,
      },
    ],
  }
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

export const listAdminOrders = async (): Promise<Order[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<OrderListPayload>>('/api/admin/orders', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.orders || []).map(mapOrder)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load orders.'))
  }
}

export const forceCancelAdminOrder = async (orderId: string, reason: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/orders/${orderId}/force-cancel`,
      { reason },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to force cancel order.'))
  }
}

export const triggerAdminRefund = async (orderId: string, reason = 'Refund triggered by super admin'): Promise<void> => {
  try {
    await http.post<ApiEnvelope<RefundPayload>>(
      '/api/admin/refunds',
      { orderId, reason },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to trigger refund.'))
  }
}
