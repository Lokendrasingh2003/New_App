import { Chip } from '@mui/material'
import type { ChipProps } from '@mui/material'

type StatusType = 'NEW' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED'

const statusColorMap: Record<StatusType, { color: ChipProps['color']; variant: ChipProps['variant'] }> = {
  NEW: { color: 'info', variant: 'filled' },
  ACCEPTED: { color: 'primary', variant: 'filled' },
  PREPARING: { color: 'warning', variant: 'filled' },
  READY: { color: 'secondary', variant: 'filled' },
  DISPATCHED: { color: 'secondary', variant: 'outlined' },
  DELIVERED: { color: 'success', variant: 'filled' },
  CANCELLED: { color: 'error', variant: 'outlined' },
}

const statusDisplayMap: Record<StatusType, string> = {
  NEW: 'New',
  ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export interface StatusChipProps {
  status: StatusType
  size?: 'small' | 'medium'
}

const StatusChip: React.FC<StatusChipProps> = ({ status, size = 'small' }) => {
  const colorConfig = statusColorMap[status]
  const displayLabel = statusDisplayMap[status]

  return (
    <Chip
      label={displayLabel}
      color={colorConfig.color}
      variant={colorConfig.variant}
      size={size}
      sx={{ fontWeight: 700, minWidth: 84 }}
    />
  )
}

export default StatusChip
