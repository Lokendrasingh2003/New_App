import { createTheme } from '@mui/material'

export const superAdminTheme = createTheme({
  spacing: 8,
  shape: {
    borderRadius: 12,
  },
  palette: {
    background: {
      default: '#F5F7FB',
      paper: '#FFFFFF',
    },
  },
  typography: {
    h1: {
      fontSize: '2.6rem',
      fontWeight: 800,
      letterSpacing: '-0.03em',
    },
    h2: {
      fontSize: '2.15rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h4: {
      fontSize: '1.4rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    h5: {
      fontSize: '1.15rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontSize: '1.02rem',
      fontWeight: 700,
    },
  },
})
