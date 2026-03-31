import { Alert, Container, Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import type { ProductFormValues } from '../components/ProductForm'
import type { Subcategory } from '../types/category'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { createProduct, getCategoryMetaByName, getProducts, uploadProductImage } from '../services/productService'
import { getShopSettings } from '../services/shopService'

const ProductCreatePage = () => {
  const navigate = useNavigate()
  const { getShopCategory, getAvailableSubcategories, updateShopSettings } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const shopId = getShopkeeperShopId()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [resolvedCategoryName, setResolvedCategoryName] = useState('Uncategorized')
  const [fallbackSubcategories, setFallbackSubcategories] = useState<Subcategory[]>([])
  const [pageError, setPageError] = useState('')

  const shopCategory = getShopCategory()
  const availableSubcategories = getAvailableSubcategories()
  const effectiveSubcategories = availableSubcategories.length > 0 ? availableSubcategories : fallbackSubcategories
  const defaultSubcategory = effectiveSubcategories[0]

  useEffect(() => {
    const resolveCategoryId = async () => {
      if (!shopId) {
        setPageError('Shop not found for current session.')
        return
      }

      try {
        setPageError('')

        const settings = await getShopSettings(shopId)
        const normalizedCategoryName = String(settings.categoryName || '').trim() || 'Uncategorized'
        const normalizedCategoryId = String(settings.categoryId || '').trim()

        setResolvedCategoryName(normalizedCategoryName)
        updateShopSettings(
          {
            categoryId: normalizedCategoryId || shopCategory.id,
            categoryName: normalizedCategoryName,
          },
          { syncRemote: false },
        )

        const resolvedCategory = await getCategoryMetaByName(normalizedCategoryName)
        if (resolvedCategory?.subcategories.length) {
          setFallbackSubcategories(
            resolvedCategory.subcategories.map((name, index) => ({
              id: `api-sub-${index + 1}`,
              name,
              source: 'ADMIN',
            })),
          )
        } else {
          setFallbackSubcategories([])
        }

        if (/^[a-fA-F0-9]{24}$/.test(normalizedCategoryId)) {
          setCategoryId(normalizedCategoryId)
          return
        }

        const directCategoryId = String(shopCategory.id || '').trim()
        if (/^[a-fA-F0-9]{24}$/.test(directCategoryId)) {
          setCategoryId(directCategoryId)
          return
        }

        const listResponse = await getProducts(shopId, { limit: 1, offset: 0 })
        const firstProductCategoryId = listResponse.products[0]?.categoryId
        if (firstProductCategoryId) {
          setCategoryId(firstProductCategoryId)
          return
        }

        if (!resolvedCategory?.id) {
          throw new Error('Unable to resolve category for this shop.')
        }

        setCategoryId(resolvedCategory.id)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : 'Unable to prepare product form.')
      }
    }

    void resolveCategoryId()
  }, [shopCategory.id, shopId])

  const initialValues: ProductFormValues = {
    name: '',
    description: '',
    categoryId: categoryId || shopCategory.id,
    category: resolvedCategoryName,
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
      categoryName: resolvedCategoryName,
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
          key={`${categoryId}-${resolvedCategoryName}-${effectiveSubcategories.length}`}
          initialValues={initialValues}
          shopCategoryName={resolvedCategoryName}
          subcategoryOptions={effectiveSubcategories}
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
