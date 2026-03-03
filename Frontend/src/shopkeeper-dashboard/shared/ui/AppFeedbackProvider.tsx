import { Alert, Snackbar } from '@mui/material'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { subscribeFeedback, type FeedbackSeverity } from '../../../utils/feedbackBus'

type AppFeedbackContextType = {
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showMessage: (message: string) => void
}

const AppFeedbackContext = createContext<AppFeedbackContextType | null>(null)

export const AppFeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<FeedbackSeverity>('info')

  useEffect(() => {
    const unsubscribe = subscribeFeedback((payload) => {
      setMessage(payload.message)
      setSeverity(payload.severity || 'info')
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      showSuccess: (nextMessage: string) => {
        setSeverity('success')
        setMessage(nextMessage)
      },
      showError: (nextMessage: string) => {
        setSeverity('error')
        setMessage(nextMessage)
      },
      showMessage: (nextMessage: string) => {
        setSeverity('info')
        setMessage(nextMessage)
      },
    }),
    [],
  )

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={2600}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setMessage('')} severity={severity} variant="filled" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </AppFeedbackContext.Provider>
  )
}

export const useAppFeedback = () => {
  const context = useContext(AppFeedbackContext)
  if (!context) {
    throw new Error('useAppFeedback must be used within AppFeedbackProvider')
  }

  return context
}
