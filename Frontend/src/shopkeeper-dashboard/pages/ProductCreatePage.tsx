import { Alert, Container, Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import type { ProductFormValues } from '../components/ProductForm'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { createProduct, getCategoryIdByName, getProducts, uploadProductImage } from '../services/productService'

const ProductCreatePage = () => {
  const navigate = useNavigate()
  const { getShopCategory, getAvailableSubcategories } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const shopId = getShopkeeperShopId()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [pageError, setPageError] = useState('')

  const shopCategory = getShopCategory()
  const availableSubcategories = getAvailableSubcategories()
  const defaultSubcategory = availableSubcategories[0]

  useEffect(() => {
    const resolveCategoryId = async () => {
      if (!shopId) {
        setPageError('Shop not found for current session.')
        return
      }

      try {
        setPageError('')

        const listResponse = await getProducts(shopId, { limit: 1, offset: 0 })
        const firstProductCategoryId = listResponse.products[0]?.categoryId
        if (firstProductCategoryId) {
          setCategoryId(firstProductCategoryId)
          return
        }

        const resolved = await getCategoryIdByName(shopCategory.name)
        if (!resolved) {
          throw new Error('Unable to resolve category for this shop.')
        }

        setCategoryId(resolved)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to prepare product form.')
      }
    }

    void resolveCategoryId()
  }, [shopCategory.name, shopId])

  const initialValues: ProductFormValues = {
    name: '',
    description: '',
    categoryId: shopCategory.id,
    category: shopCategory.name,
    subcategoryId: defaultSubcategory?.id,
    subcategory: defaultSubcategory?.name ?? '',
    images: [],
    basePrice: 0,
    baseMrp: 0,
    stockQty: 0,
    inStock: true,
    active: true,
    variants: [
      {
        id: `var-${Date.now()}`,
        label: '',
        price: 0,
        mrp: 0,
        inStock: true,
      },
    ],
  }

  const handleImageUpload = async (files: File[]) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    return Promise.all(files.map((file) => uploadProductImage(shopId, file)))
  }

  const handleSubmit = async (values: ProductFormValues) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    if (!categoryId) {
      throw new Error('Category not resolved yet. Please try again.')
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

    await createProduct(shopId, {
      name: values.name,
      description: values.description,
      categoryId,
      categoryName: shopCategory.name,
      subcategoryName: values.subcategory,
      images: values.images,
      active: values.active,
      variants,
    })

    showMessage('Product created successfully')
    navigate('/shop/products')
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2.5}>
        <PageHeader title="Add Product" subtitle="Create a new product with variants" />
        {pageError ? <Alert severity="error">{pageError}</Alert> : null}
        <ProductForm
          initialValues={initialValues}
          shopCategoryName={shopCategory.name}
          subcategoryOptions={availableSubcategories}
          submitLabel="Save Product"
          onSubmit={handleSubmit}
          onCancel={() => setConfirmDiscardOpen(true)}
          onImageUpload={handleImageUpload}
        />
      </Stack>

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Discard product form?"
        description="Any unsaved input will be lost."
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

export default ProductCreatePage
