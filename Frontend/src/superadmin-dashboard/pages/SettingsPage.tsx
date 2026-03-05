import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import ConfirmDialog from '../ui/ConfirmDialog'
import PageHeader from '../ui/PageHeader'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'

const SettingsPage = () => {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { resetAllData } = useSuperAdminStore()
  const { showError, showSuccess } = useAppSnackbar()

  const handleConfirmReset = async () => {
    const result = await resetAllData()
    if (!result.ok) {
      showError(result.error || 'Unable to refresh SuperAdmin data from backend')
      return
    }

    showSuccess('SuperAdmin local cache reset and backend data reloaded')
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
                Local Cache
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clear cached superadmin data and reload the latest records from backend admin APIs.
              </Typography>
            </Stack>

            <Button
              variant="contained"
              color="error"
              startIcon={<WarningAmberRoundedIcon />}
              onClick={() => setConfirmOpen(true)}
              sx={{ width: { xs: '100%', sm: 'fit-content' } }}
            >
              Reset Cache & Reload Backend Data
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset SuperAdmin local cache?"
        description="This will clear local cached superadmin data and reload cities, categories, shops, orders, config, payments, payouts, refunds, coupons, subscriptions, commission, and audit logs from backend APIs. You will stay logged in."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </>
  )
}

export default SettingsPage
