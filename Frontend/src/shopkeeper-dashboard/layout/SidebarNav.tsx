import DashboardIcon from '@mui/icons-material/Dashboard'
import DiscountIcon from '@mui/icons-material/Discount'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import LinkIcon from '@mui/icons-material/Link'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PaymentIcon from '@mui/icons-material/Payment'
import PlaylistAddCheckCircleIcon from '@mui/icons-material/PlaylistAddCheckCircle'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import CancelIcon from '@mui/icons-material/Cancel'
import SettingsIcon from '@mui/icons-material/Settings'
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/shop/dashboard', icon: DashboardIcon },
  { label: 'Orders', path: '/shop/orders', icon: LocalShippingIcon },
  { label: 'Products', path: '/shop/products', icon: Inventory2Icon },
  { label: 'Offers', path: '/shop/offers', icon: DiscountIcon },
  { label: 'Payments', path: '/shop/payments', icon: PaymentIcon },
  { label: 'Refunds', path: '/shop/refunds', icon: CancelIcon },
  { label: 'Manage Subcategories', path: '/shop/subcategories', icon: PlaylistAddCheckCircleIcon },
  { label: 'Shop Link', path: '/shop/shop-link', icon: LinkIcon },
  { label: 'QR Code', path: '/shop/qr', icon: QrCode2Icon },
  { label: 'Settings', path: '/shop/settings', icon: SettingsIcon },
]

type SidebarNavProps = {
  onNavigate?: () => void
}

const SidebarNav = ({ onNavigate }: SidebarNavProps) => {
  const { pathname } = useLocation()

  return (
    <>
      <Toolbar />
      <Box sx={{ px: 2, pb: 1.5, pt: 0.75 }}>
        <Box
          sx={{
            px: 1.75,
            py: 1.6,
            borderRadius: 2.5,
            background: 'linear-gradient(135deg, rgba(15,118,110,0.14) 0%, rgba(20,184,166,0.18) 100%)',
            border: '1px solid rgba(15,118,110,0.2)',
          }}
        >
          <Typography sx={{ fontWeight: 800, color: 'primary.dark', lineHeight: 1.2 }}>Shopkeeper Console</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.35 }}>
            Orders • Catalog • Offers
          </Typography>
        </Box>
      </Box>
      <List sx={{ px: 1.5, py: 0.4 }}>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path

          return (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              onClick={onNavigate}
              sx={{
                mb: 0.7,
                borderRadius: 2,
                minHeight: 44,
                color: isActive ? 'primary.main' : 'text.primary',
                fontWeight: isActive ? 700 : 500,
                bgcolor: isActive ? 'rgba(15,118,110,0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(15,118,110,0.22)' : '1px solid transparent',
                boxShadow: isActive ? '0 8px 16px rgba(15,118,110,0.12)' : 'none',
                '&:hover': {
                  bgcolor: isActive ? 'rgba(15,118,110,0.14)' : 'rgba(15,23,42,0.04)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 38,
                  color: isActive ? 'primary.main' : 'text.secondary',
                }}
              >
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: '0.92rem', fontWeight: isActive ? 700 : 500 }}
              />
            </ListItemButton>
          )
        })}
      </List>
    </>
  )
}

export default SidebarNav
