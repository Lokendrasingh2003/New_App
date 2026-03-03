import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

const NotFoundPage = () => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2, bgcolor: 'background.default' }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent>
          <Stack spacing={2.25} alignItems="flex-start">
            <ErrorOutlineIcon color="warning" sx={{ fontSize: 34 }} />
            <Typography variant="h4">Page Not Found</Typography>
            <Typography color="text.secondary">
              The requested page does not exist or may have been moved.
            </Typography>
            <Button component={RouterLink} to="/shop/dashboard" variant="contained">
              Go to Dashboard
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}

export default NotFoundPage
