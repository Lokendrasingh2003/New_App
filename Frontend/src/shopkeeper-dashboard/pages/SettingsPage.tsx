import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import type { DeliveryPayer } from '../types/shop'

type SettingsErrors = {
  shopName?: string
  phone?: string
  pincode?: string
  serviceRadiusKm?: string
}

const SettingsPage = () => {
  const { shop, updateShopSettings, resetAllDemoData } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [form, setForm] = useState({
    shopName: shop.shopName,
    ownerName: shop.ownerName ?? '',
    phone: shop.phone,
    city: shop.city,
    addressLine1: shop.addressLine1,
    area: shop.area,
    pincode: shop.pincode,
    open: shop.businessHours.open,
    close: shop.businessHours.close,
    payer: shop.delivery.payer as DeliveryPayer,
    chargeAmount: shop.delivery.chargeAmount,
    serviceRadiusKm: shop.delivery.serviceRadiusKm,
  })

  const validate = () => {
    const nextErrors: SettingsErrors = {}

    if (!form.shopName.trim()) {
      nextErrors.shopName = 'Shop name is required'
    }

    if (!/^\d{10}$/.test(form.phone)) {
      nextErrors.phone = 'Phone must be 10 digits'
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      nextErrors.pincode = 'Pincode must be 6 digits'
    }

    if (form.serviceRadiusKm <= 0) {
      nextErrors.serviceRadiusKm = 'Service radius must be greater than 0'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = () => {
    if (!validate()) {
      return
    }

    updateShopSettings({
      shopName: form.shopName,
      ownerName: form.ownerName || undefined,
      phone: form.phone,
      city: form.city,
      addressLine1: form.addressLine1,
      area: form.area,
      pincode: form.pincode,
      delivery: {
        payer: form.payer,
        chargeAmount: Number(form.chargeAmount),
        serviceRadiusKm: Number(form.serviceRadiusKm),
      },
      businessHours: {
        open: form.open,
        close: form.close,
      },
    })

    showMessage('Settings saved')
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Settings"
          subtitle="Configure your shop preferences and profile"
          actions={[
            {
              label: 'Save',
              onClick: handleSave,
              variant: 'contained',
              color: 'primary',
            },
          ]}
        />

        <Box
          sx={{
            borderRadius: 2.5,
            border: '1px solid rgba(15,23,42,0.08)',
            background: 'linear-gradient(140deg, rgba(37,99,235,0.08) 0%, rgba(255,255,255,1) 46%, rgba(15,118,110,0.08) 100%)',
            px: 2.25,
            py: 1.8,
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Keep shop identity, service area and business operations up-to-date.</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Shop Slug: {shop.slug}</Typography>
          </Stack>
        </Box>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2.2 }}>
              Shop Profile
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Shop Name"
                  value={form.shopName}
                  onChange={(event) => setForm((prev) => ({ ...prev, shopName: event.target.value }))}
                  error={Boolean(errors.shopName)}
                  helperText={errors.shopName}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Owner Name"
                  value={form.ownerName}
                  onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  error={Boolean(errors.phone)}
                  helperText={errors.phone}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="City"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={form.pincode}
                  onChange={(event) => setForm((prev) => ({ ...prev, pincode: event.target.value }))}
                  error={Boolean(errors.pincode)}
                  helperText={errors.pincode}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  value={form.addressLine1}
                  onChange={(event) => setForm((prev) => ({ ...prev, addressLine1: event.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Area"
                  value={form.area}
                  onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2.2 }}>
              Business Hours
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="time"
                  label="Open"
                  value={form.open}
                  onChange={(event) => setForm((prev) => ({ ...prev, open: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="time"
                  label="Close"
                  value={form.close}
                  onChange={(event) => setForm((prev) => ({ ...prev, close: event.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2.2 }}>
              Delivery Settings
            </Typography>
            <Stack spacing={2}>
              <FormControl>
                <FormLabel>Delivery charge paid by</FormLabel>
                <RadioGroup
                  row
                  value={form.payer}
                  onChange={(event) => setForm((prev) => ({ ...prev, payer: event.target.value as DeliveryPayer }))}
                >
                  <FormControlLabel value="CUSTOMER" control={<Radio />} label="Customer" />
                  <FormControlLabel value="SHOP" control={<Radio />} label="Shop" />
                </RadioGroup>
              </FormControl>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Delivery charge amount"
                    value={form.chargeAmount}
                    onChange={(event) => setForm((prev) => ({ ...prev, chargeAmount: Number(event.target.value || 0) }))}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Service radius (km)"
                    value={form.serviceRadiusKm}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, serviceRadiusKm: Number(event.target.value || 0) }))
                    }
                    error={Boolean(errors.serviceRadiusKm)}
                    helperText={errors.serviceRadiusKm}
                  />
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.8 }}>
              Reset Demo Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Restore orders, products, offers, shop settings, and subcategories back to the initial demo state.
            </Typography>
            <Button variant="outlined" color="error" onClick={() => setConfirmResetOpen(true)}>
              Reset Demo Data
            </Button>
          </CardContent>
        </Card>
      </Stack>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset demo data?"
        description="This will restore orders, products, offers, shop settings and subcategories to default demo data."
        confirmLabel="Reset"
        confirmColor="error"
        isDestructive
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          resetAllDemoData()
          setConfirmResetOpen(false)
        }}
      />
    </Container>
  )
}

export default SettingsPage
