export type PayoutRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

export type PayoutLogAction = 'CREATED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'

export type PayoutRequest = {
  id: string
  shopId: string
  amount: number
  status: PayoutRequestStatus
  requestedAt: string
  processedAt?: string
  rejectReason?: string
}

export type PayoutLogEntry = {
  id: string
  payoutRequestId: string
  action: PayoutLogAction
  note?: string
  at: string
}
