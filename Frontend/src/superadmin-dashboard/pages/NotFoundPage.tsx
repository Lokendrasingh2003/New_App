import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 520 }}>
        <CardContent>
          <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ py: 2 }}>
            <ErrorOutlineRoundedIcon color="warning" sx={{ fontSize: 42 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Page not found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The page you are looking for does not exist in the SuperAdmin console.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Back
              </Button>
              <Button variant="contained" onClick={() => navigate('/superadmin/dashboard')}>
                Go to Dashboard
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default NotFoundPage
