import type { Order, OrderStatus, OrderStatusLog, PaymentStatus } from '../../types/Order'
import { shopsSeed } from './shops.seed'

const statusFlow: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
]

const statusByIndex = (index: number): OrderStatus => {
  if (index < 22) {
    return 'delivered'
  }

  if (index < 30) {
    return 'cancelled'
  }

  if (index < 38) {
    return 'refunded'
  }

  if (index < 48) {
    return 'out_for_delivery'
  }

  if (index < 58) {
    return 'preparing'
  }

  if (index < 68) {
    return 'accepted'
  }

  if (index < 76) {
    return 'confirmed'
  }

  return 'pending_payment'
}

const paymentStatusByOrderStatus = (status: OrderStatus, index: number): PaymentStatus => {
  if (status === 'pending_payment') {
    return 'pending'
  }

  if (status === 'cancelled') {
    return index % 2 === 0 ? 'failed' : 'pending'
  }

  if (status === 'refunded') {
    return 'refunded'
  }

  return 'success'
}

const buildCreatedAt = (index: number) => {
  const day = (index % 28) + 1
  const month = 1 + Math.floor(index / 28)
  const dayString = String(day).padStart(2, '0')
  const monthString = String(month).padStart(2, '0')
  const hourString = String(8 + (index % 10)).padStart(2, '0')
  const minuteString = String((index * 7) % 60).padStart(2, '0')

  return `2026-${monthString}-${dayString}T${hourString}:${minuteString}:00.000Z`
}

const buildStatusLogs = (status: OrderStatus, createdAt: string, updatedAt: string): OrderStatusLog[] => {
  if (status === 'cancelled') {
    return [
      { status: 'pending_payment', at: createdAt },
      { status: 'cancelled', at: updatedAt, note: 'User cancelled before processing' },
    ]
  }

  if (status === 'refunded') {
    return [
      { status: 'pending_payment', at: createdAt },
      { status: 'cancelled', at: createdAt, note: 'Order cancelled after payment capture' },
      { status: 'refunded', at: updatedAt },
    ]
  }

  const targetIndex = statusFlow.indexOf(status)
  if (targetIndex === -1) {
    return [{ status: 'pending_payment', at: createdAt }]
  }

  return statusFlow.slice(0, targetIndex + 1).map((item, index) => ({
    status: item,
    at: index === 0 ? createdAt : updatedAt,
  }))
}

export const ordersSeed: Order[] = Array.from({ length: 84 }, (_, index) => {
  const shop = shopsSeed[index % shopsSeed.length]
  const status = statusByIndex(index)
  const paymentStatus = paymentStatusByOrderStatus(status, index)

  const createdAt = buildCreatedAt(index)
  const updatedAt = buildCreatedAt(index + 1)

  return {
    id: `ord_${String(index + 1).padStart(4, '0')}`,
    cityId: shop.cityId,
    shopId: shop.id,
    userPhone: `98${String(10000000 + index * 123).slice(-8)}`,
    total: 180 + ((index * 73) % 2240),
    status,
    paymentStatus,
    createdAt,
    updatedAt,
    statusLogs: buildStatusLogs(status, createdAt, updatedAt),
  }
})
