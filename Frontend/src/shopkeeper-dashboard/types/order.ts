export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

export type PaymentMode = 'COD' | 'ONLINE'

export interface Order {
  id: string
  shortId: string
  customerName: string
  customerPhone: string
  total: number
  paymentMode: PaymentMode
  status: OrderStatus
  cancelReason?: string
  createdAt: string // ISO format
  itemsCount: number
}

export interface OrderItem {
  productId: string
  productName: string
  variantId?: string | null
  variantLabel: string
  quantity: number
  price: number
  image?: string | null
}

export interface OrderStatusHistoryItem {
  status: OrderStatus
  timestamp: string
  note?: string
}

export interface OrderDetail {
  id: string
  orderId: string
  status: OrderStatus
  statusHistory: OrderStatusHistoryItem[]
  customer: {
    id?: string | null
    name?: string | null
    phone?: string | null
  }
  items: OrderItem[]
  deliveryAddress?: {
    addressLine1?: string
    area?: string
    city?: string
    pincode?: string
    phone?: string
  } | null
  pricing: {
    subtotal: number
    discount: number
    deliveryCharge: number
    tax: number
    total: number
  }
  payment: {
    mode: PaymentMode
    status?: string
    transactionId?: string | null
  }
  specialInstructions?: string | null
  createdAt: string
  updatedAt: string
}
