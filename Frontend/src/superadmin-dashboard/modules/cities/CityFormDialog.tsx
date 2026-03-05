import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { City } from '../../types/City'
import type { ActionResult, CityUpsertInput } from '../../store/types'

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const sanitizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

type CityFormDialogProps = {
  open: boolean
  mode: 'add' | 'edit'
  city?: City
  cities: City[]
  onClose: () => void
  onSubmit: (input: CityUpsertInput) => Promise<ActionResult>
}

const CityFormDialog = ({ open, mode, city, cities, onClose, onSubmit }: CityFormDialogProps) => {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [commissionInput, setCommissionInput] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [deliveryEnabled, setDeliveryEnabled] = useState(true)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)
  const [submitting, setSubmitting] = useState(false)

  const resetFromCity = (target?: City) => {
    const source = target
    setName(source?.name ?? '')
    setSlug(source?.slug ?? '')
    setSlugTouched(Boolean(source))
    setCommissionInput(
      source?.commissionOverridePercentage !== undefined && source?.commissionOverridePercentage !== null
        ? String(source.commissionOverridePercentage)
        : '',
    )
    setIsActive(source?.isActive ?? true)
    setDeliveryEnabled(source?.deliveryEnabled ?? true)
    setSubmitError(undefined)
  }

  const handleEntered = () => {
    resetFromCity(city)
  }

  const normalizedName = name.trim().replace(/\s+/g, ' ')
  const normalizedSlug = sanitizeSlug(slug)

  const commissionValue = commissionInput.trim() === '' ? null : Number(commissionInput)

  const errors = useMemo(() => {
    const next: { name?: string; slug?: string; commission?: string } = {}

    if (!normalizedName) {
      next.name = 'City name is required.'
    }

    if (!normalizedSlug) {
      next.slug = 'Slug is required.'
    }

    const duplicateName = cities.some(
      (existingCity) =>
        existingCity.id !== city?.id && existingCity.name.toLowerCase() === normalizedName.toLowerCase(),
    )

    if (normalizedName && duplicateName) {
      next.name = 'City name must be unique.'
    }

    const duplicateSlug = cities.some(
      (existingCity) => existingCity.id !== city?.id && existingCity.slug.toLowerCase() === normalizedSlug.toLowerCase(),
    )

    if (normalizedSlug && duplicateSlug) {
      next.slug = 'Slug must be unique.'
    }

    if (
      commissionValue !== null &&
      (!Number.isFinite(commissionValue) || Number.isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100)
    ) {
      next.commission = 'Commission must be between 0 and 100.'
    }

    return next
  }, [cities, city?.id, commissionValue, normalizedName, normalizedSlug])

  const isValid = !errors.name && !errors.slug && !errors.commission

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) {
      setSlug(slugify(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlugTouched(true)
    setSlug(sanitizeSlug(value))
  }

  const handleSave = async () => {
    if (!isValid) {
      return
    }

    setSubmitting(true)
    setSubmitError(undefined)

    try {
      const result = await onSubmit({
        name: normalizedName,
        slug: normalizedSlug,
        isActive,
        deliveryEnabled,
        commissionOverridePercentage: commissionValue,
      })

      if (!result.ok) {
        setSubmitError(result.error ?? 'Could not save city.')
        return
      }

      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} onTransitionEnter={handleEntered} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'add' ? 'Add City' : 'Edit City'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <TextField
            label="City Name"
            required
            fullWidth
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            error={Boolean(errors.name)}
            helperText={errors.name}
          />

          <TextField
            label="Slug"
            required
            fullWidth
            value={slug}
            onChange={(event) => handleSlugChange(event.target.value)}
            error={Boolean(errors.slug)}
            helperText={errors.slug ?? 'URL-friendly city identifier'}
          />

          <TextField
            label="Commission Override (%)"
            fullWidth
            value={commissionInput}
            onChange={(event) => setCommissionInput(event.target.value)}
            error={Boolean(errors.commission)}
            helperText={errors.commission ?? 'Optional. Enter a value between 0 and 100.'}
            inputProps={{ inputMode: 'decimal' }}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(_, checked) => setIsActive(checked)} />}
              label="Active"
            />
            <FormControlLabel
              control={<Switch checked={deliveryEnabled} onChange={(_, checked) => setDeliveryEnabled(checked)} />}
              label="Delivery Enabled"
            />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!isValid || submitting}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CityFormDialog
