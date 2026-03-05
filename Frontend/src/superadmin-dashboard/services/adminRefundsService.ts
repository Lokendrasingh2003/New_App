import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { RefundLogEntry, RefundRecord, RefundStatus } from '../types/Refund'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type RefundHistoryApi = {
  status?: string
  timestamp?: string
  note?: string | null
}

type RefundApi = {
  id?: string
  _id?: string
  orderId?: string
  paymentId?: string
  shopId?: string
  cityId?: string
  amount?: number
  status?: string
  reason?: string
  createdAt?: string
  updatedAt?: string
  processedAt?: string | null
  completedAt?: string | null
  statusHistory?: RefundHistoryApi[]
}

type RefundListPayload = {
  refunds: RefundApi[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
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

const toRefundStatus = (status: string | undefined): RefundStatus => {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'PROCESSING') {
    return 'PROCESSING'
  }

  if (normalized === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (normalized === 'FAILED') {
    return 'FAILED'
  }

  return 'REQUESTED'
}

const toRefund = (item: RefundApi): RefundRecord => ({
  id: String(item._id || item.id || ''),
  orderId: String(item.orderId || ''),
  paymentId: String(item.paymentId || ''),
  cityId: String(item.cityId || ''),
  shopId: String(item.shopId || ''),
  amount: Number(item.amount || 0),
  status: toRefundStatus(item.status),
  reason: String(item.reason || ''),
  createdAt: String(item.createdAt || new Date().toISOString()),
  updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
})

const toRefundLogAction = (status: string | undefined): RefundLogEntry['action'] => {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'PROCESSING') {
    return 'PROCESSING'
  }

  if (normalized === 'COMPLETED') {
    return 'COMPLETED'
  }

  if (normalized === 'FAILED') {
    return 'FAILED'
  }

  return 'CREATED'
}

const toRefundLogs = (item: RefundApi): RefundLogEntry[] => {
  const history = item.statusHistory || []

  if (history.length === 0) {
    return [
      {
        id: `${String(item._id || item.id || 'refund')}_created`,
        refundId: String(item._id || item.id || ''),
        action: toRefundLogAction(item.status),
        note: item.reason,
        at: String(item.updatedAt || item.createdAt || new Date().toISOString()),
      },
    ]
  }

  return history.map((entry, index) => ({
    id: `${String(item._id || item.id || 'refund')}_${index}`,
    refundId: String(item._id || item.id || ''),
    action: toRefundLogAction(entry.status),
    note: entry.note || undefined,
    at: String(entry.timestamp || item.updatedAt || item.createdAt || new Date().toISOString()),
  }))
}

export const listAdminRefunds = async (): Promise<{ refunds: RefundRecord[]; logs: RefundLogEntry[] }> => {
  try {
    const { data } = await http.get<ApiEnvelope<RefundListPayload>>('/api/admin/refunds', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    const rawItems = data?.data?.refunds || []

    return {
      refunds: rawItems.map(toRefund),
      logs: rawItems.flatMap(toRefundLogs),
    }
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load refunds.'))
  }
}

export const createAdminRefund = async (input: { orderId: string; reason: string }): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      '/api/admin/refunds',
      {
        orderId: input.orderId,
        reason: input.reason,
      },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create refund.'))
  }
}

export const processAdminRefund = async (refundId: string, notes?: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/refunds/${refundId}/process`,
      { notes: notes || '' },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to move refund to processing.'))
  }
}

export const completeAdminRefund = async (refundId: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/refunds/${refundId}/complete`,
      { transactionRef: `manual-${Date.now()}` },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to complete refund.'))
  }
}

export const failAdminRefund = async (refundId: string, reason: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/refunds/${refundId}/fail`,
      { reason },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to mark refund failed.'))
  }
}
