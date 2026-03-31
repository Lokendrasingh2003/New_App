import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import AddPhotoAlternateRoundedIcon from '@mui/icons-material/AddPhotoAlternateRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
  Paper,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { Banner, BannerType, TargetAudience } from '../types/Banner'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'
import {
  listAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  toggleAdminBannerActive,
  deleteAdminBanner,
  uploadBannerImage,
} from '../services/adminBannersService'

type BannerFormState = {
  title: string
  imageUrl: string
  imageFile: File | null
  redirectUrl: string
  description: string
  position: string
  bannerType: BannerType
  targetAudience: TargetAudience
  startDate: string
  endDate: string
  isActive: boolean
}

const statusFilterOptions = ['ALL', 'ACTIVE', 'INACTIVE'] as const
const typeFilterOptions = ['ALL', 'PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED'] as const
const audienceFilterOptions = ['ALL', 'ALL', 'NEW_USERS', 'RETURNING_USERS'] as const

type StatusFilter = (typeof statusFilterOptions)[number]
type TypeFilter = (typeof typeFilterOptions)[number]
type AudienceFilter = (typeof audienceFilterOptions)[number]

const initialFormState: BannerFormState = {
  title: '',
  imageUrl: '',
  imageFile: null,
  redirectUrl: '',
  description: '',
  position: '0',
  bannerType: 'GENERAL',
  targetAudience: 'ALL',
  startDate: '',
  endDate: '',
  isActive: true,
}

