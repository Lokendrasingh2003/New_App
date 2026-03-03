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
