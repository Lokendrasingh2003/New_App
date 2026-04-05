import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
  Alert,
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
  onSubmit: (values: ProductFormValues) => Promise<void> | void
  onCancel: () => void
  onImageUpload?: (files: File[]) => Promise<string[]>
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
    stockQty?: string
  }>
}

const createEmptyVariant = (): ProductVariant => ({
  id: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: '',
  price: 0,
  mrp: 0,
  stockQty: 0,
  inStock: true,
})

const deriveProductSummary = (variants: ProductVariant[]) => {
  const normalizedVariants = variants.map((variant) => {
    const stockQty = Math.max(0, Number(variant.stockQty || 0))
    return {
      ...variant,
      label: variant.label.trim(),
      price: Number(variant.price || 0),
      mrp: Number(variant.mrp || 0),
      stockQty,
      inStock: Boolean(variant.inStock && stockQty > 0),
    }
  })

  const primaryVariant = normalizedVariants[0]
  const totalStockQty = normalizedVariants.reduce((total, variant) => total + variant.stockQty, 0)

  return {
    variants: normalizedVariants,
    basePrice: Number(primaryVariant?.price || 0),
    baseMrp: Number(primaryVariant?.mrp || 0),
    stockQty: totalStockQty,
    inStock: normalizedVariants.some((variant) => variant.inStock && variant.stockQty > 0),
  }
}

const ProductForm = ({
  initialValues,
  shopCategoryName,
  subcategoryOptions,
  submitLabel,
  onSubmit,
  onCancel,
  onImageUpload,
}: ProductFormProps) => {
  const [values, setValues] = useState<ProductFormValues>(initialValues)
  const [errors, setErrors] = useState<ProductFormErrors>({ variantErrors: [] })
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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
      const price = Number(variant.price || 0)
      const mrp = Number(variant.mrp || 0)
      const stockQty = Number(variant.stockQty || 0)

      if (!variant.label.trim()) {
        nextErrors.variantErrors[index].label = 'Label is required'
      }
      if (price <= 0) {
        nextErrors.variantErrors[index].price = 'Price is required'
      }
      if (mrp <= 0) {
        nextErrors.variantErrors[index].mrp = 'MRP is required'
      }
      if (Number.isNaN(stockQty) || stockQty < 0) {
        nextErrors.variantErrors[index].stockQty = 'Stock quantity is invalid'
      }
    })

    setErrors(nextErrors)

    const hasVariantErrors = nextErrors.variantErrors.some((variantError) =>
      Object.values(variantError).some(Boolean),
    )

    return !nextErrors.name && !nextErrors.category && !nextErrors.subcategoryId && !nextErrors.variants && !hasVariantErrors
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])
    setSelectedImageFiles(selectedFiles)
    setValues((prev) => ({
      ...prev,
      images: selectedFiles.map((file) => file.name),
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

      let imageUrls = values.images
      if (selectedImageFiles.length > 0) {
        if (onImageUpload) {
          imageUrls = await onImageUpload(selectedImageFiles)
        } else {
          imageUrls = selectedImageFiles.map((file) => URL.createObjectURL(file))
        }
      }

      const derivedProduct = deriveProductSummary(values.variants)

      await onSubmit({
        ...values,
        ...derivedProduct,
        images: imageUrls,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save product')
    } finally {
      setIsSubmitting(false)
    }
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
          <Typography variant="h6" sx={{ mb: 1 }}>
            Product Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Price, MRP, and stock quantity are managed per variant below.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={values.active}
                onChange={(_, checked) => setValues((prev) => ({ ...prev, active: checked }))}
              />
            }
            label="Active"
          />
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
            {selectedImageFiles.length > 0 && (
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                {selectedImageFiles.map((file, idx) => (
                  <Box key={idx} sx={{ width: 80, height: 80, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {submitError ? <Alert severity="error">{submitError}</Alert> : null}

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
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      label="Price"
                      type="number"
                      fullWidth
                      value={variant.price === 0 ? '' : variant.price}
                      placeholder="Enter price"
                      onChange={(event) => handleVariantChange(variant.id, 'price', Number(event.target.value || 0))}
                      error={Boolean(errors.variantErrors[index]?.price)}
                      helperText={errors.variantErrors[index]?.price}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      label="MRP"
                      type="number"
                      fullWidth
                      value={variant.mrp === 0 ? '' : variant.mrp}
                      placeholder="Enter MRP"
                      onChange={(event) => handleVariantChange(variant.id, 'mrp', Number(event.target.value || 0))}
                      error={Boolean(errors.variantErrors[index]?.mrp)}
                      helperText={errors.variantErrors[index]?.mrp}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      label="Stock Qty"
                      type="number"
                      fullWidth
                      value={variant.stockQty === 0 ? '' : variant.stockQty}
                      placeholder="Enter qty"
                      onChange={(event) => handleVariantChange(variant.id, 'stockQty', Number(event.target.value || 0))}
                      error={Boolean(errors.variantErrors[index]?.stockQty)}
                      helperText={errors.variantErrors[index]?.stockQty}
                    />
                  </Grid>
                  <Grid size={{ xs: 6, md: 2 }}>
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
                  <Grid size={{ xs: 12, md: 1 }} sx={{ textAlign: { xs: 'right', md: 'center' } }}>
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

export default ProductForm
