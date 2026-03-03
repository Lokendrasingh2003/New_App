import { Container } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import OfferForm from '../components/OfferForm'
import type { OfferFormValues } from '../components/OfferForm'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { mockCategories } from '../data/mockCategories'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const OfferCreatePage = () => {
  const navigate = useNavigate()
  const { createOffer, products } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

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

  const handleSubmit = (values: OfferFormValues) => {
    createOffer(values)
    showMessage('Offer created successfully')
    window.setTimeout(() => {
      navigate('/shop/offers')
    }, 450)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <PageHeader title="Create Offer" subtitle="Set up a new discount campaign" />
      <OfferForm
        initialValues={initialValues}
        products={products}
        categories={mockCategories}
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
