const DEMO_AUTH_TOKEN_KEY = 'shop_demo_token'

export const loginDemo = (mobile: string): void => {
  localStorage.setItem(DEMO_AUTH_TOKEN_KEY, `demo-token-${mobile}`)
}

export const logoutDemo = (): void => {
  localStorage.removeItem(DEMO_AUTH_TOKEN_KEY)
}

export const isLoggedIn = (): boolean => {
  return Boolean(localStorage.getItem(DEMO_AUTH_TOKEN_KEY))
}
