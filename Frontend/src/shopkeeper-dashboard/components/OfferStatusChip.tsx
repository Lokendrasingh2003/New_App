import { Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'
import type { OfferStatus } from '../types/offer'

const statusColorMap: Record<OfferStatus, { color: ChipProps['color']; variant: ChipProps['variant'] }> = {
  SCHEDULED: { color: 'info', variant: 'filled' },
  ACTIVE: { color: 'success', variant: 'filled' },
  EXPIRED: { color: 'warning', variant: 'outlined' },
  DISABLED: { color: 'default', variant: 'outlined' },
}

type OfferStatusChipProps = {
  status: OfferStatus
  size?: 'small' | 'medium'
}

const OfferStatusChip = ({ status, size = 'small' }: OfferStatusChipProps) => {
  const config = statusColorMap[status]

  return <Chip label={status} color={config.color} variant={config.variant} size={size} sx={{ fontWeight: 700, minWidth: 88 }} />
}

export default OfferStatusChip
