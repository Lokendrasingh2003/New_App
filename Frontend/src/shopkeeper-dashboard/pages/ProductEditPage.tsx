import { Alert, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import type { ProductFormValues } from '../components/ProductForm'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const ProductEditPage = () => {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { getProductById, updateProduct, getShopCategory, getAvailableSubcategories } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const product = useMemo(() => (productId ? getProductById(productId) : undefined), [getProductById, productId])
  const shopCategory = getShopCategory()
  const availableSubcategories = getAvailableSubcategories()

  const selectedSubcategory = useMemo(() => {
    if (!product) {
      return availableSubcategories[0]
    }

    return (
      availableSubcategories.find((item) => item.id === product.subcategoryId) ??
      availableSubcategories.find((item) => item.name.toLowerCase() === product.subcategory.toLowerCase()) ??
      availableSubcategories[0]
    )
  }, [availableSubcategories, product])

  if (!productId || !product) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Product not found" subtitle="The requested product ID is invalid or no longer exists." />
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We could not locate this product in your current catalog.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/shop/products')}>
                Back to Products
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    )
  }

  const initialValues: ProductFormValues = {
    name: product.name,
    description: product.description,
    categoryId: shopCategory.id,
    category: shopCategory.name,
    subcategoryId: selectedSubcategory?.id,
    subcategory: selectedSubcategory?.name ?? product.subcategory,
    images: product.images,
    basePrice: product.basePrice,
    baseMrp: product.baseMrp,
    stockQty: product.stockQty,
    inStock: product.inStock,
    active: product.active,
    variants: product.variants,
  }

  const handleSubmit = (values: ProductFormValues) => {
    updateProduct(product.id, values)
    showMessage('Product updated successfully')
    window.setTimeout(() => {
      navigate('/shop/products')
    }, 450)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Edit Product" subtitle="Update product details and variants" />
        <Alert severity="info">Editing: {product.name}</Alert>
        <ProductForm
          initialValues={initialValues}
          shopCategoryName={shopCategory.name}
          subcategoryOptions={availableSubcategories}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => setConfirmDiscardOpen(true)}
        />
      </Stack>

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Discard changes?"
        description="Any unsaved edits to this product will be lost."
        confirmText="Discard"
        confirmColor="error"
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          navigate('/shop/products')
        }}
      />
    </Container>
  )
}

export default ProductEditPage
