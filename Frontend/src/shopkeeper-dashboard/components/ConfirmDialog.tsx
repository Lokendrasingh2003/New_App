import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'error'
  isDestructive?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  inputValue?: string
  onInputChange?: (value: string) => void
  inputRequired?: boolean
  inputMultiline?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = 'primary',
  isDestructive,
  inputLabel,
  inputPlaceholder,
  inputValue,
  onInputChange,
  inputRequired = false,
  inputMultiline = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const resolvedConfirmText = confirmLabel ?? confirmText
  const isInputEnabled = Boolean(inputLabel)
  const isConfirmDisabled =
    Boolean(inputRequired && isInputEnabled && (inputValue ?? '').trim().length === 0)

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.1)' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: isInputEnabled ? 1.5 : 0 }}>
          {description}
        </Typography>
        {isInputEnabled && (
          <TextField
            autoFocus
            fullWidth
            label={inputLabel}
            placeholder={inputPlaceholder}
            value={inputValue ?? ''}
            onChange={(event) => onInputChange?.(event.target.value)}
            required={inputRequired}
            multiline={inputMultiline}
            minRows={inputMultiline ? 2 : undefined}
            error={Boolean(inputRequired && (inputValue ?? '').trim().length === 0)}
            helperText={inputRequired ? 'This field is required' : undefined}
          />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onCancel}>{cancelText}</Button>
        <Button
          onClick={onConfirm}
          color={isDestructive ? 'error' : confirmColor}
          variant="contained"
          disabled={isConfirmDisabled}
        >
          {resolvedConfirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
