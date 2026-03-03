export type LoginRequest = {
  mobile: string
  password: string
}

export type LoginResponse = {
  token: string
  shopkeeperId: string
  shopId: string
}
