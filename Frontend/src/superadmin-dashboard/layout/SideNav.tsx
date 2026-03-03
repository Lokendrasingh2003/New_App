import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded'
import AssignmentReturnRoundedIcon from '@mui/icons-material/AssignmentReturnRounded'
import PercentRoundedIcon from '@mui/icons-material/PercentRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded'
import SubscriptionsRoundedIcon from '@mui/icons-material/SubscriptionsRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography } from '@mui/material'
import { NavLink } from 'react-router-dom'

const drawerWidth = 260

const navItems = [
  { label: 'Dashboard', path: '/superadmin/dashboard', icon: <DashboardRoundedIcon /> },
  { label: 'Cities', path: '/superadmin/cities', icon: <LocationCityRoundedIcon /> },
  { label: 'Categories', path: '/superadmin/categories', icon: <CategoryRoundedIcon /> },
  { label: 'Shops', path: '/superadmin/shops', icon: <ShoppingBagRoundedIcon /> },
  { label: 'Orders', path: '/superadmin/orders', icon: <Inventory2RoundedIcon /> },
  { label: 'Payments', path: '/superadmin/payments', icon: <PaymentsRoundedIcon /> },
  { label: 'Payouts', path: '/superadmin/payouts', icon: <RequestQuoteRoundedIcon /> },
  { label: 'Refunds', path: '/superadmin/refunds', icon: <AssignmentReturnRoundedIcon /> },
  { label: 'Coupons', path: '/superadmin/coupons', icon: <LocalOfferRoundedIcon /> },
  { label: 'Audit Log', path: '/superadmin/audit', icon: <FactCheckRoundedIcon /> },
  { label: 'Subscriptions', path: '/superadmin/subscriptions/plans', icon: <SubscriptionsRoundedIcon /> },
  { label: 'Config', path: '/superadmin/config', icon: <TuneRoundedIcon /> },
  { label: 'Commission', path: '/superadmin/commission', icon: <PercentRoundedIcon /> },
  { label: 'Settings', path: '/superadmin/settings', icon: <SettingsRoundedIcon /> },
]

type SideNavProps = {
  mobileOpen: boolean
  onMobileClose: () => void
  isDesktop: boolean
}

const drawerContent = (onMobileClose: () => void) => (
  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Toolbar sx={{ minHeight: 64, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography variant="h6" sx={{ fontWeight: 800 }}>
        SuperAdmin
      </Typography>
    </Toolbar>

    <List sx={{ px: 1.25, py: 1.5, gap: 0.5, display: 'grid' }}>
      {navItems.map((item) => (
        <ListItemButton
          key={item.path}
          component={NavLink}
          to={item.path}
          onClick={onMobileClose}
          sx={{
            borderRadius: 1.5,
            '&.active': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '& .MuiListItemIcon-root': {
                color: 'primary.contrastText',
              },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItemButton>
      ))}
    </List>
  </Box>
)

const SideNav = ({ mobileOpen, onMobileClose, isDesktop }: SideNavProps) => {
  return (
    <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent(onMobileClose)}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onMobileClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawerContent(onMobileClose)}
        </Drawer>
      )}
    </Box>
  )
}

export default SideNav
