import { Alert, Button, Card, CardContent, Container, Skeleton, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import OfferForm from '../components/OfferForm'
import type { OfferFormValues } from '../components/OfferForm'
import PageHeader from '../components/PageHeader'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import {
  getOffer,
  getOfferCategories,
  getOfferProducts,
  toggleOffer,
  updateOffer,
} from '../services/offerService'
import type { Offer } from '../types/offer'

const OfferEditPage = () => {
  const { offerId } = useParams<{ offerId: string }>()
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { showMessage } = useAppFeedback()
  const [confirmDisableOpen, setConfirmDisableOpen] = useState(false)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (!offerId || !shopId) {
      setIsLoading(false)
      setPageError('Offer or shop not found for current session.')
      return
    }

    const loadData = async () => {
      try {
        setPageError('')
        setIsLoading(true)
        const [fetchedOffer, categoryOptions, productOptions] = await Promise.all([
          getOffer(shopId, offerId),
          getOfferCategories(shopId),
          getOfferProducts(shopId),
        ])
        setOffer(fetchedOffer)
        setCategories(categoryOptions)
        setProducts(productOptions)
      } catch (error) {
        setOffer(null)
        setPageError(error instanceof Error ? error.message : 'Unable to load offer.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [offerId, shopId])

  const notFound = useMemo(() => !isLoading && (!offerId || !offer || !shopId), [isLoading, offerId, offer, shopId])

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Edit Offer" subtitle="Loading offer details..." />
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={420} />
        </Stack>
      </Container>
    )
  }

  if (notFound) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Offer not found" subtitle="The requested offer ID is invalid or no longer exists." />
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {pageError || 'We could not locate this offer in the current dataset.'}
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

  const currentOffer = offer as Offer

  const initialValues: OfferFormValues = {
    name: currentOffer.name,
    type: currentOffer.type,
    value: currentOffer.value,
    scope: currentOffer.scope,
    categoryIds: currentOffer.categoryIds ?? [],
    productIds: currentOffer.productIds ?? [],
    startsAt: currentOffer.startsAt,
    endsAt: currentOffer.endsAt,
    enabled: currentOffer.enabled,
  }

  const handleSubmit = async (values: OfferFormValues) => {
    if (!shopId) {
      throw new Error('Shop not found for current session.')
    }

    await updateOffer(shopId, currentOffer.id, values)
    showMessage('Offer updated successfully')
    navigate('/shop/offers')
  }

  const handleDisable = () => {
    if (!currentOffer.enabled) {
      return
    }
    setConfirmDisableOpen(true)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Edit Offer" subtitle="Update offer details and schedule" />
        <Alert severity="info">Editing: {currentOffer.name}</Alert>
        {pageError ? <Alert severity="error">{pageError}</Alert> : null}
        <OfferForm
          initialValues={initialValues}
          products={products}
          categories={categories}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => setConfirmDiscardOpen(true)}
          onDisable={handleDisable}
        />
      </Stack>

      <ConfirmDialog
        open={confirmDisableOpen}
        title="Disable offer?"
        description={`This will disable ${currentOffer.name} immediately.`}
        confirmText="Disable"
        confirmColor="error"
        onCancel={() => setConfirmDisableOpen(false)}
        onConfirm={() => {
          if (!shopId) {
            showMessage('Shop not found for current session.')
            setConfirmDisableOpen(false)
            return
          }

          void (async () => {
            try {
              const updated = await toggleOffer(shopId, currentOffer.id, false)
              setOffer(updated)
              showMessage('Offer disabled')
            } catch (error) {
              showMessage(error instanceof Error ? error.message : 'Unable to disable offer.')
            } finally {
              setConfirmDisableOpen(false)
            }
          })()
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
