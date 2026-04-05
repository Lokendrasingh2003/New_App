export type AdminUser = {
  id: string
  phone: string
  isVerified: boolean
  role: 'USER' | 'SHOPKEEPER'
  shopkeeperId: string | null
  shopId: string | null
  shopName: string | null
  name: string | null
  email: string | null
  cityId: string | null
  cityName: string | null
  referralCode: string | null
  referredBy: string | null
  addressesCount: number
  savedPaymentMethodsCount: number
  defaultAddress: {
    label?: string
    addressLine1?: string
    area?: string
    city?: string
    pincode?: string
    phone?: string
    isDefault?: boolean
  } | null
  orderStats: {
    count: number
    totalSpent: number
    lastOrderAt: string | null
  }
  shopRegistrationStats: {
    applications: number
    approved: number
    pending: number
    rejected: number
  }
  createdAt: string
  updatedAt: string
}

export type AdminUserDetail = {
  id: string
  phone: string
  isVerified: boolean
  role: 'USER' | 'SHOPKEEPER'
  shopkeeperId: string | null
  shopId: string | null
  shopName: string | null
  name: string | null
  email: string | null
  cityId: string | null
  cityName: string | null
  profileImage: string | null
  addresses: Array<{
    id?: string
    label?: string
    addressLine1?: string
    area?: string
    city?: string
    pincode?: string
    phone?: string
    isDefault?: boolean
  }>
  savedPaymentMethods: Array<{
    id?: string
    type?: string
    isDefault?: boolean
  }>
  referralCode: string | null
  referredBy: string | null
  orderStats: {
    count: number
    totalSpent: number
    lastOrderAt: string | null
  }
  recentOrders: Array<{
    id: string
    orderId: string
    status: string
    total: number
    createdAt: string
  }>
  shopRegistrations: Array<{
    id: string
    shopName: string
    status: string
    submittedAt: string
    reviewedAt: string | null
    rejectionReason: string | null
  }>
  createdAt: string
  updatedAt: string
}
