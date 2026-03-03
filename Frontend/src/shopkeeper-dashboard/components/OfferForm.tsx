import {
  Alert,
  Autocomplete,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { Offer, OfferScope, OfferType } from '../types/offer'

export type OfferFormValues = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>

type CategoryOption = {
  id: string
  name: string
}

type ProductOption = {
  id: string
  name: string
}

type OfferFormProps = {
  initialValues: OfferFormValues
  products: ProductOption[]
  categories: CategoryOption[]
  submitLabel: string
  onSubmit: (values: OfferFormValues) => Promise<void> | void
  onCancel: () => void
  onDisable?: () => void
}

type OfferFormErrors = {
  name?: string
  value?: string
  schedule?: string
  categories?: string
  products?: string
}

const toDateTimeLocal = (iso: string) => {
  const date = new Date(iso)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

const toIsoString = (value: string) => new Date(value).toISOString()

const OfferForm = ({
  initialValues,
  products,
  categories,
  submitLabel,
  onSubmit,
  onCancel,
  onDisable,
}: OfferFormProps) => {
  const [values, setValues] = useState<OfferFormValues>(initialValues)
  const [errors, setErrors] = useState<OfferFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const selectedCategoryOptions = useMemo(
    () => categories.filter((item) => values.categoryIds?.includes(item.id)),
    [categories, values.categoryIds],
  )

  const selectedProducts = useMemo(
    () => products.filter((item) => values.productIds?.includes(item.id)),
    [products, values.productIds],
  )

  const validate = (): boolean => {
    const nextErrors: OfferFormErrors = {}

    if (!values.name.trim()) {
      nextErrors.name = 'Offer name is required'
    }

    if (values.value <= 0) {
      nextErrors.value = 'Offer value must be greater than 0'
    }

    if (values.type === 'PERCENT' && (values.value < 1 || values.value > 100)) {
      nextErrors.value = 'Percent value must be between 1 and 100'
    }

    if (values.type === 'FLAT' && values.value <= 0) {
      nextErrors.value = 'Flat value must be greater than 0'
    }

    const startTime = new Date(values.startsAt).getTime()
    const endTime = new Date(values.endsAt).getTime()
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
      nextErrors.schedule = 'End date/time must be after start date/time'
    }

    if (values.scope === 'CATEGORIES' && (!values.categoryIds || values.categoryIds.length < 1)) {
      nextErrors.categories = 'Select at least one category'
    }

    if (values.scope === 'PRODUCTS' && (!values.productIds || values.productIds.length < 1)) {
      nextErrors.products = 'Select at least one product'
    }

    setErrors(nextErrors)

    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async () => {
    if (isSubmitting) {
      return
    }

    if (!validate()) {
      return
    }

    try {
      setSubmitError('')
      setIsSubmitting(true)
      await onSubmit(values)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save offer')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleScopeChange = (scope: OfferScope) => {
    if (scope === 'SHOP') {
      setValues((prev) => ({ ...prev, scope, categoryIds: [], productIds: [] }))
      return
    }

    if (scope === 'CATEGORIES') {
      setValues((prev) => ({ ...prev, scope, productIds: [] }))
      return
    }

    setValues((prev) => ({ ...prev, scope, categoryIds: [] }))
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Basic Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Offer Name"
                fullWidth
                value={values.name}
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Type"
                fullWidth
                select
                value={values.type}
                onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value as OfferType }))}
              >
                <MenuItem value="PERCENT">Percent</MenuItem>
                <MenuItem value="FLAT">Flat</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label={values.type === 'PERCENT' ? 'Percent Value' : 'Flat Value'}
                type="number"
                fullWidth
                value={values.value}
                onChange={(event) => setValues((prev) => ({ ...prev, value: Number(event.target.value || 0) }))}
                error={Boolean(errors.value)}
                helperText={errors.value}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Applies To
          </Typography>
          <FormControl fullWidth>
            <FormLabel>Offer Scope</FormLabel>
            <RadioGroup
              row
              value={values.scope}
              onChange={(event) => handleScopeChange(event.target.value as OfferScope)}
              sx={{ mb: 2 }}
            >
              <FormControlLabel value="SHOP" control={<Radio />} label="Entire shop" />
              <FormControlLabel value="CATEGORIES" control={<Radio />} label="Categories" />
              <FormControlLabel value="PRODUCTS" control={<Radio />} label="Products" />
            </RadioGroup>

            {values.scope === 'CATEGORIES' && (
              <Autocomplete
                multiple
                options={categories}
                getOptionLabel={(option) => option.name}
                value={selectedCategoryOptions}
                onChange={(_, selected) =>
                  setValues((prev) => ({
                    ...prev,
                    categoryIds: selected.map((item) => item.id),
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Categories"
                    error={Boolean(errors.categories)}
                    helperText={errors.categories}
                  />
                )}
              />
            )}

            {values.scope === 'PRODUCTS' && (
              <Autocomplete
                multiple
                options={products}
                getOptionLabel={(option) => option.name}
                value={selectedProducts}
                onChange={(_, selected) =>
                  setValues((prev) => ({
                    ...prev,
                    productIds: selected.map((item) => item.id),
                  }))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Products"
                    error={Boolean(errors.products)}
                    helperText={errors.products}
                  />
                )}
              />
            )}
          </FormControl>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Schedule
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                type="datetime-local"
                fullWidth
                label="Start Date & Time"
                value={toDateTimeLocal(values.startsAt)}
                onChange={(event) => setValues((prev) => ({ ...prev, startsAt: toIsoString(event.target.value) }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                type="datetime-local"
                fullWidth
                label="End Date & Time"
                value={toDateTimeLocal(values.endsAt)}
                onChange={(event) => setValues((prev) => ({ ...prev, endsAt: toIsoString(event.target.value) }))}
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.schedule)}
                helperText={errors.schedule}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {submitError ? <Alert severity="error">{submitError}</Alert> : null}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
        {onDisable && (
          <Button variant="outlined" color="error" onClick={onDisable} disabled={isSubmitting}>
            Disable Offer
          </Button>
        )}
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </Stack>
    </Stack>
  )
}

export default OfferForm
