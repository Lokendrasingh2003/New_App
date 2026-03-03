import { CircularProgress, Stack, ThemeProvider, Typography } from '@mui/material'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { SuperAdminStoreProvider, useSuperAdminStore } from './store/SuperAdminStore'
import { superAdminTheme } from './theme/superAdminTheme'
import { AppSnackbarProvider } from './ui/AppSnackbarProvider'

const SuperAdminBootstrap = () => {
  const { initialized, initializeFromStorageOrSeed } = useSuperAdminStore()

  useEffect(() => {
    initializeFromStorageOrSeed()
  }, [initializeFromStorageOrSeed])

  if (!initialized) {
    return (
      <Stack
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ minHeight: '100vh', bgcolor: 'background.default' }}
      >
        <CircularProgress size={26} />
        <Typography variant="body2" color="text.secondary">
          Preparing SuperAdmin workspace...
        </Typography>
      </Stack>
    )
  }

  return <Outlet />
}

const SuperAdminApp = () => {
  return (
    <ThemeProvider theme={superAdminTheme}>
      <AppSnackbarProvider>
        <SuperAdminStoreProvider>
          <SuperAdminBootstrap />
        </SuperAdminStoreProvider>
      </AppSnackbarProvider>
    </ThemeProvider>
  )
}

export default SuperAdminApp
