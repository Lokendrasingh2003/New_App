type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

type RequestConfig = {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const httpClient = async <T>(path: string, config: RequestConfig = {}): Promise<T> => {
  const { method = 'GET', body, headers = {} } = config

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
