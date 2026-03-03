export type RefundStatus = 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type RefundLogAction = 'CREATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

export type RefundRecord = {
  id: string
  orderId: string
  paymentId: string
  cityId: string
  shopId: string
  amount: number
  status: RefundStatus
  reason: string
  createdAt: string
  updatedAt: string
}

export type RefundLogEntry = {
  id: string
  refundId: string
  action: RefundLogAction
  note?: string
  at: string
}
