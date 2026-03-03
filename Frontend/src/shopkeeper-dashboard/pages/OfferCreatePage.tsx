import { Container } from '@mui/material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import OfferForm from '../components/OfferForm'
import type { OfferFormValues } from '../components/OfferForm'
import PageHeader from '../components/PageHeader'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { createOffer, getOfferCategories, getOfferProducts } from '../services/offerService'

const OfferCreatePage = () => {
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { showMessage } = useAppFeedback()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])

  const now = new Date()
  const afterSevenDays = new Date(now)
  afterSevenDays.setDate(afterSevenDays.getDate() + 7)

  const initialValues: OfferFormValues = {
    name: '',
    type: 'PERCENT',
    value: 0,
    scope: 'SHOP',
    categoryIds: [],
    productIds: [],
    startsAt: now.toISOString(),
    endsAt: afterSevenDays.toISOString(),
    enabled: true,
  }

  useEffect(() => {
    if (!shopId) {
      showMessage('Shop not found for current session.')
      return
    }

    const loadOptions = async () => {
      try {
        const [categoryOptions, productOptions] = await Promise.all([
          getOfferCategories(shopId),
          getOfferProducts(shopId),
        ])
        setCategories(categoryOptions)
        setProducts(productOptions)
      } catch (error) {
        showMessage(error instanceof Error ? error.message : 'Unable to load offer options.')
      }
    }

    void loadOptions()
  }, [shopId, showMessage])

  const handleSubmit = async (values: OfferFormValues) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    await createOffer(shopId, values)
    showMessage('Offer created successfully')
    navigate('/shop/offers')
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader title="Create Offer" subtitle="Set up a new discount campaign" />
      <OfferForm
        initialValues={initialValues}
        products={products}
        categories={categories}
        submitLabel="Save Offer"
        onSubmit={handleSubmit}
        onCancel={() => setConfirmDiscardOpen(true)}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Discard offer form?"
        description="Any unsaved offer details will be lost."
        confirmText="Discard"
        confirmColor="error"
        onCancel={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          navigate('/shop/offers')
        }}
      />
    </Container>
  )
}

export default OfferCreatePage
