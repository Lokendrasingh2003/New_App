import axios from 'axios'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

const env = import.meta.env as Record<string, string | undefined>

const apiBaseUrl = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message =
    (error.response?.data as { error?: { message?: string }; message?: string } | undefined)?.error?.message ||
    (error.response?.data as { message?: string } | undefined)?.message

  if (message) {
    return message
  }

  if (error.response?.status === 403 || error.response?.status === 401) {
    return 'Invalid superadmin access key.'
  }

  return fallback
}

export const verifySuperAdminAccess = async (accessKey: string): Promise<void> => {
  const normalized = String(accessKey || '').trim()
  if (!normalized) {
    throw new Error('Access key is required.')
  }

  try {
    await http.get<ApiEnvelope<{ configs?: unknown[] }>>('/api/admin/config', {
      params: { limit: 1, offset: 0 },
      headers: {
        'x-internal-key': normalized,
      },
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to verify superadmin access.'))
  }
}
