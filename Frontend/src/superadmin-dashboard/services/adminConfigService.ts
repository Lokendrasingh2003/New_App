import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { SystemConfig } from '../types/SystemConfig'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type ConfigApi = {
  id?: string
  _id?: string
  key?: string
  value?: unknown
  category?: string
  description?: string | null
  createdAt?: string
  lastModifiedAt?: string | null
}

type ConfigListPayload = {
  configs: ConfigApi[]
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

const toConfig = (item: ConfigApi): SystemConfig => ({
  id: String(item._id || item.id || item.key || ''),
  key: String(item.key || ''),
  value: typeof item.value === 'string' ? item.value : JSON.stringify(item.value ?? ''),
  status: 'active',
  description: item.description ?? undefined,
  createdAt: String(item.createdAt || new Date().toISOString()),
  updatedAt: String(item.lastModifiedAt || item.createdAt || new Date().toISOString()),
})

export const listAdminConfig = async (): Promise<SystemConfig[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<ConfigListPayload>>('/api/admin/config', {
      headers: getAdminHeaders(),
    })

    return (data?.data?.configs || []).map(toConfig)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load config.'))
  }
}

export const updateAdminConfigValue = async (key: string, value: string | boolean | number): Promise<void> => {
  try {
    await http.put<ApiEnvelope<{ config?: ConfigApi }>>(
      `/api/admin/config/${encodeURIComponent(key)}`,
      { value },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update config.'))
  }
}
