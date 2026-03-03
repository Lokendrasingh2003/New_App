import type { StandardAuditEventType } from '../app/auditEventTypes'

export type AuditEventMeta = Record<string, string | number | boolean | null>

export type AuditEventType = StandardAuditEventType | string

export type AuditEvent = {
  id: string
  type: AuditEventType
  message: string
  actor: {
    type: 'SUPERADMIN'
    username: string
  }
  createdAt: string
  meta?: AuditEventMeta
}
