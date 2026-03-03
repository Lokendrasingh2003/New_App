import type { PayoutRequest, PayoutRequestStatus } from '../../types/Payout'
import { shopsSeed } from './shops.seed'

const statusByIndex = (index: number): PayoutRequestStatus => {
  if (index % 9 === 0) {
    return 'COMPLETED'
  }

  if (index % 6 === 0) {
    return 'REJECTED'
  }

  if (index % 3 === 0) {
    return 'APPROVED'
  }

  return 'PENDING'
}

const rejectReasons = [
  'Bank account details mismatch',
  'KYC pending verification',
  'Suspicious payout pattern detected',
  'Settlement account temporarily blocked',
]

const requestDateByIndex = (index: number) => {
  const day = (index % 28) + 1
  const month = 1 + Math.floor(index / 28)
  const dayString = String(day).padStart(2, '0')
  const monthString = String(month).padStart(2, '0')
  const hourString = String(10 + (index % 8)).padStart(2, '0')
  const minuteString = String((index * 11) % 60).padStart(2, '0')

  return `2026-${monthString}-${dayString}T${hourString}:${minuteString}:00.000Z`
}

const processedDateByIndex = (index: number) => requestDateByIndex(index + 1)

export const payoutsSeed: PayoutRequest[] = Array.from({ length: 48 }, (_, index) => {
  const shop = shopsSeed[index % shopsSeed.length]
  const status = statusByIndex(index)

  return {
    id: `payout_${String(index + 1).padStart(4, '0')}`,
    shopId: shop.id,
    amount: 1500 + ((index * 425) % 12000),
    status,
    requestedAt: requestDateByIndex(index),
    processedAt: status === 'PENDING' ? undefined : processedDateByIndex(index),
    rejectReason: status === 'REJECTED' ? rejectReasons[index % rejectReasons.length] : undefined,
  }
})
