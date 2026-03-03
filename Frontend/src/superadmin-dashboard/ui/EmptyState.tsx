import InboxRoundedIcon from '@mui/icons-material/InboxRounded'
import { Box, Button, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon?: ReactNode
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <Stack
      spacing={1.25}
      alignItems="center"
      justifyContent="center"
      sx={{ py: 4, textAlign: 'center' }}
    >
      <Box sx={{ color: 'text.secondary' }}>{icon ?? <InboxRoundedIcon fontSize="large" />}</Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
        {description}
      </Typography>
      {actionLabel ? (
        <Button variant="outlined" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Stack>
  )
}

export default EmptyState
