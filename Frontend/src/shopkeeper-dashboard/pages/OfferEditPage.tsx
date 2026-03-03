import { Alert, Button, Card, CardContent, Container, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mockCategories } from '../data/mockCategories'
import ConfirmDialog from '../components/ConfirmDialog'
import OfferForm from '../components/OfferForm'
import type { OfferFormValues } from '../components/OfferForm'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const OfferEditPage = () => {
  const { offerId } = useParams<{ offerId: string }>()
  const navigate = useNavigate()
  const { getOfferById, updateOffer, toggleOfferEnabled, products } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)

  const offer = useMemo(() => (offerId ? getOfferById(offerId) : undefined), [getOfferById, offerId])

  if (!offerId || !offer) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Offer not found" subtitle="The requested offer ID is invalid or no longer exists." />
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We could not locate this offer in the current dataset.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/shop/offers')}>
                Back to Offers
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    )
  }

  const initialValues: OfferFormValues = {
    name: offer.name,
    type: offer.type,
    value: offer.value,
    scope: offer.scope,
    categoryIds: offer.categoryIds ?? [],
    productIds: offer.productIds ?? [],
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    enabled: offer.enabled,
  }

  const handleSubmit = (values: OfferFormValues) => {
    updateOffer(offer.id, values)
    showMessage('Offer updated successfully')
    window.setTimeout(() => {
      navigate('/shop/offers')
    }, 450)
  }

  const handleDisable = () => {
    if (!offer.enabled) {
      return
    }
    setConfirmDisableOpen(true)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Edit Offer" subtitle="Update offer details and schedule" />
        <Alert severity="info">Editing: {offer.name}</Alert>
        <OfferForm
          initialValues={initialValues}
          products={products}
          categories={mockCategories}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => setConfirmDiscardOpen(true)}
          onDisable={handleDisable}
        />
      </Stack>

      <ConfirmDialog
        open={confirmDisableOpen}
        title="Disable offer?"
        description={`This will disable ${offer.name} immediately.`}
        confirmText="Disable"
        confirmColor="error"
        onCancel={() => setConfirmDisableOpen(false)}
        onConfirm={() => {
          toggleOfferEnabled(offer.id)
          showMessage('Offer disabled')
          setConfirmDisableOpen(false)
        }}
      />

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Discard changes?"
        description="Any unsaved edits to this offer will be lost."
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

export default OfferEditPage