const BannersPage = () => {
  const store = useSuperAdminStore()
  const snackbar = useAppSnackbar()
  const isInitialLoading = useInitialLoadingDelay(1000)

  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('ALL')

  const [formState, setFormState] = useState<BannerFormState>(initialFormState)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  const loadBanners = async () => {
    try {
      setLoading(true)
      const data = await listAdminBanners()
      setBanners(data)
    } catch (error) {
      if (snackbar?.error) {
        snackbar.error(error instanceof Error ? error.message : 'Failed to load banners')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBanners()
  }, [])

  const filteredBanners = useMemo(() => {
    return banners.filter((banner) => {
      if (statusFilter !== 'ALL') {
        const matchesStatus = statusFilter === 'ACTIVE' ? banner.isActive : !banner.isActive
        if (!matchesStatus) return false
      }

      if (typeFilter !== 'ALL' && banner.bannerType !== typeFilter) {
        return false
      }

      if (audienceFilter !== 'ALL' && banner.targetAudience !== audienceFilter) {
        return false
      }

      return true
    })
  }, [banners, statusFilter, typeFilter, audienceFilter])

  const handleOpenDialog = (banner?: Banner) => {
    if (banner) {
      setEditingId(banner.id)
      setFormState({
        title: banner.title,
        imageUrl: banner.imageUrl,
        redirectUrl: banner.redirectUrl || '',
        description: banner.description || '',
        position: String(banner.position),
        bannerType: banner.bannerType,
        targetAudience: banner.targetAudience,
        startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
        endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
        isActive: banner.isActive,
      })
    } else {
      setEditingId(null)
      setFormState(initialFormState)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingId(null)
    setFormState(initialFormState)
  }

  const handleFormChange = (field: keyof BannerFormState, value: unknown) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (!formState.title.trim()) {
        if (snackbar?.error) snackbar.error('Title is required')
        return
      }

      setSubmitLoading(true)

      let finalImageUrl = formState.imageUrl.trim()

      // Upload file if provided
      if (formState.imageFile) {
        try {
          finalImageUrl = await uploadBannerImage(formState.imageFile)
        } catch (error) {
          if (snackbar?.error) snackbar.error(error instanceof Error ? error.message : 'File upload failed')
          setSubmitLoading(false)
          return
        }
      }

      // Require either imageUrl or imageFile
      if (!finalImageUrl && !formState.imageFile) {
        if (snackbar?.error) snackbar.error('Please provide either an image URL or upload a file')
        setSubmitLoading(false)
        return
      }

      const input = {
        title: formState.title.trim(),
        imageUrl: finalImageUrl,
        redirectUrl: formState.redirectUrl.trim() || null,
        description: formState.description.trim() || null,
        position: Number(formState.position) || 0,
        bannerType: formState.bannerType,
        targetAudience: formState.targetAudience,
        startDate: formState.startDate ? `${formState.startDate}T00:00:00.000Z` : null,
        endDate: formState.endDate ? `${formState.endDate}T23:59:59.999Z` : null,
        isActive: formState.isActive,
      }

      if (editingId) {
        await updateAdminBanner(editingId, input)
        if (snackbar?.success) snackbar.success('Banner updated successfully')
      } else {
        await createAdminBanner(input)
        if (snackbar?.success) snackbar.success('Banner created successfully')
      }

      handleCloseDialog()
      await loadBanners()
    } catch (error) {
      if (snackbar?.error) {
        snackbar.error(error instanceof Error ? error.message : 'Operation failed')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleToggleActive = async (banner: Banner) => {
    try {
      setSubmitLoading(true)
      await toggleAdminBannerActive(banner.id, !banner.isActive)
      if (snackbar?.success) {
        snackbar.success(`Banner ${!banner.isActive ? 'activated' : 'deactivated'} successfully`)
      }
      await loadBanners()
    } catch (error) {
      if (snackbar?.error) {
        snackbar.error(error instanceof Error ? error.message : 'Failed to update banner status')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return

    try {
      setSubmitLoading(true)
      await deleteAdminBanner(deleteConfirmId)
      if (snackbar?.success) {
        snackbar.success('Banner deleted successfully')
      }
      setDeleteConfirmId(null)
      await loadBanners()
    } catch (error) {
      if (snackbar?.error) {
        snackbar.error(error instanceof Error ? error.message : 'Failed to delete banner')
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" noWrap>
          {params.row.title}
        </Typography>
      ),
    },
    {
      field: 'position',
      headerName: 'Position',
      width: 100,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'bannerType',
      headerName: 'Type',
      width: 130,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.row.bannerType} size="small" variant="outlined" />
      ),
    },
    {
      field: 'targetAudience',
      headerName: 'Target Audience',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="caption">{params.row.targetAudience}</Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.row.isActive ? 'Active' : 'Inactive'}
          color={params.row.isActive ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button
            size="small"
            startIcon={<EditRoundedIcon />}
            onClick={() => handleOpenDialog(params.row)}
            disabled={submitLoading}
          >
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteRoundedIcon />}
            onClick={() => setDeleteConfirmId(params.row.id)}
            disabled={submitLoading}
          >
            Delete
          </Button>
        </Stack>
      ),
    },
  ]

  if (isInitialLoading && loading) {
    return (
      <Box sx={{ p: 3 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={50} sx={{ mb: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Banners"
        actions={
          <Button variant="contained" onClick={() => handleOpenDialog()}>
            Add Banner
          </Button>
        }
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                {statusFilterOptions.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              >
                {typeFilterOptions.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={audienceFilter}
                label="Target Audience"
                onChange={(e) => setAudienceFilter(e.target.value as AudienceFilter)}
              >
                {audienceFilterOptions.map((audience) => (
                  <MenuItem key={audience} value={audience}>
                    {audience}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </CardContent>
      </Card>

      {filteredBanners.length === 0 && !loading ? (
        <EmptyState title="No banners found" description="Create your first promotional banner" />
      ) : (
        <Box sx={{ height: 500, width: '100%' }}>
          <DataGrid
            rows={filteredBanners}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            disableSelectionOnClick
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Banner' : 'Create Banner'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={formState.title}
              onChange={(e) => handleFormChange('title', e.target.value)}
              required
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Image
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFormChange('imageFile', file)
                        // Clear URL when file is selected
                        handleFormChange('imageUrl', '')
                      }
                    }}
                    style={{ display: 'none' }}
                    id="banner-image-input"
                  />
                  <label htmlFor="banner-image-input" style={{ width: '100%', display: 'block' }}>
                    <Button
                      variant="outlined"
                      component="span"
                      fullWidth
                      startIcon={<AddPhotoAlternateRoundedIcon />}
                    >
                      Upload Image from Laptop
                    </Button>
                  </label>
                </Box>

                {formState.imageFile && (
                  <Box sx={{ textAlign: 'center' }}>
                    <Paper sx={{ p: 1, mb: 1, bgcolor: 'background.default' }}>
                      <img
                        src={URL.createObjectURL(formState.imageFile)}
                        alt="Preview"
                        style={{
                          maxWidth: '100%',
                          maxHeight: 200,
                          borderRadius: 8,
                        }}
                      />
                    </Paper>
                    <Typography variant="caption" color="text.secondary">
                      {formState.imageFile.name}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                  <Typography variant="caption" color="text.secondary">
                    OR
                  </Typography>
                  <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
                </Box>

                <TextField
                  label="Image URL"
                  fullWidth
                  type="url"
                  placeholder="https://..."
                  value={formState.imageUrl}
                  onChange={(e) => {
                    handleFormChange('imageUrl', e.target.value)
                    // Clear file when URL is entered
                    if (e.target.value.trim()) {
                      handleFormChange('imageFile', null)
                    }
                  }}
                  help ={formState.imageFile ? 'File selected' : 'Paste image URL'}
                />
              </Stack>
            </Box>

            <TextField
              label="Redirect URL"
              fullWidth
              type="url"
              value={formState.redirectUrl}
              onChange={(e) => handleFormChange('redirectUrl', e.target.value)}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={formState.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />

            <TextField
              label="Position"
              fullWidth
              type="number"
              inputProps={{ min: 0 }}
              value={formState.position}
              onChange={(e) => handleFormChange('position', e.target.value)}
            />

            <FormControl fullWidth size="small">
              <InputLabel>Banner Type</InputLabel>
              <Select
                value={formState.bannerType}
                label="Banner Type"
                onChange={(e) => handleFormChange('bannerType', e.target.value)}
              >
                <MenuItem value="GENERAL">General</MenuItem>
                <MenuItem value="PROMOTIONAL">Promotional</MenuItem>
                <MenuItem value="SEASONAL">Seasonal</MenuItem>
                <MenuItem value="FEATURED">Featured</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>Target Audience</InputLabel>
              <Select
                value={formState.targetAudience}
                label="Target Audience"
                onChange={(e) => handleFormChange('targetAudience', e.target.value)}
              >
                <MenuItem value="ALL">All Users</MenuItem>
                <MenuItem value="NEW_USERS">New Users</MenuItem>
                <MenuItem value="RETURNING_USERS">Returning Users</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Start Date"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formState.startDate}
              onChange={(e) => handleFormChange('startDate', e.target.value)}
            />

            <TextField
              label="End Date"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formState.endDate}
              onChange={(e) => handleFormChange('endDate', e.target.value)}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formState.isActive}
                  onChange={(e) => handleFormChange('isActive', e.target.checked)}
                />
              }
              label="Active"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitLoading}>
            {submitLoading ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete Banner"
        message="Are you sure you want to delete this banner? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmId(null)}
        loading={submitLoading}
        variant="danger"
      />
    </Box>
  )
}

export default BannersPage
