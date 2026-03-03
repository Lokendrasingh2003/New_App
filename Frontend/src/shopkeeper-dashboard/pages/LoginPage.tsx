import { useEffect, useMemo, useState } from 'react'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { isShopkeeperLoggedIn, loginShopkeeper } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import logoImage from '../../assets/logooo.png'

const mobileRegex = /^\d{10}$/

const LoginPage = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useAppFeedback()
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isShopkeeperLoggedIn()) {
      navigate('/shop/dashboard', { replace: true })
    }
  }, [navigate])

  const mobileError = useMemo(() => {
    if (!submitAttempted) {
      return ''
    }

    return mobileRegex.test(mobile) ? '' : 'Mobile number must be exactly 10 digits'
  }, [mobile, submitAttempted])

  const passwordError = useMemo(() => {
    if (!submitAttempted) {
      return ''
    }

    return password.length >= 4 ? '' : 'Password must be at least 4 characters'
  }, [password, submitAttempted])

  const handleLogin = async () => {
    setSubmitAttempted(true)
    setApiError('')

    const isMobileValid = mobileRegex.test(mobile)
    const isPasswordValid = password.length >= 4

    if (!isMobileValid || !isPasswordValid) {
      return
    }

    try {
      setIsSubmitting(true)
      await loginShopkeeper(mobile, password)
      showSuccess('Login successful')
      navigate('/shop/dashboard', { replace: true })
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error?.message || error.response?.data?.message || 'Unable to login. Please try again.'
        setApiError(message)
        showError(message)
      } else if (error instanceof Error) {
        setApiError(error.message)
        showError(error.message)
      } else {
        const message = 'Unable to login. Please try again.'
        setApiError(message)
        showError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2.5,
        background:
          'radial-gradient(circle at top right, rgba(20,184,166,0.14), transparent 42%), radial-gradient(circle at bottom left, rgba(37,99,235,0.12), transparent 42%), #F8FAFC',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, border: '1px solid rgba(15,23,42,0.08)' }}>
        <CardContent>
          <Stack spacing={2.25}>
            <Stack spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
              <Box
                component="img"
                src={logoImage}
                alt="Shopkeeper Logo"
                sx={{ width: 86, height: 86, objectFit: 'contain' }}
              />
              <Avatar sx={{ bgcolor: 'primary.main', boxShadow: '0 8px 18px rgba(15,118,110,0.25)' }}>
                <LockOutlinedIcon fontSize="small" />
              </Avatar>
            </Stack>

            <Typography variant="h5" textAlign="center" sx={{ fontWeight: 800 }}>
              Shopkeeper Login
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Sign in to manage orders, products and offers
            </Typography>

            <Divider />

            <TextField
              label="Mobile Number"
              value={mobile}
              onChange={(event) => setMobile(event.target.value.replace(/\D/g, ''))}
              error={Boolean(mobileError)}
              helperText={mobileError || 'Enter 10-digit mobile number'}
              inputProps={{ maxLength: 10, inputMode: 'numeric' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">+91</InputAdornment>,
              }}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={Boolean(passwordError)}
              helperText={passwordError || 'Minimum 4 characters'}
              fullWidth
            />

            <Button variant="contained" size="large" onClick={handleLogin} disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>

            {apiError ? <Alert severity="error">{apiError}</Alert> : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LoginPage
