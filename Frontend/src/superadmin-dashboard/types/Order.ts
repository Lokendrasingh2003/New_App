export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded'

export type OrderStatusLog = {
  status: OrderStatus
  at: string
  note?: string
}

export type Order = {
  id: string
  cityId: string
  shopId: string
  userPhone: string
  total: number
  status: OrderStatus
  paymentStatus: PaymentStatus
  createdAt: string
  updatedAt: string
  statusLogs: OrderStatusLog[]
}
