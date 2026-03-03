import { Container } from '@mui/material'
import { useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ProductForm from '../components/ProductForm'
import type { ProductFormValues } from '../components/ProductForm'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const ProductCreatePage = () => {
  const navigate = useNavigate()
  const { createProduct, getShopCategory, getAvailableSubcategories } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const shopCategory = getShopCategory()
  const availableSubcategories = getAvailableSubcategories()
  const defaultSubcategory = availableSubcategories[0]

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

  const handleSubmit = (values: ProductFormValues) => {
    createProduct(values)
    showMessage('Product created successfully')
    window.setTimeout(() => {
      navigate('/shop/products')
    }, 450)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader title="Add Product" subtitle="Create a new product with variants" />
      <ProductForm
        initialValues={initialValues}
        shopCategoryName={shopCategory.name}
        subcategoryOptions={availableSubcategories}
        submitLabel="Save Product"
        onSubmit={handleSubmit}
        onCancel={() => setConfirmDiscardOpen(true)}
      />

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
