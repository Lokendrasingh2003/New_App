import api from '../../utils/axiosInstance'
import type { Order, OrderDetail, OrderStatus, PaymentMode } from '../types/order'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type OrderListApiModel = {
  orderId: string
  customerName: string
  total: number
  status: OrderStatus
  date: string
}

type OrderDetailApiModel = {
  _id?: string
  id?: string
  orderId: string
  status: OrderStatus
  statusHistory?: Array<{ status: OrderStatus; timestamp: string; note?: string }>
  customer?: {
    id?: string | null
    name?: string | null
    phone?: string | null
  }
  items?: Array<{
    productId: string
    productName: string
    variantId?: string | null
    variantLabel: string
    quantity: number
    price: number
    image?: string | null
  }>
  deliveryAddress?: {
    addressLine1?: string
    area?: string
    city?: string
    pincode?: string
    phone?: string
  } | null
  pricing?: {
    subtotal?: number
    discount?: number
    deliveryCharge?: number
    tax?: number
    total?: number
  }
  payment?: {
    mode?: PaymentMode
    status?: string
    transactionId?: string | null
  }
  specialInstructions?: string | null
  createdAt?: string
  updatedAt?: string
}

type OrdersListPayload = {
  orders: OrderListApiModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type OrderDetailPayload = {
  order: OrderDetailApiModel
}

export type OrdersQuery = {
  status?: OrderStatus
  dateFrom?: string
  dateTo?: string
  search?: string
  sort?: 'recent' | 'price' | 'status'
  limit?: number
  offset?: number
}

export type OrdersResponse = {
  orders: Order[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

const mapListOrder = (order: OrderListApiModel): Order => ({
  id: String(order.orderId),
  shortId: String(order.orderId),
  customerName: String(order.customerName || 'Customer'),
  customerPhone: '-',
  total: Number(order.total || 0),
  paymentMode: 'COD',
  status: order.status,
  createdAt: String(order.date || new Date().toISOString()),
  itemsCount: 0,
})

const mapDetailOrder = (order: OrderDetailApiModel): OrderDetail => ({
  id: String(order.id || order._id || order.orderId),
  orderId: String(order.orderId),
  status: order.status,
  statusHistory: (order.statusHistory || []).map((item) => ({
    status: item.status,
    timestamp: item.timestamp,
    note: item.note,
  })),
  customer: {
    id: order.customer?.id || null,
    name: order.customer?.name || null,
    phone: order.customer?.phone || null,
  },
  items: (order.items || []).map((item) => ({
    productId: String(item.productId),
    productName: String(item.productName),
    variantId: item.variantId || null,
    variantLabel: String(item.variantLabel || 'Default'),
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    image: item.image || null,
  })),
  deliveryAddress: order.deliveryAddress || null,
  pricing: {
    subtotal: Number(order.pricing?.subtotal || 0),
    discount: Number(order.pricing?.discount || 0),
    deliveryCharge: Number(order.pricing?.deliveryCharge || 0),
    tax: Number(order.pricing?.tax || 0),
    total: Number(order.pricing?.total || 0),
  },
  payment: {
    mode: (order.payment?.mode as PaymentMode) || 'COD',
    status: order.payment?.status,
    transactionId: order.payment?.transactionId || null,
  },
  specialInstructions: order.specialInstructions || null,
  createdAt: String(order.createdAt || new Date().toISOString()),
  updatedAt: String(order.updatedAt || new Date().toISOString()),
})

const ensureOrderDetail = (payload: OrderDetailPayload | undefined, fallbackMessage: string): OrderDetail => {
  const order = payload?.order
  if (!order) {
    throw new Error(fallbackMessage)
  }

  return mapDetailOrder(order)
}

const encodeOrderId = (orderId: string) => encodeURIComponent(orderId)

export const getOrders = async (shopId: string, query: OrdersQuery = {}): Promise<OrdersResponse> => {
  const { data } = await api.get<ApiEnvelope<OrdersListPayload>>(`/api/shops/${shopId}/orders`, {
    params: query,
  })

  const payload = data?.data
  if (!payload) {
    throw new Error(data?.message || 'Unable to load orders.')
  }

  return {
    orders: (payload.orders || []).map(mapListOrder),
    pagination: payload.pagination,
  }
}

export const getOrder = async (shopId: string, orderId: string): Promise<OrderDetail> => {
  const { data } = await api.get<ApiEnvelope<OrderDetailPayload>>(`/api/shops/${shopId}/orders/${encodeOrderId(orderId)}`)
  return ensureOrderDetail(data?.data, data?.message || 'Unable to load order details.')
}

export const updateOrderStatus = async (
  shopId: string,
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<OrderDetail> => {
  const { data } = await api.put<ApiEnvelope<OrderDetailPayload>>(`/api/shops/${shopId}/orders/${encodeOrderId(orderId)}`, {
    status,
    note,
  })

  return ensureOrderDetail(data?.data, data?.message || 'Unable to update order status.')
}

export const acceptOrder = async (shopId: string, orderId: string): Promise<OrderDetail> => {
  const { data } = await api.post<ApiEnvelope<OrderDetailPayload>>(`/api/shops/${shopId}/orders/${encodeOrderId(orderId)}/accept`, {})
  return ensureOrderDetail(data?.data, data?.message || 'Unable to accept order.')
}

export const markOrderReady = async (shopId: string, orderId: string): Promise<OrderDetail> => {
  const { data } = await api.post<ApiEnvelope<OrderDetailPayload>>(`/api/shops/${shopId}/orders/${encodeOrderId(orderId)}/mark-ready`, {})
  return ensureOrderDetail(data?.data, data?.message || 'Unable to mark order ready.')
}

export const rejectOrder = async (shopId: string, orderId: string, reason: string): Promise<OrderDetail> => {
  const { data } = await api.post<ApiEnvelope<OrderDetailPayload>>(`/api/shops/${shopId}/orders/${encodeOrderId(orderId)}/reject`, {
    reason,
  })

  return ensureOrderDetail(data?.data, data?.message || 'Unable to reject order.')
}
