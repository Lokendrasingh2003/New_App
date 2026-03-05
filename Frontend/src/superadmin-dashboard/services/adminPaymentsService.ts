import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Payment, PaymentMethod, PaymentStatus } from '../types/Payment'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type PaymentApi = {
  id?: string
  _id?: string
  orderId?: string
  shopId?: string
  amount?: number
  status?: string
  method?: string
  transactionId?: string | null
  paymentGatewayResponse?: {
    refund?: {
      refundId?: string
    }
    razorpay_payment_id?: string
    paymentId?: string
    txnId?: string
    failureReason?: string
    error?: {
      message?: string
    }
  } | null
  createdAt?: string
  updatedAt?: string
}

type PaymentListPayload = {
  payments: PaymentApi[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type PaymentVerifyPayload = {
  payment?: PaymentApi
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

const toPaymentMethod = (method: string | undefined): PaymentMethod => {
  const normalized = String(method || '').toUpperCase()

  if (normalized === 'CARD') {
    return 'CARD'
  }

  if (normalized === 'NETBANKING') {
    return 'NETBANKING'
  }

  if (normalized === 'WALLET' || normalized === 'COD') {
    return 'WALLET'
  }

  return 'UPI'
}

const toPaymentStatus = (status: string | undefined, hasRefund: boolean): PaymentStatus => {
  if (hasRefund) {
    return 'REFUNDED'
  }

  const normalized = String(status || '').toUpperCase()

  if (normalized === 'SUCCESS') {
    return 'SUCCESS'
  }

  if (normalized === 'FAILED') {
    return 'FAILED'
  }

  return 'PENDING'
}

const toPayment = (item: PaymentApi): Payment => {
  const hasRefund = Boolean(item.paymentGatewayResponse?.refund?.refundId)
  const status = toPaymentStatus(item.status, hasRefund)

  return {
    id: String(item._id || item.id || ''),
    orderId: String(item.orderId || ''),
    cityId: '',
    shopId: String(item.shopId || ''),
    userPhone: 'N/A',
    amount: Number(item.amount || 0),
    method: toPaymentMethod(item.method),
    gatewayTransactionId: String(
      item.transactionId ||
        item.paymentGatewayResponse?.razorpay_payment_id ||
        item.paymentGatewayResponse?.paymentId ||
        item.paymentGatewayResponse?.txnId ||
        '',
    ),
    status,
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
    failureReason: item.paymentGatewayResponse?.failureReason || item.paymentGatewayResponse?.error?.message,
  }
}

export const listAdminPayments = async (): Promise<Payment[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<PaymentListPayload>>('/api/admin/payments', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.payments || []).map(toPayment)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load payments.'))
  }
}

export const retryVerifyAdminPayment = async (paymentId: string): Promise<Payment | null> => {
  try {
    const verificationCode = env.VITE_ADMIN_PAYMENT_VERIFICATION_CODE || '123456'

    const { data } = await http.post<ApiEnvelope<PaymentVerifyPayload>>(
      `/api/admin/payments/${paymentId}/verify`,
      { verificationCode },
      { headers: getAdminHeaders() },
    )

    if (!data?.data?.payment) {
      return null
    }

    return toPayment(data.data.payment)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to retry payment verification.'))
  }
}
