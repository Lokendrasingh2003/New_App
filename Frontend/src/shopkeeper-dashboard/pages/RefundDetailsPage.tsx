import { Alert, Box, Button, Card, CardContent, Chip, Container, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { refundService } from '../services/refundService'
import { getShopkeeperId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const STATUS_STEPS = ['REQUESTED', 'PROCESSING', 'COMPLETED']

const maskAccount = (accountNumber?: string) => {
  if (!accountNumber) {
    return 'N/A'
  }

  const tail = accountNumber.slice(-4)
  return `XXXX...${tail}`
}

const RefundDetailsPage = () => {
  const navigate = useNavigate()
  const { refundId = '' } = useParams<{ refundId: string }>()
  const shopkeeperId = getShopkeeperId()
  const { showError, showSuccess } = useAppFeedback()

  const [refund, setRefund] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadRefund = async () => {
    if (!shopkeeperId || !refundId) {
      setError('Missing refund context.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const data = await refundService.getRefundById(shopkeeperId, refundId)
      setRefund(data)
      setLastUpdated(new Date())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load refund details.'
      setError(message)
      showError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRefund()
  }, [refundId, shopkeeperId])

  useEffect(() => {
    if (!refund || !['REQUESTED', 'PROCESSING'].includes(refund.status)) {
      return
    }

    const timer = window.setInterval(() => {
      void loadRefund()
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [refund?.status, refundId, shopkeeperId])

  const copiedText = useMemo(() => {
    if (!refund) {
      return ''
    }

    return `Refund ${refund._id}\nStatus: ${refund.status}\nAmount: ₹${refund.refundAmount}\nReason: ${refund.reason}`
  }, [refund])

  return (
    <Container maxWidth="lg" sx={{ py: 2.5 }}>
      <Stack spacing={2}>
        <PageHeader title="Refund Details" subtitle="Complete refund tracking and history" />

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Typography>Loading refund details...</Typography> : null}

        {!loading && refund ? (
          <>
            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Refund Status Timeline</Typography>
              <Stack spacing={1}>
                {STATUS_STEPS.map((step) => {
                  const isDone = (refund.statusHistory || []).some((item: any) => item.status === step)
                  const isCurrent = refund.status === step
                  return (
                    <Stack key={step} direction="row" spacing={1.2} alignItems="center">
                      <Chip size="small" label={step} color={isCurrent ? 'warning' : isDone ? 'success' : 'default'} />
                      <Typography variant="body2" color="text.secondary">
                        {isDone ? 'Completed' : 'Pending'}
                      </Typography>
                    </Stack>
                  )
                })}
              </Stack>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Refund Info</Typography>
              <Typography>Refund ID: {refund._id}</Typography>
              <Typography>Status: {refund.status}</Typography>
              <Typography variant="h5">₹{Number(refund.refundAmount || 0).toFixed(2)}</Typography>
              <Typography>Reason: {refund.reason}</Typography>
              <Typography color="text.secondary">Created: {new Date(refund.createdAt).toLocaleString()}</Typography>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Bank Details</Typography>
              <Typography>Account: {maskAccount(refund.bankDetails?.accountNumber)}</Typography>
              <Typography>IFSC: {refund.bankDetails?.ifscCode || 'N/A'}</Typography>
              <Typography>Bank: {refund.bankDetails?.bankName || 'N/A'}</Typography>
              <Typography>Transaction Ref: {refund.transactionRef || 'Pending'}</Typography>
            </CardContent></Card>

            <Card><CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Status History</Typography>
              <Stack spacing={1}>
                {(refund.statusHistory || []).map((item: any, index: number) => (
                  <Box key={index} sx={{ borderBottom: '1px dashed rgba(15,23,42,0.12)', pb: 0.75 }}>
                    <Typography sx={{ fontWeight: 700 }}>{item.status}</Typography>
                    <Typography variant="body2" color="text.secondary">{new Date(item.timestamp).toLocaleString()}</Typography>
                    {item.note ? <Typography variant="body2">{item.note}</Typography> : null}
                  </Box>
                ))}
              </Stack>
            </CardContent></Card>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button variant="outlined" onClick={() => navigate('/shop/refunds')}>Back</Button>
              <Button variant="outlined" onClick={async () => {
                await navigator.clipboard.writeText(copiedText)
                showSuccess('Refund details copied')
              }}>
                Copy Details
              </Button>
              <Button variant="contained" onClick={() => void loadRefund()}>Refresh</Button>
            </Stack>

            {lastUpdated ? (
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Container>
  )
}

export default RefundDetailsPage
