import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../auth/authStore'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'

type TopBarProps = {
  onMenuClick: () => void
  showMenuButton: boolean
}

const titleMap: Record<string, string> = {
  '/superadmin/dashboard': 'Dashboard',
  '/superadmin/cities': 'Cities',
  '/superadmin/categories': 'Categories',
  '/superadmin/shops': 'Shops',
  '/superadmin/orders': 'Orders',
  '/superadmin/payments': 'Payments',
  '/superadmin/payouts': 'Payouts',
  '/superadmin/refunds': 'Refunds',
  '/superadmin/coupons': 'Coupons',
  '/superadmin/audit': 'Audit Log',
  '/superadmin/subscriptions/plans': 'Subscriptions',
  '/superadmin/subscriptions/shops': 'Subscriptions',
  '/superadmin/config': 'Config',
  '/superadmin/commission': 'Commission',
  '/superadmin/settings': 'Settings',
}

const TopBar = ({ onMenuClick, showMenuButton }: TopBarProps) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { showSuccess } = useAppSnackbar()

  const pageTitle = pathname.startsWith('/superadmin/categories/')
    ? 'Category Details'
    : (titleMap[pathname] ?? 'Super Admin')

  const handleLogout = () => {
    logout()
    showSuccess('Logged out successfully')
    navigate('/superadmin/login', { replace: true })
  }

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid rgba(15,23,42,0.1)',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 1.25, md: 2.5 } }}>
        {showMenuButton && (
          <IconButton edge="start" color="inherit" aria-label="open menu" onClick={onMenuClick} sx={{ mr: 1.5 }}>
            <MenuRoundedIcon />
          </IconButton>
        )}

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            {pageTitle}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Super Admin
          </Typography>
        </Box>

        <Box sx={{ ml: 'auto' }}>
          <Button
            aria-label="logout"
            variant="outlined"
            startIcon={<LogoutRoundedIcon />}
            onClick={handleLogout}
            sx={{ borderColor: 'rgba(15,23,42,0.16)', color: 'text.primary' }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default TopBar
