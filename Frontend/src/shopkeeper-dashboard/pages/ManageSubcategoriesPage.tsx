import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyStateCard from '../components/EmptyStateCard'
import PageHeader from '../components/PageHeader'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const ManageSubcategoriesPage = () => {
  const { shop, getShopCategory, addCustomSubcategory, removeCustomSubcategory, isUsingFallbackCategoryForShop } =
    useShopkeeperStore()
  const { showMessage } = useAppFeedback()

  const [newSubcategoryName, setNewSubcategoryName] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

  const shopCategory = useMemo(() => getShopCategory(), [getShopCategory, shop.categoryId, shop.categoryName])
  const showCategoryFallbackWarning = useMemo(
    () => isUsingFallbackCategoryForShop(),
    [isUsingFallbackCategoryForShop, shop.categoryId, shop.categoryName],
  )
  const customCount = shop.customSubcategories.length
  const canAddMore = customCount < 3

  const handleAdd = () => {
    try {
      addCustomSubcategory(newSubcategoryName)
      showMessage('Custom subcategory added')
      setNewSubcategoryName('')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to add subcategory')
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Manage Subcategories" subtitle="Configure product subcategories for your shop" />

        <Card>
          <CardContent>
            <Stack spacing={0.75}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Your shop category is fixed: {shopCategory.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You can add up to 3 custom subcategories.
              </Typography>
              {showCategoryFallbackWarning && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Your shop category is not published by admin yet. Using fallback categories.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 0.75 }}>
              Admin Subcategories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              These are defined by admin and cannot be edited.
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              {shopCategory.subcategories.map((subcategory) => (
                <Chip key={subcategory.id} label={subcategory.name} color="default" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              spacing={1}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6">Your Custom Subcategories</Typography>
                <Typography variant="body2" color="text.secondary">
                  {customCount}/3 used
                </Typography>
              </Box>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2.5 }}>
              <TextField
                fullWidth
                label="New custom subcategory"
                value={newSubcategoryName}
                onChange={(event) => setNewSubcategoryName(event.target.value)}
                disabled={!canAddMore}
              />
              <Button
                variant="contained"
                onClick={handleAdd}
                disabled={!canAddMore || !newSubcategoryName.trim()}
                sx={{ minWidth: 120 }}
              >
                Add
              </Button>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {shop.customSubcategories.length === 0 ? (
              <EmptyStateCard
                title="No custom subcategories"
                description="Add your first custom subcategory to improve product organization for your shop."
              />
            ) : (
              <Stack spacing={1.25}>
                {shop.customSubcategories.map((subcategory) => (
                  <Box
                    key={subcategory.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {subcategory.name}
                        </Typography>
                        <Chip label="SHOP" size="small" color="primary" variant="outlined" />
                      </Stack>

                      <Tooltip title="Delete subcategory">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => setConfirmDelete({ id: subcategory.id, name: subcategory.name })}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete custom subcategory?"
        description={`This will remove ${confirmDelete?.name ?? 'this subcategory'} from your shop.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) {
            return
          }

          removeCustomSubcategory(confirmDelete.id)
          showMessage('Custom subcategory removed')
          setConfirmDelete(null)
        }}
      />
    </Container>
  )
}

export default ManageSubcategoriesPage
