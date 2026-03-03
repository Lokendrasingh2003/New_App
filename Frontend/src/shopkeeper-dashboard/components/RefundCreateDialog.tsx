import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { refundService } from '../services/refundService'

export type RefundCreatePaymentOption = {
  paymentId: string
  orderId: string
  transactionId?: string | null
  amount: number
  paymentMode: 'COD' | 'ONLINE'
}

type RefundCreateDialogProps = {
  open: boolean
  shopkeeperId: string
  paymentOptions: RefundCreatePaymentOption[]
  onClose: () => void
  onCreated: () => void
}

const REASONS = ['Customer Request', 'Order Cancelled', 'Wrong Amount', 'Other']

const RefundCreateDialog = ({ open, shopkeeperId, paymentOptions, onClose, onCreated }: RefundCreateDialogProps) => {
  const [paymentId, setPaymentId] = useState('')
  const [reason, setReason] = useState('')
  const [refundAmount, setRefundAmount] = useState(0)
  const [note, setNote] = useState('')
  const [refundMode, setRefundMode] = useState<'BANK_TRANSFER' | 'UPI' | 'WALLET'>('BANK_TRANSFER')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedPayment = useMemo(
    () => paymentOptions.find((item) => item.paymentId === paymentId) || null,
    [paymentOptions, paymentId]
  )

  const handleCreate = async () => {
    if (!selectedPayment || !reason || refundAmount <= 0 || refundAmount > selectedPayment.amount) {
      setError('Please select payment, reason and valid amount.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      await refundService.createRefund(shopkeeperId, {
        paymentId: selectedPayment.paymentId,
        orderId: selectedPayment.orderId,
        reason: reason === 'Other' && note.trim() ? note.trim() : reason,
        refundAmount,
        refundMode,
      })
      onCreated()
      onClose()
      setPaymentId('')
      setReason('')
      setRefundAmount(0)
      setNote('')
      setRefundMode('BANK_TRANSFER')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create refund.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Refund Request</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            label="Select Payment"
            value={paymentId}
            onChange={(event) => {
              const nextPaymentId = event.target.value
              setPaymentId(nextPaymentId)
              const next = paymentOptions.find((item) => item.paymentId === nextPaymentId)
              setRefundAmount(Number(next?.amount || 0))
            }}
          >
            {paymentOptions.map((item) => (
              <MenuItem key={item.paymentId} value={item.paymentId}>
                {(item.transactionId || item.paymentId.slice(-8))} - ₹{item.amount.toFixed(2)}
              </MenuItem>
            ))}
          </TextField>

          {selectedPayment ? (
            <Typography variant="body2" color="text.secondary">
              Order: #{selectedPayment.orderId.slice(-8)} • Max refund: ₹{selectedPayment.amount.toFixed(2)} • Mode: {selectedPayment.paymentMode}
            </Typography>
          ) : null}

          <TextField select label="Refund Reason" value={reason} onChange={(event) => setReason(event.target.value)}>
            {REASONS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Refund Amount"
            type="number"
            value={refundAmount}
            onChange={(event) => setRefundAmount(Number(event.target.value || 0))}
          />

          <TextField select label="Refund Mode" value={refundMode} onChange={(event) => setRefundMode(event.target.value as 'BANK_TRANSFER' | 'UPI' | 'WALLET')}>
            <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="WALLET">Wallet</MenuItem>
          </TextField>

          <TextField
            label="Additional Notes"
            multiline
            minRows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleCreate()} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Refund'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RefundCreateDialog
