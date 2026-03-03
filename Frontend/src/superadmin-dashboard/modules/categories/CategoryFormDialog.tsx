import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { Category } from '../../types/Category'
import type { ActionResult } from '../../store/types'

type CategoryFormDialogProps = {
  open: boolean
  mode: 'add' | 'edit'
  category?: Category
  categories: Category[]
  onClose: () => void
  onSubmitAdd: (name: string) => ActionResult
  onSubmitEdit: (categoryId: string, patch: { name: string; isActive: boolean }) => ActionResult
}

const CategoryFormDialog = ({
  open,
  mode,
  category,
  categories,
  onClose,
  onSubmitAdd,
  onSubmitEdit,
}: CategoryFormDialogProps) => {
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const handleEntered = () => {
    setName(category?.name ?? '')
    setIsActive(category?.isActive ?? true)
    setSubmitError(undefined)
  }

  const normalizedName = name.trim().replace(/\s+/g, ' ')

  const nameError = useMemo(() => {
    if (!normalizedName) {
      return 'Category name is required.'
    }

    const duplicate = categories.some(
      (item) => item.id !== category?.id && item.name.toLowerCase() === normalizedName.toLowerCase(),
    )

    if (duplicate) {
      return 'Category name must be unique.'
    }

    return undefined
  }, [categories, category?.id, normalizedName])

  const canSave = !nameError

  const handleSave = () => {
    if (!canSave) {
      return
    }

    const result =
      mode === 'add'
        ? onSubmitAdd(normalizedName)
        : onSubmitEdit(category?.id ?? '', { name: normalizedName, isActive })

    if (!result.ok) {
      setSubmitError(result.error ?? 'Could not save category.')
      return
    }

    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} onTransitionEnter={handleEntered} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'add' ? 'Add Category' : 'Edit Category'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {submitError ? <Alert severity="error">{submitError}</Alert> : null}

          <TextField
            label="Category Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            fullWidth
            error={Boolean(nameError)}
            helperText={nameError ?? 'Slug is auto-generated from category name.'}
          />

          {mode === 'add' ? (
            <Typography variant="body2" color="text.secondary">
              New category starts with 5 default subcategories. You can manage them on the details page.
            </Typography>
          ) : (
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(_, checked) => setIsActive(checked)} />}
              label="Active"
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!canSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CategoryFormDialog
