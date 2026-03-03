import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Component } from 'react'

type AppErrorBoundaryProps = {
  children: ReactNode
  level?: 'app' | 'page'
}

type AppErrorBoundaryState = {
  hasError: boolean
  message: string
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  public static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Unexpected error occurred.'
    return {
      hasError: true,
      message,
    }
  }

  public componentDidCatch(error: unknown) {
    console.error('AppErrorBoundary caught error:', error)
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' })
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const isAppLevel = this.props.level === 'app'

    return (
      <Box sx={{ minHeight: isAppLevel ? '100vh' : 320, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 560 }}>
          <Alert severity="error">{isAppLevel ? 'Application error' : 'Page failed to render'}</Alert>
          <Typography variant="h6">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.message || 'An unexpected error occurred while rendering this screen.'}
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" onClick={this.reset}>
              Retry
            </Button>
            <Button variant="outlined" onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </Stack>
        </Stack>
      </Box>
    )
  }
}

export default AppErrorBoundary
