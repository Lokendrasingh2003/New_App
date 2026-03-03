export type SystemConfigStatus = 'active' | 'inactive'

export type SystemConfig = {
  id: string
  key: string
  value: string
  status: SystemConfigStatus
  description?: string
  createdAt: string
  updatedAt: string
}
