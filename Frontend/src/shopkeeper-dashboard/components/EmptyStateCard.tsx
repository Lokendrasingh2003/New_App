import { Button, Card, CardContent, Stack, Typography } from '@mui/material'

type EmptyStateCardProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

const EmptyStateCard = ({ title, description, actionLabel, onAction }: EmptyStateCardProps) => {
  return (
    <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
      <CardContent>
        <Stack spacing={1.5} alignItems="flex-start" sx={{ py: 0.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
          {actionLabel && onAction && (
            <Button variant="contained" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default EmptyStateCard
