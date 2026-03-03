import { Box, Toolbar, useMediaQuery, useTheme } from '@mui/material'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import SideNav from './SideNav'
import TopBar from './TopBar'

const SuperAdminLayout = () => {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen((previous) => !previous)
  }

  const handleMobileClose = () => {
    setMobileOpen(false)
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <TopBar onMenuClick={handleDrawerToggle} showMenuButton={!isDesktop} />
      <SideNav mobileOpen={mobileOpen} onMobileClose={handleMobileClose} isDesktop={isDesktop} />

      <Box component="main" sx={{ flexGrow: 1, width: { md: 'calc(100% - 260px)' }, p: { xs: 2, md: 3 } }}>
        <Toolbar sx={{ minHeight: 64 }} />
        <Outlet />
      </Box>
    </Box>
  )
}

export default SuperAdminLayout
