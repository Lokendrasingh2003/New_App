import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isLoggedIn, login } from '../auth/authStore'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'

const LoginPage = () => {
  const navigate = useNavigate()
  const { showError, showSuccess } = useAppSnackbar()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (isLoggedIn()) {
    return <Navigate to="/superadmin/dashboard" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const result = await login(username.trim(), password)

    if (!result.ok) {
      showError(result.error || 'Invalid superadmin credentials/access key')
      return
    }

    showSuccess('Welcome back, Admin')
    navigate('/superadmin/dashboard', { replace: true })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Stack component="form" spacing={2} onSubmit={handleSubmit}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                SuperAdmin Login
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter any username and your backend admin key (INTERNAL_ADMIN_KEY, or JWT_SECRET if INTERNAL_ADMIN_KEY is not set)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Demo: username `superadmin` | password `super123`
              </Typography>
            </Box>

            <TextField
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              fullWidth
            />

            <TextField
              label="Admin Access Key"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      edge="end"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? <VisibilityOffRoundedIcon /> : <VisibilityRoundedIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button type="submit" variant="contained" fullWidth>
              Login
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default LoginPage
