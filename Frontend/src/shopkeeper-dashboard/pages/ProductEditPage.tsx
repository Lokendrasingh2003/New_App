import { Alert, Button, Card, CardContent, CircularProgress, Container, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import type { ProductFormValues } from '../components/ProductForm'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { getProduct, updateProduct, uploadProductImage } from '../services/productService'
import type { Product } from '../types/product'

const ProductEditPage = () => {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { getShopCategory, getAvailableSubcategories } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const shopId = getShopkeeperShopId()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')

  const shopCategory = getShopCategory()
  const availableSubcategories = getAvailableSubcategories()

  useEffect(() => {
    const loadProduct = async () => {
      if (!shopId || !productId) {
        setPageError('Invalid product request.')
        setIsLoading(false)
        return
      }

      try {
        setPageError('')
        setIsLoading(true)
        const response = await getProduct(shopId, productId)
        setProduct(response)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to load product.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProduct()
  }, [productId, shopId])

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

  const handleImageUpload = async (files: File[]) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    return Promise.all(files.map((file) => uploadProductImage(shopId, file)))
  }

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5} alignItems="center">
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading product details...
          </Typography>
        </Stack>
      </Container>
    )
  }

  if (!productId || !product) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Product not found" subtitle="The requested product ID is invalid or no longer exists." />
          {pageError ? <Alert severity="error">{pageError}</Alert> : null}
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

  const handleSubmit = async (values: ProductFormValues) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    if (!product.categoryId) {
      throw new Error('Unable to resolve product category.')
    }

    const variants = values.variants.map((variant, index) => {
      const fallbackQty = index === 0 ? Number(values.stockQty || 0) : 0
      const stockQty = Math.max(0, Number(variant.stockQty ?? fallbackQty))
      const inStock = Boolean(values.inStock && variant.inStock && stockQty > 0)

      return {
        id: variant.id,
        label: variant.label,
        price: Number(variant.price),
        mrp: Number(variant.mrp),
        inStock,
        stockQty,
      }
    })

    await updateProduct(shopId, product.id, {
      name: values.name,
      description: values.description,
      categoryId: product.categoryId,
      categoryName: product.category,
      subcategoryName: values.subcategory,
      images: values.images,
      active: values.active,
      variants,
    })

    showMessage('Product updated successfully')
    navigate('/shop/products')
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Edit Product" subtitle="Update product details and variants" />
        <Alert severity="info">Editing: {product.name}</Alert>
        {pageError ? <Alert severity="error">{pageError}</Alert> : null}
        <ProductForm
          initialValues={initialValues}
          shopCategoryName={shopCategory.name}
          subcategoryOptions={availableSubcategories}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => setConfirmDiscardOpen(true)}
          onImageUpload={handleImageUpload}
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
