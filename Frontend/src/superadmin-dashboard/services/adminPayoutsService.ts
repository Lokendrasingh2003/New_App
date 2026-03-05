import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { PayoutRequest } from '../types/Payout'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type PayoutApi = {
  id?: string
  _id?: string
  shopId?: string
  payableAmount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
  approvedAt?: string | null
  completedAt?: string | null
  notes?: string | null
}

type PayoutListPayload = {
  payouts: PayoutApi[]
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

const toPayout = (payout: PayoutApi): PayoutRequest => {
  const status = String(payout.status || 'PENDING').toUpperCase() as PayoutRequest['status']

  const processedAt =
    status === 'APPROVED'
      ? payout.approvedAt || payout.updatedAt
      : status === 'COMPLETED'
        ? payout.completedAt || payout.updatedAt
        : status === 'REJECTED'
          ? payout.updatedAt
          : undefined

  return {
    id: String(payout._id || payout.id || ''),
    shopId: String(payout.shopId || ''),
    amount: Number(payout.payableAmount || 0),
    status,
    requestedAt: String(payout.createdAt || new Date().toISOString()),
    processedAt: processedAt ? String(processedAt) : undefined,
    rejectReason: status === 'REJECTED' ? String(payout.notes || '') || undefined : undefined,
  }
}

export const listAdminPayouts = async (): Promise<PayoutRequest[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<PayoutListPayload>>('/api/admin/payouts', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.payouts || []).map(toPayout)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load payout requests.'))
  }
}

export const approveAdminPayout = async (payoutId: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/payouts/${payoutId}/approve`,
      {},
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to approve payout.'))
  }
}

export const rejectAdminPayout = async (payoutId: string, reason: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/payouts/${payoutId}/reject`,
      { reason },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to reject payout.'))
  }
}

export const completeAdminPayout = async (payoutId: string): Promise<void> => {
  try {
    await http.post<ApiEnvelope<Record<string, unknown>>>(
      `/api/admin/payouts/${payoutId}/complete`,
      { transactionRef: `manual-${Date.now()}` },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to complete payout.'))
  }
}
