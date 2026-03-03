import { Box, Breadcrumbs, Button, Stack, Typography } from '@mui/material'
import type { ButtonProps } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: Array<{
    label: string
    onClick: () => void
    variant?: ButtonProps['variant']
    color?: ButtonProps['color']
    startIcon?: ButtonProps['startIcon']
  }>
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  const { pathname } = useLocation()
  const segments = pathname
    .split('/')
    .filter(Boolean)
    .slice(1)
    .map((segment) => {
      if (segment === 'new') {
        return 'New'
      }

      if (segment === 'edit') {
        return 'Edit'
      }

      if (segment.startsWith(':') || segment.length > 18) {
        return 'Details'
      }

      return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    })

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        mb: 2.5,
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Box>
        <Breadcrumbs separator="›" sx={{ mb: 0.65 }}>
          <Typography
            component={RouterLink}
            to="/shop/dashboard"
            variant="caption"
            color="text.secondary"
            sx={{ textDecoration: 'none' }}
          >
            Shop
          </Typography>
          {segments.map((segment, index) => (
            <Typography key={`${segment}-${index}`} variant="caption" color="text.secondary">
              {segment}
            </Typography>
          ))}
        </Breadcrumbs>
        <Typography variant="h4" sx={{ mb: subtitle ? 0.6 : 0, color: 'text.primary' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 640 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && actions.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.2}
          sx={{ width: { xs: '100%', sm: 'auto' }, mt: { xs: 0.5, sm: 0 } }}
        >
          {actions.map((action, idx) => (
            <Button
              key={idx}
              variant={action.variant || 'contained'}
              color={action.color || 'primary'}
              onClick={action.onClick}
              startIcon={action.startIcon}
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {action.label}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  )
}

export default PageHeader
