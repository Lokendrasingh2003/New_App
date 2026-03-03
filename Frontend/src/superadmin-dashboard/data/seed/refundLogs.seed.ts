import type { RefundLogEntry } from '../../types/Refund'
import { refundsSeed } from './refunds.seed'

const addMinutes = (iso: string, minutes: number) => {
  const date = new Date(iso)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toISOString()
}

export const refundLogsSeed: RefundLogEntry[] = refundsSeed.flatMap((refund, index) => {
  const createdLog: RefundLogEntry = {
    id: `refund_log_${refund.id}_created`,
    refundId: refund.id,
    action: 'CREATED',
    note: refund.reason,
    at: refund.createdAt,
  }

  if (refund.status === 'REQUESTED') {
    return [createdLog]
  }

  const processingAt = addMinutes(refund.createdAt, 25 + (index % 20))
  const processingLog: RefundLogEntry = {
    id: `refund_log_${refund.id}_processing`,
    refundId: refund.id,
    action: 'PROCESSING',
    at: processingAt,
  }

  if (refund.status === 'PROCESSING') {
    return [createdLog, processingLog]
  }

  if (refund.status === 'COMPLETED') {
    return [
      createdLog,
      processingLog,
      {
        id: `refund_log_${refund.id}_completed`,
        refundId: refund.id,
        action: 'COMPLETED',
        at: refund.updatedAt,
      },
    ]
  }

  return [
    createdLog,
    processingLog,
    {
      id: `refund_log_${refund.id}_failed`,
      refundId: refund.id,
      action: 'FAILED',
      note: 'Gateway rejected refund request',
      at: refund.updatedAt,
    },
  ]
})
