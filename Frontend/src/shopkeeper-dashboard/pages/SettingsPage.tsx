import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import { useEffect, useState } from 'react'
import axios from 'axios'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import { uploadShopImage } from '../services/shopService'
import { useShopkeeper } from '../shared/hooks/useShopkeeper'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import type { DeliveryPayer } from '../types/shop'

type SettingsErrors = {
  shopName?: string
  phone?: string
  pincode?: string
  open?: string
  close?: string
  serviceRadiusKm?: string
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/

const SettingsPage = () => {
  const { shop, resetAllData } = useShopkeeperStore()
  const { shopId, shopSettings, isLoadingShop, isSavingShop, shopError, loadShopData, saveShopSettings } = useShopkeeper()
  const { showMessage } = useAppFeedback()
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [errors, setErrors] = useState<SettingsErrors>({})
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({
    shopName: shop.shopName,
    imageUrl: shop.imageUrl ?? '',
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

  useEffect(() => {
    setForm({
      shopName: shopSettings.shopName,
      imageUrl: shopSettings.imageUrl ?? '',
      ownerName: shopSettings.ownerName ?? '',
      phone: shopSettings.phone,
      city: shopSettings.city,
      addressLine1: shopSettings.addressLine1,
      area: shopSettings.area,
      pincode: shopSettings.pincode,
      open: shopSettings.businessHours.open,
      close: shopSettings.businessHours.close,
      payer: shopSettings.delivery.payer,
      chargeAmount: Number(shopSettings.delivery.chargeAmount || 0),
      serviceRadiusKm: Number(shopSettings.delivery.serviceRadiusKm || 0),
    })
  }, [shopSettings])

  const validate = () => {
    const nextErrors: SettingsErrors = {}

    const trimmedName = form.shopName.trim()
    if (trimmedName.length < 3 || trimmedName.length > 50) {
      nextErrors.shopName = 'Shop name must be between 3 and 50 characters'
    }

    if (!/^\d{10}$/.test(form.phone)) {
      nextErrors.phone = 'Phone must be 10 digits'
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      nextErrors.pincode = 'Pincode must be 6 digits'
    }

    if (form.serviceRadiusKm < 1 || form.serviceRadiusKm > 50) {
      nextErrors.serviceRadiusKm = 'Service radius must be between 1 and 50 km'
    }

    if (!timeRegex.test(form.open)) {
      nextErrors.open = 'Open time must be valid HH:mm format'
    }

    if (!timeRegex.test(form.close)) {
      nextErrors.close = 'Close time must be valid HH:mm format'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (isSavingShop) {
      return
    }

    setSaveError('')

    if (!validate()) {
      return
    }

    try {
      await saveShopSettings({
        shopName: form.shopName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone,
        city: form.city.trim(),
        addressLine1: form.addressLine1.trim(),
        area: form.area.trim(),
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

      showMessage('Settings saved successfully')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSaveError(error.response?.data?.error?.message || error.response?.data?.message || 'Unable to save settings')
      } else {
        setSaveError(error instanceof Error ? error.message : 'Unable to save settings')
      }
    }
  }

  const handleShopImageUpload = async (file: File) => {
    if (!shopId || isUploadingImage) {
      return
    }

    try {
      setSaveError('')
      setIsUploadingImage(true)
      await uploadShopImage(shopId, file)
      await loadShopData()
      showMessage('Shop image updated successfully')
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setSaveError(error.response?.data?.error?.message || error.response?.data?.message || 'Unable to upload shop image')
      } else {
        setSaveError(error instanceof Error ? error.message : 'Unable to upload shop image')
      }
    } finally {
      setIsUploadingImage(false)
    }
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Settings"
          subtitle="Configure your shop preferences and profile"
          actions={[
            {
              label: isSavingShop ? 'Saving...' : 'Save',
              onClick: () => {
                void handleSave()
              },
              variant: 'contained',
              color: 'primary',
            },
          ]}
        />

        {isLoadingShop ? (
          <Card sx={{ border: '1px solid rgba(15,23,42,0.08)' }}>
            <CardContent>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading shop settings...
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {shopError ? <Alert severity="error">{shopError}</Alert> : null}
        {saveError ? <Alert severity="error">{saveError}</Alert> : null}

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
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Full Profile Details
            </Typography>
            <Grid container spacing={1.6} sx={{ mb: 2.4 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Shop Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shopSettings.shopName || '--'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Owner Name</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shopSettings.ownerName || '--'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Category</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shopSettings.categoryName || '--'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Phone</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shopSettings.phone || '--'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Address</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {[shopSettings.addressLine1, shopSettings.area, shopSettings.city, shopSettings.pincode].filter(Boolean).join(', ') || '--'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Opening - Closing</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {(shopSettings.businessHours.open && shopSettings.businessHours.close)
                    ? `${shopSettings.businessHours.open} - ${shopSettings.businessHours.close}`
                    : '--'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Slug</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{shopSettings.slug || '--'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="text.secondary">Public URL</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>{shopSettings.publicUrl || '--'}</Typography>
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 2.2 }}>
              Shop Profile
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2.2 }}>
              <Box
                sx={{
                  width: { xs: '100%', md: 220 },
                  height: 160,
                  borderRadius: 2,
                  border: '1px solid rgba(15,23,42,0.12)',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(15,23,42,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {form.imageUrl ? (
                  <Box component="img" src={form.imageUrl} alt="Shop" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Typography variant="body2" color="text.secondary">No shop image</Typography>
                )}
              </Box>

              <Stack spacing={1.2} justifyContent="center">
                <Button component="label" variant="outlined" disabled={isUploadingImage}>
                  {isUploadingImage ? 'Uploading...' : form.imageUrl ? 'Change Shop Image' : 'Upload Shop Image'}
                  <input
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) {
                        return
                      }

                      void handleShopImageUpload(file)
                      event.currentTarget.value = ''
                    }}
                  />
                </Button>
                <Typography variant="caption" color="text.secondary">
                  Allowed formats: JPG, PNG, WEBP. Max size: 8MB.
                </Typography>
              </Stack>
            </Stack>

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
                  error={Boolean(errors.open)}
                  helperText={errors.open}
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
                  error={Boolean(errors.close)}
                  helperText={errors.close}
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
              Reset Local Data
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Clear locally cached orders, products, offers, shop settings and subcategories.
            </Typography>
            <Button variant="outlined" color="error" onClick={() => setConfirmResetOpen(true)} disabled={isSavingShop}>
              Reset Local Data
            </Button>
          </CardContent>
        </Card>
      </Stack>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset local data?"
        description="This will clear cached orders, products, offers, shop settings and subcategories."
        confirmLabel="Reset"
        confirmColor="error"
        isDestructive
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          resetAllData()
          setConfirmResetOpen(false)
        }}
      />
    </Container>
  )
}

export default SettingsPage
