import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import {
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import PageHeader from '../ui/PageHeader'

const MIN_SUBCATEGORIES = 5
const MAX_SUBCATEGORIES = 8

const CategoryDetailsPage = () => {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()
  const { getCategoryBySlug, addSubcategory, removeSubcategory } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [newSubcategory, setNewSubcategory] = useState('')
  const [inputError, setInputError] = useState<string | undefined>(undefined)
  const [removeTarget, setRemoveTarget] = useState<string | null>(null)

  const category = slug ? getCategoryBySlug(slug) : undefined

  const normalizedInput = useMemo(() => newSubcategory.trim().replace(/\s+/g, ' '), [newSubcategory])

  if (!category) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Category not found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The requested category slug is invalid.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/superadmin/categories')} sx={{ width: 'fit-content' }}>
              Back to Categories
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  const canAdd = category.subcategories.length < MAX_SUBCATEGORIES

  const handleAddSubcategory = () => {
    if (!normalizedInput) {
      setInputError('Subcategory name is required.')
      return
    }

    const duplicate = category.subcategories.some((sub) => sub.toLowerCase() === normalizedInput.toLowerCase())
    if (duplicate) {
      setInputError('Subcategory must be unique in this category.')
      return
    }

    const result = addSubcategory(category.id, normalizedInput)
    if (!result.ok) {
      setInputError(result.error ?? 'Could not add subcategory.')
      return
    }

    setNewSubcategory('')
    setInputError(undefined)
    showSuccess('Subcategory added')
  }

  return (
    <>
      <PageHeader
        title={category.name}
        actions={
          <Button variant="outlined" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/superadmin/categories')}>
            Back
          </Button>
        }
      />

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Subcategories (5–8)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                These subcategories will appear in Shopkeeper dashboard after Publish.
              </Typography>
            </Stack>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {category.subcategories.map((subcategory) => (
                <Chip
                  key={subcategory}
                  label={subcategory}
                  onDelete={() => setRemoveTarget(subcategory)}
                  deleteIcon={<CloseRoundedIcon />}
                />
              ))}
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField
                label="Add Subcategory"
                value={newSubcategory}
                onChange={(event) => {
                  setNewSubcategory(event.target.value)
                  setInputError(undefined)
                }}
                error={Boolean(inputError)}
                helperText={inputError ?? `You can keep between ${MIN_SUBCATEGORIES} and ${MAX_SUBCATEGORIES} subcategories.`}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={handleAddSubcategory}
                disabled={!canAdd}
                sx={{ width: { xs: '100%', sm: 'fit-content' } }}
              >
                Add
              </Button>
            </Stack>

            {!canAdd ? (
              <Typography variant="caption" color="warning.main">
                Maximum {MAX_SUBCATEGORIES} subcategories reached.
              </Typography>
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove subcategory?"
        description="This subcategory will be removed from the category definition."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) {
            return
          }

          const result = removeSubcategory(category.id, removeTarget)
          if (result.ok) {
            showSuccess('Subcategory removed')
          } else {
            showError(result.error ?? 'Could not remove subcategory.')
          }

          setRemoveTarget(null)
        }}
      />
    </>
  )
}

export default CategoryDetailsPage
