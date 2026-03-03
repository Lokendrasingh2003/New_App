import { Box } from '@mui/material'
import type { ReactNode } from 'react'

type DataGridContainerProps = {
  children: ReactNode
}

const DataGridContainer = ({ children }: DataGridContainerProps) => {
  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ minWidth: 980 }}>{children}</Box>
    </Box>
  )
}

export default DataGridContainer
