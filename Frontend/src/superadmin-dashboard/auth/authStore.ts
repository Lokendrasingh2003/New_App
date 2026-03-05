import { clearAdminAccessKey, getAdminAccessKey, setAdminAccessKey } from './adminAccess'
import { verifySuperAdminAccess } from '../services/adminAuthService'

const TOKEN_KEY = 'sa_token'
const USERNAME_KEY = 'sa_username'
const DEMO_TOKEN_PREFIX = 'superadmin-demo-session'
const DEMO_ACCESS_KEY = 'demo-superadmin-access'
const DEMO_USERNAME = 'superadmin'
const DEMO_PASSWORD = 'super123'

type LoginResult = {
  ok: boolean
  error?: string
}

export const login = async (username: string, password: string): Promise<LoginResult> => {
  const normalizedUsername = String(username || '').trim()
  const normalizedAccessKey = String(password || '').trim()

  if (!normalizedUsername) {
    return { ok: false, error: 'Username is required.' }
  }

  if (!normalizedAccessKey) {
    return { ok: false, error: 'Admin access key is required.' }
  }

  if (normalizedUsername.toLowerCase() === DEMO_USERNAME && normalizedAccessKey === DEMO_PASSWORD) {
    setAdminAccessKey(DEMO_ACCESS_KEY)
    localStorage.setItem(TOKEN_KEY, `${DEMO_TOKEN_PREFIX}-${Date.now()}`)
    localStorage.setItem(USERNAME_KEY, normalizedUsername)
    return { ok: true }
  }

  try {
    setAdminAccessKey(normalizedAccessKey)
    await verifySuperAdminAccess(normalizedAccessKey)
    localStorage.setItem(TOKEN_KEY, `superadmin-session-${Date.now()}`)
    localStorage.setItem(USERNAME_KEY, normalizedUsername)
    return { ok: true }
  } catch (error) {
    clearAdminAccessKey()
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to login.',
    }
  }
}

export const restoreSession = async (): Promise<boolean> => {
  if (!isLoggedIn()) {
    return false
  }

  const token = localStorage.getItem(TOKEN_KEY)
  if (token?.startsWith(DEMO_TOKEN_PREFIX)) {
    if (!getAdminAccessKey()) {
      setAdminAccessKey(DEMO_ACCESS_KEY)
    }
    return true
  }

  const accessKey = getAdminAccessKey()
  if (!accessKey) {
    logout()
    return false
  }

  try {
    await verifySuperAdminAccess(accessKey)
    return true
  } catch {
    logout()
    return false
  }
}

export const logout = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
    clearAdminAccessKey()
  } catch {
    return
  }
}

export const isLoggedIn = (): boolean => {
  try {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  } catch {
    return false
  }
}

export const getLoggedInUsername = (): string => {
  try {
    const username = localStorage.getItem(USERNAME_KEY)
    return username && username.trim().length > 0 ? username : 'admin'
  } catch {
    return 'admin'
  }
}
