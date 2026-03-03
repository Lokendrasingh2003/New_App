import type { CancelOrderRequest, ListOrdersQuery, OrderDTO, UpdateOrderStatusRequest } from '../contracts/orders'

export interface OrdersService {
  list: (query?: ListOrdersQuery) => Promise<OrderDTO[]>
  getById: (id: string) => Promise<OrderDTO>
  updateStatus: (id: string, req: UpdateOrderStatusRequest) => Promise<OrderDTO>
  cancel: (id: string, req: CancelOrderRequest) => Promise<OrderDTO>
}
