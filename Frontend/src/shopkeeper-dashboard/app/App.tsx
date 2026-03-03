import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { ShopkeeperStoreProvider } from '../shared/store/ShopkeeperStore'
import { AppFeedbackProvider } from '../shared/ui/AppFeedbackProvider'
import AppErrorBoundary from '../shared/ui/AppErrorBoundary'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0F766E',
      dark: '#115E59',
      light: '#14B8A6',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#334155',
      dark: '#1E293B',
      light: '#475569',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#16A34A',
    },
    error: {
      main: '#DC2626',
    },
    warning: {
      main: '#D97706',
    },
    info: {
      main: '#2563EB',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    divider: 'rgba(15, 23, 42, 0.1)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Roboto, sans-serif',
    h3: {
      fontWeight: 800,
      fontSize: '2.15rem',
      letterSpacing: '-0.02em',
    },
    h4: {
      fontWeight: 800,
      fontSize: '1.8rem',
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 700,
      fontSize: '1.3rem',
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 700,
      fontSize: '1.05rem',
    },
    body1: {
      fontSize: '0.95rem',
      lineHeight: 1.55,
    },
    body2: {
      fontSize: '0.86rem',
      lineHeight: 1.5,
    },
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          borderRadius: 10,
          paddingInline: 16,
          paddingBlock: 8,
          boxShadow: 'none',
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
          boxShadow: '0 8px 18px rgba(15, 118, 110, 0.24)',
          '&:hover': {
            background: 'linear-gradient(135deg, #0E6862 0%, #0FA092 100%)',
            boxShadow: '0 10px 20px rgba(15, 118, 110, 0.3)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 12px 28px rgba(15, 23, 42, 0.06)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          background: '#FFFFFF',
          '&:hover': {
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.1)',
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '20px',
          '&:last-child': {
            paddingBottom: '20px',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: 'rgba(15, 23, 42, 0.14)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(15, 118, 110, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiFormControl: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 999,
          letterSpacing: '0.01em',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        body: {
          backgroundColor: '#F8FAFC',
        },
        '.MuiDataGrid-root': {
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.1)',
          backgroundColor: '#FFFFFF',
        },
        '.MuiDataGrid-columnHeaders': {
          background: '#F8FAFC',
          borderBottom: '1px solid rgba(15, 23, 42, 0.1)',
        },
        '.MuiDataGrid-columnHeaderTitle': {
          fontWeight: 700,
          fontSize: '0.78rem',
          letterSpacing: '0.02em',
          color: '#334155',
        },
        '.MuiDataGrid-cell': {
          borderBottomColor: 'rgba(15, 23, 42, 0.07)',
          paddingTop: '7px',
          paddingBottom: '7px',
        },
        '.MuiDataGrid-row:hover': {
          backgroundColor: 'rgba(15, 118, 110, 0.06) !important',
        },
        '.MuiDataGrid-footerContainer': {
          borderTop: '1px solid rgba(15, 23, 42, 0.08)',
        },
      },
    },
  },
})

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary level="app">
        <AppFeedbackProvider>
          <ShopkeeperStoreProvider>
            <RouterProvider router={router} />
          </ShopkeeperStoreProvider>
        </AppFeedbackProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  )
}

export default App
