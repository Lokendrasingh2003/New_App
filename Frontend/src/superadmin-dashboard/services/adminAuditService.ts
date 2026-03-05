import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { AuditEvent, AuditEventMeta } from '../types/AuditEvent'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type AuditActorApi = {
  id?: string
  name?: string | null
  email?: string | null
}

type AuditResourceApi = {
  type?: string | null
  id?: string | null
  name?: string | null
}

type AuditMetadataApi = {
  ipAddress?: string | null
  userAgent?: string | null
}

type AuditLogApi = {
  _id?: string
  id?: string
  eventType?: string
  action?: string
  actorRole?: string
  actorId?: string
  actor?: AuditActorApi | null
  resource?: AuditResourceApi | null
  targetType?: string | null
  targetId?: string | null
  metadata?: AuditMetadataApi | null
  notes?: string | null
  createdAt?: string
}

type AuditListPayload = {
  logs: AuditLogApi[]
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

const toMessage = (log: AuditLogApi): string => {
  if (log.notes && String(log.notes).trim().length > 0) {
    return String(log.notes)
  }

  const action = String(log.action || log.eventType || 'EVENT')
  const targetType = String(log.targetType || log.resource?.type || '').trim()
  const targetId = String(log.targetId || log.resource?.id || '').trim()

  if (targetType && targetId) {
    return `${action} ${targetType} (${targetId})`
  }

  if (targetType) {
    return `${action} ${targetType}`
  }

  return action
}

const toMeta = (log: AuditLogApi): AuditEventMeta | undefined => {
  const base: Record<string, string> = {}

  if (log.resource?.type) {
    base.resourceType = String(log.resource.type)
  }

  if (log.resource?.id) {
    base.resourceId = String(log.resource.id)
  }

  if (log.resource?.name) {
    base.resourceName = String(log.resource.name)
  }

  if (log.targetType) {
    base.targetType = String(log.targetType)
  }

  if (log.targetId) {
    base.targetId = String(log.targetId)
  }

  if (log.metadata?.ipAddress) {
    base.ipAddress = String(log.metadata.ipAddress)
  }

  if (log.metadata?.userAgent) {
    base.userAgent = String(log.metadata.userAgent)
  }

  return Object.keys(base).length > 0 ? base : undefined
}

const toAuditEvent = (log: AuditLogApi): AuditEvent => ({
  id: String(log._id || log.id || ''),
  type: String(log.eventType || log.action || 'GENERIC_EVENT'),
  message: toMessage(log),
  actor: {
    type: 'SUPERADMIN',
    username: String(log.actor?.name || log.actorRole || log.actorId || 'admin'),
  },
  createdAt: String(log.createdAt || new Date().toISOString()),
  meta: toMeta(log),
})

export const listAdminAuditEvents = async (): Promise<AuditEvent[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<AuditListPayload>>('/api/admin/audit-logs', {
      params: { limit: 100, offset: 0 },
      headers: getAdminHeaders(),
    })

    return (data?.data?.logs || []).map(toAuditEvent)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load audit logs.'))
  }
}
