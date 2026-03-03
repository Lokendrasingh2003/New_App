import { Snackbar } from '@mui/material'
import { createContext, useContext, useMemo, useState } from 'react'

type AppFeedbackContextType = {
  showMessage: (message: string) => void
}

const AppFeedbackContext = createContext<AppFeedbackContextType | null>(null)

export const AppFeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const [message, setMessage] = useState('')

  const value = useMemo(
    () => ({
      showMessage: (nextMessage: string) => setMessage(nextMessage),
    }),
    [],
  )

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={2200}
        onClose={() => setMessage('')}
        message={message}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
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
