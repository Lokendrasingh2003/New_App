import { CircularProgress, Stack, Typography } from '@mui/material'

type PageLoaderProps = {
  message?: string
}

const PageLoader = ({ message = 'Loading...' }: PageLoaderProps) => {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.25}
      sx={{ minHeight: '40vh', width: '100%' }}
    >
      <CircularProgress size={24} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Stack>
  )
}

export default PageLoader
