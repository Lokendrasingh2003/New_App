import { Alert, Snackbar } from '@mui/material'
import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

type SnackbarVariant = 'success' | 'error' | 'warning'

type SnackbarState = {
  open: boolean
  message: string
  variant: SnackbarVariant
}

type AppSnackbarContextValue = {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
}

const AppSnackbarContext = createContext<AppSnackbarContextValue | null>(null)

type AppSnackbarProviderProps = {
  children: ReactNode
}

export const AppSnackbarProvider = ({ children }: AppSnackbarProviderProps) => {
  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    variant: 'success',
  })

  const handleClose = () => {
    setSnackbarState((previous) => ({ ...previous, open: false }))
  }

  const value = useMemo<AppSnackbarContextValue>(
    () => ({
      showSuccess: (message: string) => {
        setSnackbarState({ open: true, message, variant: 'success' })
      },
      showError: (message: string) => {
        setSnackbarState({ open: true, message, variant: 'error' })
      },
      showWarning: (message: string) => {
        setSnackbarState({ open: true, message, variant: 'warning' })
      },
    }),
    [],
  )

  return (
    <AppSnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbarState.open}
        autoHideDuration={3200}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert variant="filled" severity={snackbarState.variant} onClose={handleClose} sx={{ width: '100%' }}>
          {snackbarState.message}
        </Alert>
      </Snackbar>
    </AppSnackbarContext.Provider>
  )
}

export const useAppSnackbar = () => {
  const context = useContext(AppSnackbarContext)

  if (!context) {
    throw new Error('useAppSnackbar must be used within AppSnackbarProvider')
  }

  return context
}
