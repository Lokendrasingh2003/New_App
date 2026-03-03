import { Alert, Box, Button, Card, CardContent, Chip, Container, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RefundCreateDialog, { type RefundCreatePaymentOption } from '../components/RefundCreateDialog'
import { paymentService } from '../services/paymentService'
import { getShopkeeperId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const PaymentDetailsPage = () => {
  const { paymentId = '' } = useParams<{ paymentId: string }>()
  const shopkeeperId = getShopkeeperId()
  const navigate = useNavigate()
  const { showError, showSuccess } = useAppFeedback()

  const [payment, setPayment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)

  const loadPayment = async () => {
    if (!shopkeeperId || !paymentId) {
      setError('Missing payment context.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const data = await paymentService.getPaymentById(shopkeeperId, paymentId)
      setPayment(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load payment details.'
      setError(message)
      showError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPayment()
  }, [paymentId, shopkeeperId])

  const paymentOption = useMemo<RefundCreatePaymentOption[]>(() => {
    if (!payment) {
      return []
    }

    return [
      {
        paymentId: payment._id,
        orderId: payment.orderId?._id || payment.orderId,
        transactionId: payment.transactionId,
        amount: Number(payment.amount || 0),
        paymentMode: payment.paymentMode,
      },
    ]
  }, [payment])

  const handleVerify = async () => {
    if (!shopkeeperId || !paymentId) {
      return
    }

    try {
      await paymentService.verifyPayment(shopkeeperId, paymentId)
      showSuccess('Payment verified successfully')
      await loadPayment()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to verify payment.')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2.5 }}>
      <Stack spacing={2}>
        <PageHeader title="Payment Details" subtitle="Detailed transaction breakdown" />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? <Typography>Loading payment details...</Typography> : null}

        {!loading && payment ? (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card><CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Payment Info</Typography>
                  <Stack spacing={0.75}>
                    <Typography>Transaction: {payment.transactionId || 'N/A'}</Typography>
                    <Chip label={payment.status} color={payment.status === 'SUCCESS' ? 'success' : payment.status === 'FAILED' ? 'error' : 'warning'} size="small" sx={{ width: 'fit-content' }} />
                    <Typography variant="h5">₹{Number(payment.amount || 0).toFixed(2)}</Typography>
                    <Typography color="text.secondary">Mode: {payment.paymentMode}</Typography>
                    <Typography color="text.secondary">Date: {new Date(payment.processedAt || payment.createdAt).toLocaleString()}</Typography>
                  </Stack>
                </CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card><CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Commission Breakdown</Typography>
                  <Stack spacing={0.75}>
                    <Typography>Order Amount: ₹{Number(payment.amount || 0).toFixed(2)}</Typography>
                    <Typography color="error">Commission ({payment.commission?.percentage || 3}%): -₹{Number(payment.commission?.amount || 0).toFixed(2)}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>Net Amount: ₹{Number(payment.commission?.payableAmount || 0).toFixed(2)}</Typography>
                  </Stack>
                </CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card><CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Customer Info</Typography>
                  <Stack spacing={0.75}>
                    <Typography>Name: {payment.userId?.name || 'N/A'}</Typography>
                    <Typography>Phone: {payment.userId?.phone || 'N/A'}</Typography>
                    <Typography color="text.secondary">Address entries: {payment.userId?.addresses?.length || 0}</Typography>
                  </Stack>
                </CardContent></Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card><CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>Order Items</Typography>
                  <Stack spacing={0.8}>
                    {(payment.orderId?.items || []).map((item: any, idx: number) => (
                      <Box key={idx} sx={{ borderBottom: '1px dashed rgba(15,23,42,0.12)', pb: 0.75 }}>
                        <Typography>{item.productName} - ₹{Number(item.price).toFixed(2)} x {item.quantity}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent></Card>
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button variant="contained" onClick={() => void handleVerify()}>Verify</Button>
              <Button variant="outlined" onClick={() => setRefundOpen(true)}>Initiate Refund</Button>
              <Button variant="outlined" onClick={() => navigate('/shop/payments')}>Back</Button>
            </Stack>
          </>
        ) : null}
      </Stack>

      {shopkeeperId ? (
        <RefundCreateDialog
          open={refundOpen}
          shopkeeperId={shopkeeperId}
          paymentOptions={paymentOption}
          onClose={() => setRefundOpen(false)}
          onCreated={() => showSuccess('Refund request created')}
        />
      ) : null}
    </Container>
  )
}

export default PaymentDetailsPage
