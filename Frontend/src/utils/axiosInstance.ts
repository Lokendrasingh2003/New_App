import axios from 'axios'
import { emitFeedback } from './feedbackBus'

const env = import.meta.env as Record<string, string | undefined>

const apiBaseUrl = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])
const MAX_RETRIES = 2

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getCommonErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return 'Something went wrong. Please try again.'
  }

  if (!error.response) {
    return 'Network error. Please check your internet connection.'
  }

  const responseMessage =
    (error.response.data as { error?: { message?: string }; message?: string } | undefined)?.error?.message ||
    (error.response.data as { message?: string } | undefined)?.message

  if (responseMessage) {
    return responseMessage
  }

  switch (error.response.status) {
    case 400:
      return 'Invalid request. Please check your input.'
    case 401:
      return 'Session expired. Please login again.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'Requested resource was not found.'
    case 422:
      return 'Validation failed. Please review and try again.'
    case 500:
      return 'Server error. Please try again after some time.'
    default:
      return 'Request failed. Please try again.'
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shopkeeper_auth_token')

  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as (typeof error.config & { __retryCount?: number }) | undefined

    if (axios.isAxiosError(error) && config && (config.method || 'get').toLowerCase() === 'get') {
      const retryCount = config.__retryCount || 0
      const status = error.response?.status
      const shouldRetry = !error.response || (typeof status === 'number' && RETRYABLE_STATUS_CODES.has(status))

      if (shouldRetry && retryCount < MAX_RETRIES) {
        config.__retryCount = retryCount + 1
        await sleep(350 * (retryCount + 1))
        return api(config)
      }
    }

    const message = getCommonErrorMessage(error)

    if (error?.response?.status === 401) {
      localStorage.removeItem('shopkeeper_auth_token')
      emitFeedback({ message, severity: 'error' })
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }

      return Promise.reject(error)
    }

    if (axios.isAxiosError(error)) {
      error.message = message
    }

    emitFeedback({ message, severity: 'error' })

    return Promise.reject(error)
  }
)

export default api
