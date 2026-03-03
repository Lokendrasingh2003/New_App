import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import { AppBar, Box, Button, IconButton, Toolbar, Typography } from '@mui/material'
import { useLocation, useNavigate } from 'react-router-dom'
import { logoutDemo } from '../shared/auth/authStore'

type TopBarProps = {
  onMenuClick: () => void
  showMenuButton: boolean
}

const titleMap: Record<string, string> = {
  '/shop/dashboard': 'Dashboard',
  '/shop/orders': 'Orders',
  '/shop/products': 'Products',
  '/shop/subcategories': 'Manage Subcategories',
  '/shop/offers': 'Offers',
  '/shop/shop-link': 'Shop Link',
  '/shop/qr': 'QR Code',
  '/shop/settings': 'Settings',
}

const TopBar = ({ onMenuClick, showMenuButton }: TopBarProps) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const pageTitle = pathname.startsWith('/shop/products/new')
    ? 'Add Product'
    : pathname.startsWith('/shop/products/') && pathname.endsWith('/edit')
      ? 'Edit Product'
      : pathname.startsWith('/shop/orders/')
        ? 'Order Details'
      : pathname.startsWith('/shop/offers/new')
        ? 'Create Offer'
        : pathname.startsWith('/shop/offers/') && pathname.endsWith('/edit')
          ? 'Edit Offer'
          : (titleMap[pathname] ?? 'Shopkeeper')

  const handleLogout = () => {
    logoutDemo()
    navigate('/login', { replace: true })
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
            <MenuIcon />
          </IconButton>
        )}

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            {pageTitle}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Shopkeeper Dashboard
          </Typography>
        </Box>

        <Box sx={{ ml: 'auto' }}>
          <Button
            aria-label="logout"
            variant="outlined"
            startIcon={<LogoutIcon />}
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
