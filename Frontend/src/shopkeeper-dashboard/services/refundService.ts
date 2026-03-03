import api from '../../utils/axiosInstance'

export type RefundQuery = {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}

export type RefundCreatePayload = {
  paymentId: string
  orderId: string
  reason: string
  refundAmount: number
  refundMode: 'BANK_TRANSFER' | 'UPI' | 'WALLET'
  note?: string
}

export type RefundProcessPayload = {
  status?: string
  bankDetails?: {
    accountNumber: string
    ifscCode: string
    bankName: string
  }
  transactionRef?: string
  note?: string
}

export type RefundStats = {
  totalRefunds: number
  requestedRefunds: number
  processingRefunds: number
  completedRefunds: number
  failedRefunds: number
  totalRefundAmount: number
  averageProcessingTime: number
}

export type RefundItem = {
  _id: string
  paymentId: string
  orderId: string
  userId?: { _id?: string; name?: string; phone?: string }
  refundAmount: number
  reason: string
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  refundMode: 'BANK_TRANSFER' | 'UPI' | 'WALLET'
  bankDetails?: {
    accountNumber?: string
    ifscCode?: string
    bankName?: string
  }
  transactionRef?: string | null
  statusHistory?: Array<{
    status: string
    timestamp: string
    note?: string
  }>
  createdAt: string
  updatedAt: string
  processedAt?: string | null
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type RefundListPayload = {
  refunds: RefundItem[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type RefundSinglePayload = {
  refund: RefundItem
}

export const refundService = {
  getRefunds: async (shopkeeperId: string, query: RefundQuery) => {
    const { data } = await api.get<ApiEnvelope<RefundListPayload>>(`/api/shopkeeper/${shopkeeperId}/refunds`, {
      params: query,
    })

    if (!data?.data) {
      throw new Error(data?.message || 'Unable to load refunds.')
    }

    return data.data
  },

  getRefundById: async (shopkeeperId: string, refundId: string) => {
    const { data } = await api.get<ApiEnvelope<RefundSinglePayload>>(`/api/shopkeeper/${shopkeeperId}/refunds/${refundId}`)

    if (!data?.data?.refund) {
      throw new Error(data?.message || 'Unable to load refund details.')
    }

    return data.data.refund
  },

  getRefundStats: async (shopkeeperId: string): Promise<RefundStats> => {
    const { data } = await api.get<ApiEnvelope<RefundStats>>(`/api/shopkeeper/${shopkeeperId}/refunds/stats`)

    if (!data?.data) {
      throw new Error(data?.message || 'Unable to load refund stats.')
    }

    return data.data
  },

  createRefund: async (shopkeeperId: string, payload: RefundCreatePayload) => {
    const { data } = await api.post<ApiEnvelope<RefundSinglePayload>>(`/api/shopkeeper/${shopkeeperId}/refunds`, payload)

    if (!data?.data?.refund) {
      throw new Error(data?.message || 'Unable to create refund.')
    }

    return data.data.refund
  },

  updateRefund: async (shopkeeperId: string, refundId: string, payload: RefundProcessPayload) => {
    const { data } = await api.put<ApiEnvelope<RefundSinglePayload>>(`/api/shopkeeper/${shopkeeperId}/refunds/${refundId}`, payload)

    if (!data?.data?.refund) {
      throw new Error(data?.message || 'Unable to update refund.')
    }

    return data.data.refund
  },

  processRefund: async (shopkeeperId: string, refundId: string, payload: RefundProcessPayload) => {
    const { data } = await api.post<ApiEnvelope<RefundSinglePayload>>(
      `/api/shopkeeper/${shopkeeperId}/refunds/${refundId}/process`,
      payload
    )

    if (!data?.data?.refund) {
      throw new Error(data?.message || 'Unable to process refund.')
    }

    return data.data.refund
  },
}
