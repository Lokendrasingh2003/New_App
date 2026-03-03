export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED'

export type Payment = {
  id: string
  orderId: string
  cityId: string
  shopId: string
  userPhone: string
  amount: number
  method: PaymentMethod
  gatewayTransactionId: string
  status: PaymentStatus
  createdAt: string
  updatedAt: string
  failureReason?: string
}
