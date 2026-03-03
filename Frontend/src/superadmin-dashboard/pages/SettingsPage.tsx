import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import ConfirmDialog from '../ui/ConfirmDialog'
import PageHeader from '../ui/PageHeader'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'

const SettingsPage = () => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { resetAllDemoData } = useSuperAdminStore()
  const { showSuccess } = useAppSnackbar()

  const handleConfirmReset = () => {
    resetAllDemoData()
    showSuccess('SuperAdmin demo data reset to defaults')
    setConfirmOpen(false)
  }

  return (
    <>
      <PageHeader title="Settings" />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.75}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Demo Data
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Restore all superadmin demo entities to their default seeded values.
              </Typography>
            </Stack>

            <Button
              variant="contained"
              color="error"
              startIcon={<WarningAmberRoundedIcon />}
              onClick={() => setConfirmOpen(true)}
              sx={{ width: { xs: '100%', sm: 'fit-content' } }}
            >
              Reset SuperAdmin Demo Data
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset SuperAdmin demo data?"
        description="This will restore all SuperAdmin local demo data (cities, categories, shops, orders, config, payments, payouts, refunds, coupons, subscriptions, audit logs) and clear published category bridge data. You will stay logged in."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </>
  )
}

export default SettingsPage
