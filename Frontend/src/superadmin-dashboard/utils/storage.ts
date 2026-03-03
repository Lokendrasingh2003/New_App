export const safeJsonParse = <T>(raw: string | null): T | null => {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const isPlainObject = (value: unknown): boolean => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const loadFromStorage = <T>(key: string, fallback: T): T => {
  const parsed = safeJsonParse<T>(localStorage.getItem(key))

  if (parsed === null) {
    return fallback
  }

  if (Array.isArray(fallback)) {
    return (Array.isArray(parsed) ? parsed : fallback) as T
  }

  if (isPlainObject(fallback)) {
    return (isPlainObject(parsed) ? parsed : fallback) as T
  }

  return parsed
}

export const saveToStorage = <T>(key: string, value: T): { ok: boolean; error?: string } => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown storage error',
    }
  }
}
