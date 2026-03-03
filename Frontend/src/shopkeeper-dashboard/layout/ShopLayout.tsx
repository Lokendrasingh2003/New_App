import { Box, Drawer, Toolbar, useMediaQuery, useTheme } from '@mui/material'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SidebarNav from './SidebarNav'
import TopBar from './TopBar'

const drawerWidth = 260

const ShopLayout = () => {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!isDesktop) {
      setMobileOpen(false)
    }
  }, [location.pathname, isDesktop])

  const handleMenuToggle = () => {
    setMobileOpen((prev) => !prev)
  }

  const drawerContent = <SidebarNav onNavigate={() => setMobileOpen(false)} />

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar onMenuClick={handleMenuToggle} showMenuButton={!isDesktop} />

      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              borderRight: '1px solid rgba(15,23,42,0.1)',
              background: '#FFFFFF',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleMenuToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              background: '#FFFFFF',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          px: { xs: 1.25, md: 2.5 },
          pb: { xs: 1.25, md: 2.5 },
        }}
      >
        <Toolbar />
        <Box
          sx={{
            maxWidth: '100%',
            mt: 1,
            borderRadius: 2,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default ShopLayout
