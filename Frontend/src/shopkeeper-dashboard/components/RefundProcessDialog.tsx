import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { refundService } from '../services/refundService'

type RefundProcessDialogProps = {
  open: boolean
  shopkeeperId: string
  refundId: string
  refundAmount: number
  onClose: () => void
  onProcessed: () => void
}

const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/

const RefundProcessDialog = ({ open, shopkeeperId, refundId, refundAmount, onClose, onProcessed }: RefundProcessDialogProps) => {
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const validationError = useMemo(() => {
    if (!/^\d{9,18}$/.test(accountNumber)) {
      return 'Account Number must be 9-18 digits'
    }

    if (!ifscRegex.test(ifscCode.trim().toUpperCase())) {
      return 'IFSC code is invalid'
    }

    if (bankName.trim().length < 3) {
      return 'Bank name must be at least 3 characters'
    }

    return ''
  }, [accountNumber, ifscCode, bankName])

  const handleProcess = async () => {
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      await refundService.processRefund(shopkeeperId, refundId, {
        bankDetails: {
          accountNumber,
          ifscCode: ifscCode.trim().toUpperCase(),
          bankName: bankName.trim(),
        },
        transactionRef: transactionRef.trim() || undefined,
        note: note.trim() || undefined,
      })
      onProcessed()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to process refund.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Process Refund</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="body2" color="text.secondary">
            Refund Amount: ₹{refundAmount.toFixed(2)}
          </Typography>
          <TextField
            label="Account Number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ''))}
          />
          <TextField
            label="IFSC Code"
            value={ifscCode}
            onChange={(event) => setIfscCode(event.target.value.toUpperCase())}
          />
          <TextField label="Bank Name" value={bankName} onChange={(event) => setBankName(event.target.value)} />
          <TextField label="Transaction Reference" value={transactionRef} onChange={(event) => setTransactionRef(event.target.value)} />
          <TextField label="Processing Note" multiline minRows={2} value={note} onChange={(event) => setNote(event.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleProcess()} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Process Refund'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RefundProcessDialog
