import api from '../../utils/axiosInstance'

export type PaymentQuery = {
  status?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  limit?: number
  offset?: number
}

export type PaymentStats = {
  totalPayments: number
  successfulPayments: number
  failedPayments: number
  pendingPayments: number
  totalAmount: number
  totalCommission: number
  netEarnings: number
  successRate: number
}

export type PaymentItem = {
  _id: string
  orderId: string
  userId?: { _id?: string; name?: string; phone?: string }
  amount: number
  paymentMode: 'COD' | 'ONLINE'
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  transactionId?: string | null
  commission: {
    percentage: number
    amount: number
    payableAmount: number
  }
  processedAt?: string | null
  createdAt: string
}

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type PaymentsPayload = {
  payments: PaymentItem[]
  totals?: {
    successful: number
    pending: number
    failed: number
  }
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type PaymentDetailPayload = {
  payment: PaymentItem & {
    orderId?: {
      _id?: string
      orderId?: string
      items?: Array<{ productName: string; price: number; quantity: number }>
      pricing?: {
        total?: number
        deliveryCharge?: number
      }
    }
  }
}

export const paymentService = {
  getPayments: async (shopkeeperId: string, query: PaymentQuery) => {
    const { data } = await api.get<ApiEnvelope<PaymentsPayload>>(`/api/shopkeeper/${shopkeeperId}/payments`, {
      params: query,
    })

    if (!data?.data) {
      throw new Error(data?.message || 'Unable to load payments.')
    }

    return data.data
  },

  getPaymentById: async (shopkeeperId: string, paymentId: string) => {
    const { data } = await api.get<ApiEnvelope<PaymentDetailPayload>>(`/api/shopkeeper/${shopkeeperId}/payments/${paymentId}`)

    if (!data?.data?.payment) {
      throw new Error(data?.message || 'Unable to load payment details.')
    }

    return data.data.payment
  },

  getPaymentStats: async (shopkeeperId: string): Promise<PaymentStats> => {
    const { data } = await api.get<ApiEnvelope<PaymentStats>>(`/api/shopkeeper/${shopkeeperId}/payments/stats`)

    if (!data?.data) {
      throw new Error(data?.message || 'Unable to load payment stats.')
    }

    return data.data
  },

  verifyPayment: async (shopkeeperId: string, paymentId: string, transactionDetails?: Record<string, unknown>) => {
    const { data } = await api.post<ApiEnvelope<{ payment: PaymentItem }>>(
      `/api/shopkeeper/${shopkeeperId}/payments/${paymentId}/verify`,
      { transactionDetails }
    )

    return data.data
  },

  bulkStatusUpdate: async (shopkeeperId: string, paymentIds: string[], status: string) => {
    const { data } = await api.post<ApiEnvelope<{ updated: number; failed: number }>>(
      `/api/shopkeeper/${shopkeeperId}/payments/bulk-status-update`,
      {
        paymentIds,
        status,
      }
    )

    if (!data?.data) {
      throw new Error(data?.message || 'Unable to update payment status.')
    }

    return data.data
  },
}
