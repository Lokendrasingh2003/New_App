import { Box, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  actions?: ReactNode
}

const PageHeader = ({ title, actions }: PageHeaderProps) => {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ xs: 'flex-start', sm: 'center' }}
      justifyContent="space-between"
      spacing={1.5}
      sx={{ mb: 2.5 }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  )
}

export default PageHeader
