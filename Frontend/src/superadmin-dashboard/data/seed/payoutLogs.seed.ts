import type { PayoutLogEntry } from '../../types/Payout'
import { payoutsSeed } from './payouts.seed'

const addMinutes = (iso: string, minutes: number) => {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

export const payoutLogsSeed: PayoutLogEntry[] = payoutsSeed.flatMap((request, index) => {
  const createdLog: PayoutLogEntry = {
    id: `payout_log_${request.id}_created`,
    payoutRequestId: request.id,
    action: 'CREATED',
    at: request.requestedAt,
  }

  if (request.status === 'PENDING') {
    return [createdLog]
  }

  if (request.status === 'REJECTED') {
    return [
      createdLog,
      {
        id: `payout_log_${request.id}_rejected`,
        payoutRequestId: request.id,
        action: 'REJECTED',
        note: request.rejectReason,
        at: request.processedAt ?? addMinutes(request.requestedAt, 45 + (index % 20)),
      },
    ]
  }

  const approvedAt = request.status === 'COMPLETED'
    ? addMinutes(request.requestedAt, 30 + (index % 25))
    : (request.processedAt ?? addMinutes(request.requestedAt, 35 + (index % 25)))

  const approvedLog: PayoutLogEntry = {
    id: `payout_log_${request.id}_approved`,
    payoutRequestId: request.id,
    action: 'APPROVED',
    at: approvedAt,
  }

  if (request.status === 'APPROVED') {
    return [createdLog, approvedLog]
  }

  return [
    createdLog,
    approvedLog,
    {
      id: `payout_log_${request.id}_completed`,
      payoutRequestId: request.id,
      action: 'COMPLETED',
      at: request.processedAt ?? addMinutes(approvedAt, 50 + (index % 15)),
    },
  ]
})
