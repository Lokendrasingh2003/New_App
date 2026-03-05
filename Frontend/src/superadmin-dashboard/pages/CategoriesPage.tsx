import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PublishRoundedIcon from '@mui/icons-material/PublishRounded'
import ToggleOffRoundedIcon from '@mui/icons-material/ToggleOffRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CC_PUBLISHED_META_KEY } from '../app/storageKeys'
import CategoryFormDialog from '../modules/categories/CategoryFormDialog'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { Category } from '../types/Category'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { safeJsonParse } from '../utils/storage'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const CategoriesPage = () => {
  const navigate = useNavigate()
  const { categories, syncCategories, addCategory, updateCategory, publishCategories } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add')
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined)
  const [toggleConfirmCategory, setToggleConfirmCategory] = useState<Category | null>(null)
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncCategories()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load categories from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncCategories])

  const publishedMeta = (() => {
    try {
      return safeJsonParse<{ publishedAt?: string }>(localStorage.getItem(CC_PUBLISHED_META_KEY))
    } catch {
      return null
    }
  })()
  const [lastPublishedAt, setLastPublishedAt] = useState<string | undefined>(publishedMeta?.publishedAt)

  const filteredCategories = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return categories.filter((category) => {
      const matchesSearch =
        !searchValue || category.name.toLowerCase().includes(searchValue) || category.slug.toLowerCase().includes(searchValue)

      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? category.isActive : !category.isActive)

      return matchesSearch && matchesStatus
    })
  }, [categories, search, statusFilter])

  const publishValidationMessage = useMemo(() => {
    const activeCategories = categories.filter((category) => category.isActive)

    const invalid = activeCategories.filter(
      (category) => category.subcategories.length > 8,
    )
    if (invalid.length > 0) {
      const details = invalid.map((category) => `${category.name} (${category.subcategories.length})`).join(', ')
      return `Invalid subcategory counts: ${details}. Each active category can have at most 8.`
    }

    return undefined
  }, [categories])

  const columns = useMemo<GridColDef<Category>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Category',
        flex: 1.2,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<Category>) => (
          <Stack sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.slug}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'subcategories',
        headerName: 'Subcategories',
        minWidth: 150,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<Category>) => (
          <Typography variant="body2">{params.row.subcategories.length}</Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 140,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<Category, boolean>) => (
          <Chip
            size="small"
            label={params.value ? 'Active' : 'Inactive'}
            color={params.value ? 'success' : 'default'}
            variant={params.value ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Category, string>) => (
          <Typography variant="body2">{formatDateTime(String(params.value))}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 320,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Category>) => (
          <Stack direction="row" spacing={1} sx={{ py: 1 }}>
            <Button size="small" variant="outlined" onClick={() => navigate(`/superadmin/categories/${params.row.slug}`)}>
              Manage
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditRoundedIcon />}
              onClick={() => {
                setSelectedCategory(params.row)
                setFormMode('edit')
                setFormOpen(true)
              }}
            >
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color={params.row.isActive ? 'warning' : 'success'}
              startIcon={params.row.isActive ? <ToggleOffRoundedIcon /> : <ToggleOnRoundedIcon />}
              onClick={() => setToggleConfirmCategory(params.row)}
            >
              {params.row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Stack>
        ),
      },
    ],
    [navigate],
  )

  const handlePublish = async () => {
    const result = await publishCategories()

    if (!result.ok) {
      showError(result.error ?? 'Failed to publish categories.')
      return
    }

    showSuccess('Categories published')
    const meta = (() => {
      try {
        return safeJsonParse<{ publishedAt?: string }>(localStorage.getItem(CC_PUBLISHED_META_KEY))
      } catch {
        return null
      }
    })()
    setLastPublishedAt(meta?.publishedAt)
  }

  const handleAddCategory = async (name: string) => {
    const result = await addCategory(name)
    if (result.ok) {
      showSuccess('Category created')
    }
    return result
  }

  const handleEditCategory = async (categoryId: string, patch: { name: string; isActive: boolean }) => {
    const result = await updateCategory(categoryId, patch)
    if (result.ok) {
      showSuccess('Category updated')
    }
    return result
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
  }

  const handleExportCsv = () => {
    if (filteredCategories.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredCategories.map((category) => ({
      name: category.name,
      slug: category.slug,
      isActive: category.isActive,
      subcategoriesCount: category.subcategories.length,
      updatedAt: category.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered = search.trim().length > 0 || statusFilter !== 'all'
    const filename = buildCsvFilename('categories', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        actions={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<PublishRoundedIcon />}
              onClick={handlePublish}
              disabled={Boolean(publishValidationMessage)}
            >
              Publish Changes
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setFormMode('add')
                setSelectedCategory(undefined)
                setFormOpen(true)
              }}
            >
              Add Category
            </Button>
          </Stack>
        }
      />

      {lastPublishedAt ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Last published: {formatDateTime(lastPublishedAt)}
        </Typography>
      ) : null}

      {publishValidationMessage ? (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1.5 }}>
          {publishValidationMessage}
        </Typography>
      ) : null}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              placeholder="Search by category name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        {isInitialLoading ? (
          <CardContent>
            <Stack spacing={1}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rectangular" height={180} />
            </Stack>
          </CardContent>
        ) : filteredCategories.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No categories match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredCategories}
                columns={columns}
                autoHeight
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
              />
            </DataGridContainer>
          </Box>
        )}
      </Card>

      <CategoryFormDialog
        open={formOpen}
        mode={formMode}
        category={selectedCategory}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSubmitAdd={handleAddCategory}
        onSubmitEdit={handleEditCategory}
      />

      <ConfirmDialog
        open={Boolean(toggleConfirmCategory)}
        title={`${toggleConfirmCategory?.isActive ? 'Deactivate' : 'Activate'} category?`}
        description={
          toggleConfirmCategory?.isActive
            ? 'Inactive category will not be published to dependent dashboards.'
            : 'Active category will be eligible for publish.'
        }
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onClose={() => setToggleConfirmCategory(null)}
        onConfirm={async () => {
          if (!toggleConfirmCategory) {
            return
          }

          const result = await updateCategory(toggleConfirmCategory.id, { isActive: !toggleConfirmCategory.isActive })
          if (result.ok) {
            showSuccess(`Category ${toggleConfirmCategory.isActive ? 'deactivated' : 'activated'}`)
          } else {
            showError(result.error ?? 'Could not update category status.')
          }

          setToggleConfirmCategory(null)
        }}
      />
    </>
  )
}

export default CategoriesPage
