import type { Payment, PaymentMethod, PaymentStatus } from '../../types/Payment'
import { ordersSeed } from './orders.seed'

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'CARD', 'NETBANKING', 'WALLET']
const FAILURE_REASONS = [
  'UPI collect request timed out',
  'Bank declined transaction',
  'Gateway signature mismatch',
  '3DS authentication failed',
  'Wallet authorization failed',
]

const statusByIndex = (index: number): PaymentStatus => {
  if (index % 11 === 0) {
    return 'REFUNDED'
  }

  if (index % 5 === 0) {
    return 'PENDING'
  }

  if (index % 4 === 0) {
    return 'FAILED'
  }

  return 'SUCCESS'
}

const paymentDateByIndex = (index: number) => {
  const day = (index % 28) + 1
  const month = 1 + Math.floor(index / 28)
  const dayString = String(day).padStart(2, '0')
  const monthString = String(month).padStart(2, '0')
  const hourString = String(9 + (index % 10)).padStart(2, '0')
  const minuteString = String((index * 9) % 60).padStart(2, '0')

  return `2026-${monthString}-${dayString}T${hourString}:${minuteString}:00.000Z`
}

export const paymentsSeed: Payment[] = Array.from({ length: 120 }, (_, index) => {
  const order = ordersSeed[index % ordersSeed.length]
  const status = statusByIndex(index)
  const method = PAYMENT_METHODS[index % PAYMENT_METHODS.length]

  const createdAt = paymentDateByIndex(index)
  const updatedAt = paymentDateByIndex(index + 1)

  return {
    id: `pay_${String(index + 1).padStart(4, '0')}`,
    orderId: order.id,
    cityId: order.cityId,
    shopId: order.shopId,
    userPhone: order.userPhone,
    amount: order.total,
    method,
    gatewayTransactionId: `gtw_${String(index + 1).padStart(6, '0')}`,
    status,
    createdAt,
    updatedAt,
    failureReason: status === 'FAILED' ? FAILURE_REASONS[index % FAILURE_REASONS.length] : undefined,
  }
})
