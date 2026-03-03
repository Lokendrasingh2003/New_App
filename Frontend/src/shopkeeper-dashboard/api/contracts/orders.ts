export type ListOrdersQuery = {
  status?: string
  paymentMode?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export type OrderDTO = {
  id: string
  shopId: string
  shortId: string
  status: string
  paymentMode: string
  total: number
  createdAt: string
  customer: {
    name: string
    phone: string
  }
  address: {
    line1: string
    area: string
    city: string
    pincode: string
  }
  items: Array<{
    productId?: string
    productName: string
    variantLabel: string
    qty: number
    price: number
  }>
  cancelReason?: string
}

export type UpdateOrderStatusRequest = {
  status: string
}

export type CancelOrderRequest = {
  reason: string
}
