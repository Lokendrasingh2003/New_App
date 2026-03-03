import type { CancelOrderRequest, ListOrdersQuery, OrderDTO, UpdateOrderStatusRequest } from '../../contracts/orders'
import type { OrdersService } from '../../services/OrdersService'
import { orderToDTO } from '../../mappers'
import { readOrders, readShop, writeOrders } from './storage'
import { sleep } from './sleep'
import type { OrderStatus } from '../../../types/order'

export class MockOrdersService implements OrdersService {
  async list(query?: ListOrdersQuery): Promise<OrderDTO[]> {
    await sleep()
    const shop = readShop()
    const allOrders = readOrders().map((order) => orderToDTO(order, shop.id, shop))

    return allOrders.filter((order) => {
      const statusMatch = !query?.status || order.status === query.status
      const paymentMatch = !query?.paymentMode || order.paymentMode === query.paymentMode
      const searchText = query?.search?.trim().toLowerCase() ?? ''
      const searchMatch =
        !searchText ||
        order.shortId.toLowerCase().includes(searchText) ||
        order.customer.name.toLowerCase().includes(searchText)

      const orderTime = new Date(order.createdAt).getTime()
      const fromMatch = !query?.dateFrom || orderTime >= new Date(query.dateFrom).getTime()
      const toMatch = !query?.dateTo || orderTime <= new Date(query.dateTo).getTime()

      return statusMatch && paymentMatch && searchMatch && fromMatch && toMatch
    })
  }

  async getById(id: string): Promise<OrderDTO> {
    await sleep()
    const shop = readShop()
    const order = readOrders().find((item) => item.id === id)
    if (!order) {
      throw new Error('Order not found')
    }

    return orderToDTO(order, shop.id, shop)
  }

  async updateStatus(id: string, req: UpdateOrderStatusRequest): Promise<OrderDTO> {
    await sleep()
    const shop = readShop()
    const orders = readOrders()
    const index = orders.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Order not found')
    }

    const updated = {
      ...orders[index],
      status: req.status as OrderStatus,
    }
    orders[index] = updated
    writeOrders(orders)

    return orderToDTO(updated, shop.id, shop)
  }

  async cancel(id: string, req: CancelOrderRequest): Promise<OrderDTO> {
    await sleep()
    const shop = readShop()
    const orders = readOrders()
    const index = orders.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Order not found')
    }

    const updated = {
      ...orders[index],
      status: 'CANCELLED' as const,
      cancelReason: req.reason,
    }
    orders[index] = updated
    writeOrders(orders)

    return orderToDTO(updated, shop.id, shop)
  }
}
