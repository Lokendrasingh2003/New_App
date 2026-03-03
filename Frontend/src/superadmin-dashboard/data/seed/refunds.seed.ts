import type { RefundRecord, RefundStatus } from '../../types/Refund'
import { ordersSeed } from './orders.seed'
import { paymentsSeed } from './payments.seed'

const statusByIndex = (index: number): RefundStatus => {
  if (index % 8 === 0) {
    return 'FAILED'
  }

  if (index % 5 === 0) {
    return 'COMPLETED'
  }

  if (index % 3 === 0) {
    return 'PROCESSING'
  }

  return 'REQUESTED'
}

const reasons = [
  'Order cancelled by customer',
  'Item out of stock after payment',
  'Duplicate payment captured',
  'Wrong item delivered',
  'Delivery failed and order returned',
]

const dateByIndex = (index: number) => {
  const day = (index % 28) + 1
  const month = 1 + Math.floor(index / 28)
  const dayString = String(day).padStart(2, '0')
  const monthString = String(month).padStart(2, '0')
  const hourString = String(9 + (index % 9)).padStart(2, '0')
  const minuteString = String((index * 13) % 60).padStart(2, '0')

  return `2026-${monthString}-${dayString}T${hourString}:${minuteString}:00.000Z`
}

export const refundsSeed: RefundRecord[] = Array.from({ length: 32 }, (_, index) => {
  const order = ordersSeed[index % ordersSeed.length]
  const payment = paymentsSeed.find((item) => item.orderId === order.id) ?? paymentsSeed[index % paymentsSeed.length]
  const status = statusByIndex(index)
  const createdAt = dateByIndex(index)
  const updatedAt = dateByIndex(index + 1)

  return {
    id: `refund_${String(index + 1).padStart(4, '0')}`,
    orderId: order.id,
    paymentId: payment.id,
    cityId: order.cityId,
    shopId: order.shopId,
    amount: Math.min(order.total, payment.amount),
    status,
    reason: reasons[index % reasons.length],
    createdAt,
    updatedAt,
  }
})
