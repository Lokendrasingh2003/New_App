import api from '../../utils/axiosInstance'

type LoginPayload = {
  phone: string
  password: string
}

type LoginResponse = {
  success: boolean
  data?: {
    token?: string
    refreshToken?: string
    shopkeeper?: {
      id: string
      phone: string
      shopId: string | null
      status: string
    }
  }
  message?: string
}

export const loginShopkeeperApi = async (payload: LoginPayload): Promise<string> => {
  const { data } = await api.post<LoginResponse>('/api/shopkeeper/login', payload)

  const token = data?.data?.token
  if (!token) {
    throw new Error(data?.message || 'Login failed. Please try again.')
  }

  return token
}
