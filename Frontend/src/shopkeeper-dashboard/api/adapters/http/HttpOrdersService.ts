import type { CancelOrderRequest, ListOrdersQuery, OrderDTO, UpdateOrderStatusRequest } from '../../contracts/orders'
import type { OrdersService } from '../../services/OrdersService'
import { httpClient } from './httpClient'

export class HttpOrdersService implements OrdersService {
  async list(query?: ListOrdersQuery): Promise<OrderDTO[]> {
    const searchParams = new URLSearchParams()
    if (query?.status) searchParams.set('status', query.status)
    if (query?.paymentMode) searchParams.set('paymentMode', query.paymentMode)
    if (query?.search) searchParams.set('search', query.search)
    if (query?.dateFrom) searchParams.set('dateFrom', query.dateFrom)
    if (query?.dateTo) searchParams.set('dateTo', query.dateTo)

    // TODO: connect backend endpoint
    return httpClient<OrderDTO[]>(`/api/shopkeeper/orders?${searchParams.toString()}`)
  }

  async getById(id: string): Promise<OrderDTO> {
    // TODO: connect backend endpoint
    return httpClient<OrderDTO>(`/api/shopkeeper/orders/${id}`)
  }

  async updateStatus(id: string, req: UpdateOrderStatusRequest): Promise<OrderDTO> {
    // TODO: connect backend endpoint
    return httpClient<OrderDTO>(`/api/shopkeeper/orders/${id}/status`, {
      method: 'PATCH',
      body: req,
    })
  }

  async cancel(id: string, req: CancelOrderRequest): Promise<OrderDTO> {
    // TODO: connect backend endpoint
    return httpClient<OrderDTO>(`/api/shopkeeper/orders/${id}/cancel`, {
      method: 'PATCH',
      body: req,
    })
  }
}
