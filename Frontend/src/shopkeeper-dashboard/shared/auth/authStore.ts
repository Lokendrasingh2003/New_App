import { loginShopkeeperApi } from '../../services/authService'

const SHOPKEEPER_AUTH_TOKEN_KEY = 'shopkeeper_auth_token'

type TokenPayload = {
  sub?: string
  shopId?: string | null
  type?: string
  tokenUse?: string
}

const decodeStoredTokenPayload = (): TokenPayload | null => {
  const token = getStoredToken()
  if (!token) {
    return null
  }

  const parts = token.split('.')
  if (parts.length < 2) {
    return null
  }

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const jsonPayload = atob(padded)
    return JSON.parse(jsonPayload) as TokenPayload
  } catch {
    return null
  }
}

export const getStoredToken = (): string | null => {
  return localStorage.getItem(SHOPKEEPER_AUTH_TOKEN_KEY)
}

export const isShopkeeperLoggedIn = (): boolean => {
  return Boolean(getStoredToken())
}

export const getShopkeeperId = (): string | null => {
  return decodeStoredTokenPayload()?.sub ?? null
}

export const getShopkeeperShopId = (): string | null => {
  return decodeStoredTokenPayload()?.shopId ?? null
}

export const loginShopkeeper = async (phone: string, password: string): Promise<string> => {
  const token = await loginShopkeeperApi({
    phone,
    password,
  })

  localStorage.setItem(SHOPKEEPER_AUTH_TOKEN_KEY, token)
  return token
}

export const logoutShopkeeper = (): void => {
  localStorage.removeItem(SHOPKEEPER_AUTH_TOKEN_KEY)
}
