import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { Subcategory } from '../types/category'
import type { Product, ProductVariant } from '../types/product'

export type ProductFormValues = Omit<Product, 'id' | 'updatedAt'>

type ProductFormProps = {
  initialValues: ProductFormValues
  shopCategoryName: string
  subcategoryOptions: Subcategory[]
  submitLabel: string
  onSubmit: (values: ProductFormValues) => void
  onCancel: () => void
}

type ProductFormErrors = {
  name?: string
  category?: string
  subcategoryId?: string
  variants?: string
  variantErrors: Array<{
    label?: string
    price?: string
    mrp?: string
  }>
}

const createEmptyVariant = (): ProductVariant => ({
  id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: '',
  price: 0,
  mrp: 0,
  inStock: true,
})

const ProductForm = ({
  initialValues,
  shopCategoryName,
  subcategoryOptions,
  submitLabel,
  onSubmit,
  onCancel,
}: ProductFormProps) => {
  const [values, setValues] = useState<ProductFormValues>(initialValues)
  const [errors, setErrors] = useState<ProductFormErrors>({ variantErrors: [] })

  const validate = (): boolean => {
    const nextErrors: ProductFormErrors = {
      variantErrors: values.variants.map(() => ({})),
    }

    if (!values.name.trim()) {
      nextErrors.name = 'Name is required'
    }

    if (!values.category.trim()) {
      nextErrors.category = 'Category is required'
    }

    if (!values.subcategoryId?.trim()) {
      nextErrors.subcategoryId = 'Subcategory is required'
    }

    if (values.variants.length < 1) {
      nextErrors.variants = 'At least 1 variant is required'
    }

    values.variants.forEach((variant, index) => {
      if (!variant.label.trim()) {
        nextErrors.variantErrors[index].label = 'Label is required'
      }
      if (variant.price <= 0) {
        nextErrors.variantErrors[index].price = 'Price is required'
      }
      if (variant.mrp <= 0) {
        nextErrors.variantErrors[index].mrp = 'MRP is required'
      }
    })

    setErrors(nextErrors)

    const hasVariantErrors = nextErrors.variantErrors.some((variantError) =>
      Object.values(variantError).some(Boolean),
    )

    return !nextErrors.name && !nextErrors.category && !nextErrors.subcategoryId && !nextErrors.variants && !hasVariantErrors
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []).map((file) => file.name)
    setValues((prev) => ({
      ...prev,
      images: selectedFiles,
    }))
  }

  const handleVariantChange = <K extends keyof ProductVariant>(
    variantId: string,
    key: K,
    value: ProductVariant[K],
  ) => {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              [key]: value,
            }
          : variant,
      ),
    }))
  }

  const addVariant = () => {
    setValues((prev) => ({
      ...prev,
      variants: [...prev.variants, createEmptyVariant()],
    }))
  }

  const removeVariant = (variantId: string) => {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.filter((variant) => variant.id !== variantId),
    }))
  }

  const handleSave = () => {
    if (!validate()) {
      return
    }

    onSubmit({
      ...values,
      inStock: values.stockQty > 0 ? values.inStock : false,
    })
  }

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Basic Info
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Product Name"
                fullWidth
                value={values.name}
                onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Description"
                fullWidth
                value={values.description}
                onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Category
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Category"
                fullWidth
                value={shopCategoryName}
                disabled
                error={Boolean(errors.category)}
                helperText={errors.category ?? 'Category is fixed for your shop'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Subcategory"
                select
                fullWidth
                value={values.subcategoryId ?? ''}
                onChange={(event) => {
                  const selected = subcategoryOptions.find((item) => item.id === event.target.value)
                  setValues((prev) => ({
                    ...prev,
                    subcategoryId: selected?.id,
                    subcategory: selected?.name ?? '',
                  }))
                }}
                error={Boolean(errors.subcategoryId)}
                helperText={errors.subcategoryId}
                disabled={subcategoryOptions.length === 0}
              >
                {subcategoryOptions.map((subcategory) => (
                  <MenuItem key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Pricing & Inventory
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Base Price"
                type="number"
                fullWidth
                value={values.basePrice}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, basePrice: Number(event.target.value || 0) }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Base MRP"
                type="number"
                fullWidth
                value={values.baseMrp}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, baseMrp: Number(event.target.value || 0) }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Stock Qty"
                type="number"
                fullWidth
                value={values.stockQty}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, stockQty: Math.max(0, Number(event.target.value || 0)) }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.inStock}
                      onChange={(_, checked) => setValues((prev) => ({ ...prev, inStock: checked }))}
                    />
                  }
                  label="In Stock"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={values.active}
                      onChange={(_, checked) => setValues((prev) => ({ ...prev, active: checked }))}
                    />
                  }
                  label="Active"
                />
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Images
          </Typography>
          <Stack spacing={1.5}>
            <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ width: 'fit-content' }}>
              Select Images
              <input hidden type="file" multiple accept="image/*" onChange={handleImageChange} />
            </Button>
            <Typography variant="body2" color="text.secondary">
              Selected: {values.images.length > 0 ? values.images.join(', ') : 'No files selected'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6">Variants (Required)</Typography>
            <Button startIcon={<AddIcon />} onClick={addVariant} variant="outlined">
              Add Variant
            </Button>
          </Stack>

          {errors.variants && (
            <Typography color="error" variant="body2" sx={{ mb: 1.5 }}>
              {errors.variants}
            </Typography>
          )}

          <Stack spacing={1.5}>
            {values.variants.map((variant, index) => (
              <Box
                key={variant.id}
                sx={{
                  p: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Grid container spacing={1.5} alignItems="center">
                  <Grid size={{ xs: 12, md: 3 }}>
                    <TextField
                      label="Label"
                      fullWidth
                      value={variant.label}
                      onChange={(event) => handleVariantChange(variant.id, 'label', event.target.value)}
                      error={Boolean(errors.variantErrors[index]?.label)}
                      helperText={errors.variantErrors[index]?.label}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.5 }}>
                    <TextField
                      label="Price"
                      type="number"
                      fullWidth
                      value={variant.price}
                      onChange={(event) => handleVariantChange(variant.id, 'price', Number(event.target.value || 0))}
                      error={Boolean(errors.variantErrors[index]?.price)}
                      helperText={errors.variantErrors[index]?.price}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2.5 }}>
                    <TextField
                      label="MRP"
                      type="number"
                      fullWidth
                      value={variant.mrp}
                      onChange={(event) => handleVariantChange(variant.id, 'mrp', Number(event.target.value || 0))}
                      error={Boolean(errors.variantErrors[index]?.mrp)}
                      helperText={errors.variantErrors[index]?.mrp}
                    />
                  </Grid>
                  <Grid size={{ xs: 8, md: 2.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={variant.inStock}
                          onChange={(_, checked) => handleVariantChange(variant.id, 'inStock', checked)}
                        />
                      }
                      label="In Stock"
                    />
                  </Grid>
                  <Grid size={{ xs: 4, md: 1.5 }} sx={{ textAlign: { xs: 'right', md: 'center' } }}>
                    <IconButton
                      aria-label="remove variant"
                      color="error"
                      onClick={() => removeVariant(variant.id)}
                      disabled={values.variants.length === 1}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
        <Button variant="outlined" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {submitLabel}
        </Button>
      </Stack>
    </Stack>
  )
}

export default ProductForm
