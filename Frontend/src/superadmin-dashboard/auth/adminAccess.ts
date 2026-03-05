const ACCESS_KEY_STORAGE = 'sa_admin_access_key'
const DEMO_ACCESS_KEY = 'demo-superadmin-access'

const env = import.meta.env as Record<string, string | undefined>

const readFromStorage = (): string | undefined => {
  try {
    const stored = localStorage.getItem(ACCESS_KEY_STORAGE)
    const normalized = String(stored || '').trim()
    return normalized.length > 0 ? normalized : undefined
  } catch {
    return undefined
  }
}

export const getAdminAccessKey = (): string | undefined => {
  const stored = readFromStorage()
  if (stored) {
    return stored
  }

  const fromEnv = String(env.VITE_INTERNAL_ADMIN_KEY || env.VITE_ADMIN_INTERNAL_KEY || '').trim()
  if (fromEnv.length > 0) {
    return fromEnv
  }

  return DEMO_ACCESS_KEY
}

export const setAdminAccessKey = (value: string): void => {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return
  }

  try {
    localStorage.setItem(ACCESS_KEY_STORAGE, normalized)
  } catch {
    return
  }
}

export const clearAdminAccessKey = (): void => {
  try {
    localStorage.removeItem(ACCESS_KEY_STORAGE)
  } catch {
    return
  }
}
