const TOKEN_KEY = 'sa_demo_token'
const USERNAME_KEY = 'sa_demo_username'

export const login = (username: string, password: string): boolean => {
  if (username === 'admin' && password === 'admin123') {
    try {
      localStorage.setItem(TOKEN_KEY, 'demo-superadmin-token')
      localStorage.setItem(USERNAME_KEY, username)
    } catch {
      return false
    }
    return true
  }

  return false
}

export const logout = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USERNAME_KEY)
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
