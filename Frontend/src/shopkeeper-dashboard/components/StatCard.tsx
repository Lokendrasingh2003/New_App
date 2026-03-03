import { Card, CardContent, Stack, Typography, Box } from '@mui/material'
import type { ReactNode } from 'react'

export interface StatCardProps {
  title: string
  value: string | number
  helperText?: string
  icon?: ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  bgcolor?: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, helperText, icon, trend, bgcolor }) => {
  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bgcolor || 'background.paper',
        border: '1px solid rgba(15,23,42,0.08)',
        boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.35 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em' }}
          >
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: '10px',
                backgroundColor: 'rgba(15,118,110,0.1)',
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>

        <Stack direction="row" alignItems="baseline" gap={1.2}>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.6rem', md: '1.75rem' }, color: 'text.primary' }}>
            {value}
          </Typography>
          {trend && (
            <Typography
              variant="body2"
              sx={{
                color: trend.direction === 'up' ? 'success.main' : 'error.main',
                fontWeight: 700,
              }}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}%
            </Typography>
          )}
        </Stack>

        {helperText && (
          <Typography variant="body2" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default StatCard
