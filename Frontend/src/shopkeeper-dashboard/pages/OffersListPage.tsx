import EditIcon from '@mui/icons-material/Edit'
import SearchIcon from '@mui/icons-material/Search'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyStateCard from '../components/EmptyStateCard'
import OfferStatusChip from '../components/OfferStatusChip'
import PageHeader from '../components/PageHeader'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { deleteOffer as deleteOfferApi, getOffers, toggleOffer } from '../services/offerService'
import type { Offer } from '../types/offer'
import { deriveOfferStatus } from '../types/offer'
import type { OfferScope, OfferStatus } from '../types/offer'

type StatusFilter = 'ALL' | OfferStatus
type ScopeFilter = 'ALL' | OfferScope

const OffersListPage = () => {
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { showMessage } = useAppFeedback()
  const [offers, setOffers] = useState<Offer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [actionOfferId, setActionOfferId] = useState<string | null>(null)
  const [confirmDisable, setConfirmDisable] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [viewOfferId, setViewOfferId] = useState<string | null>(null)

  useEffect(() => {
    if (!shopId) {
      setPageError('Shop not found for current session.')
      setIsLoading(false)
      return
    }

    const timer = window.setTimeout(() => {
      const loadOffers = async () => {
        try {
          setPageError('')
          setIsLoading(true)
          const response = await getOffers(shopId, { limit: 100, offset: 0 })
          setOffers(response.offers)
        } catch (error) {
          setPageError(error instanceof Error ? error.message : 'Unable to load offers.')
        } finally {
          setIsLoading(false)
        }
      }

      void loadOffers()
    }, 280)

    return () => window.clearTimeout(timer)
  }, [shopId])

  const offersWithStatus = useMemo(
    () => offers.map((offer) => ({ ...offer, status: deriveOfferStatus(offer) })),
    [offers],
  )

  const filteredOffers = useMemo(
    () =>
      offersWithStatus.filter((offer) => {
        const matchesSearch = offer.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        const matchesStatus = statusFilter === 'ALL' || offer.status === statusFilter
        const matchesScope = scopeFilter === 'ALL' || offer.scope === scopeFilter
        return matchesSearch && matchesStatus && matchesScope
      }),
    [offersWithStatus, searchQuery, statusFilter, scopeFilter],
  )

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Offer Name',
      flex: 1.35,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {params.row.name}
        </Typography>
      ),
    },
    {
      field: 'typeValue',
      headerName: 'Type / Value',
      flex: 0.95,
      minWidth: 130,
      valueGetter: (_, row) => (row.type === 'PERCENT' ? `${row.value}%` : `₹${row.value}`),
      renderCell: (params: GridRenderCellParams) => (
        <Stack spacing={0.1}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.type === 'PERCENT' ? 'Percent' : 'Flat'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.type === 'PERCENT' ? `${params.row.value}%` : `₹${params.row.value}`}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'appliesTo',
      headerName: 'Applies To',
      flex: 0.95,
      minWidth: 130,
      valueGetter: (_, row) => {
        if (row.scope === 'SHOP') {
          return 'Shop'
        }

        if (row.scope === 'CATEGORIES') {
          return `${row.categoryIds?.length ?? 0} categories`
        }

        return `${row.productIds?.length ?? 0} products`
      },
    },
    {
      field: 'startsAt',
      headerName: 'Start',
      flex: 0.9,
      minWidth: 140,
      valueFormatter: (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      field: 'endsAt',
      headerName: 'End',
      flex: 0.9,
      minWidth: 140,
      valueFormatter: (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.8,
      minWidth: 110,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => <OfferStatusChip status={params.row.status} />,
    },
    {
      field: 'enabled',
      headerName: 'Enabled',
      flex: 0.7,
      minWidth: 95,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Switch
          size="small"
          checked={Boolean(params.row.enabled)}
          inputProps={{ 'aria-label': `toggle offer ${params.row.name}` }}
          disabled={actionOfferId === params.row.id}
          onChange={(_, checked) => {
            if (params.row.enabled) {
              setConfirmDisable({ id: params.row.id, name: params.row.name })
              return
            }

            if (!shopId) {
              showMessage('Shop not found for current session.')
              return
            }

            void (async () => {
              try {
                setActionOfferId(params.row.id)
                const updated = await toggleOffer(shopId, params.row.id, checked)
                setOffers((prev) => prev.map((offer) => (offer.id === params.row.id ? updated : offer)))
                showMessage(`${checked ? 'Enabled' : 'Disabled'} ${params.row.name}`)
              } catch (error) {
                showMessage(error instanceof Error ? error.message : 'Unable to toggle offer.')
              } finally {
                setActionOfferId(null)
              }
            })()
          }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.95,
      minWidth: 140,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => setViewOfferId(params.row.id)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/shop/offers/${params.row.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setConfirmDelete({ id: params.row.id, name: params.row.name })}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  const viewOffer = viewOfferId ? offersWithStatus.find((offer) => offer.id === viewOfferId) : null
  const activeOffersCount = offersWithStatus.filter((offer) => offer.status === 'ACTIVE').length
  const scheduledOffersCount = offersWithStatus.filter((offer) => offer.status === 'SCHEDULED').length
  const disabledOffersCount = offersWithStatus.filter((offer) => offer.status === 'DISABLED').length

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Offers"
          subtitle="Create and manage promotional offers"
          actions={[
            {
              label: 'Create Offer',
              onClick: () => navigate('/shop/offers/new'),
              variant: 'contained',
              color: 'primary',
            },
          ]}
        />

        {pageError ? <Alert severity="error">{pageError}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Total Offers</Typography>
            <Typography variant="h6">{offersWithStatus.length}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Active</Typography>
            <Typography variant="h6">{activeOffersCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Scheduled</Typography>
            <Typography variant="h6">{scheduledOffersCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Disabled</Typography>
            <Typography variant="h6">{disabledOffersCount}</Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 2,
            borderRadius: 2.5,
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.25, color: 'text.secondary', fontWeight: 700 }}>
            FILTERS
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
            <TextField
              placeholder="Search offers by name..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />

            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="EXPIRED">Expired</MenuItem>
                <MenuItem value="DISABLED">Disabled</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel>Scope</InputLabel>
              <Select
                label="Scope"
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="SHOP">Shop</MenuItem>
                <MenuItem value="CATEGORIES">Categories</MenuItem>
                <MenuItem value="PRODUCTS">Products</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.08)', p: 2.5 }}>
            <Stack spacing={1.25}>
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
            </Stack>
          </Box>
        ) : filteredOffers.length === 0 ? (
          <EmptyStateCard
            title="No results found"
            description="Try changing filters or search."
            actionLabel="Create Offer"
            onAction={() => navigate('/shop/offers/new')}
          />
        ) : (
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2.5,
              border: '1px solid rgba(15,23,42,0.08)',
              overflow: 'hidden',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1}
              sx={{ px: 2.25, py: 1.8, borderBottom: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Box>
                <Typography variant="h6">Offers Management</Typography>
                <Typography variant="body2" color="text.secondary">Review offer lifecycle and activation controls</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Showing {filteredOffers.length} offers</Typography>
            </Stack>

            <Box sx={{ overflowX: 'auto', p: 1 }}>
              <DataGrid
                autoHeight
                rows={filteredOffers}
                columns={columns}
                disableRowSelectionOnClick
                density="compact"
                pageSizeOptions={[10, 25]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      page: 0,
                      pageSize: 10,
                    },
                  },
                }}
                sx={{
                  border: 'none',
                  minWidth: 1020,
                }}
              />
            </Box>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={Boolean(confirmDisable)}
        title="Disable offer?"
        description={`This will immediately disable ${confirmDisable?.name ?? 'this offer'}.`}
        confirmText="Disable"
        confirmColor="error"
        onCancel={() => setConfirmDisable(null)}
        onConfirm={() => {
          if (!confirmDisable) {
            return
          }

          if (!shopId) {
            showMessage('Shop not found for current session.')
            setConfirmDisable(null)
            return
          }

          void (async () => {
            try {
              setActionOfferId(confirmDisable.id)
              const updated = await toggleOffer(shopId, confirmDisable.id, false)
              setOffers((prev) => prev.map((offer) => (offer.id === confirmDisable.id ? updated : offer)))
              showMessage(`Disabled ${confirmDisable.name}`)
            } catch (error) {
              showMessage(error instanceof Error ? error.message : 'Unable to disable offer.')
            } finally {
              setActionOfferId(null)
              setConfirmDisable(null)
            }
          })()
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete offer?"
        description={`This will permanently remove ${confirmDelete?.name ?? 'this offer'}.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) {
            return
          }

          if (!shopId) {
            showMessage('Shop not found for current session.')
            setConfirmDelete(null)
            return
          }

          void (async () => {
            try {
              setActionOfferId(confirmDelete.id)
              await deleteOfferApi(shopId, confirmDelete.id)
              setOffers((prev) => prev.filter((offer) => offer.id !== confirmDelete.id))
              showMessage(`Deleted ${confirmDelete.name}`)
              if (viewOfferId === confirmDelete.id) {
                setViewOfferId(null)
              }
            } catch (error) {
              showMessage(error instanceof Error ? error.message : 'Unable to delete offer.')
            } finally {
              setActionOfferId(null)
              setConfirmDelete(null)
            }
          })()
        }}
      />

      <Dialog open={Boolean(viewOffer)} onClose={() => setViewOfferId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Offer Details</DialogTitle>
        <DialogContent>
          {viewOffer && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2"><strong>Name:</strong> {viewOffer.name}</Typography>
              <Typography variant="body2"><strong>Type:</strong> {viewOffer.type === 'PERCENT' ? 'Percent' : 'Flat'}</Typography>
              <Typography variant="body2"><strong>Value:</strong> {viewOffer.type === 'PERCENT' ? `${viewOffer.value}%` : `₹${viewOffer.value}`}</Typography>
              <Typography variant="body2"><strong>Scope:</strong> {viewOffer.scope}</Typography>
              <Typography variant="body2"><strong>Start:</strong> {new Date(viewOffer.startsAt).toLocaleString('en-IN')}</Typography>
              <Typography variant="body2"><strong>End:</strong> {new Date(viewOffer.endsAt).toLocaleString('en-IN')}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {viewOffer.status}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOfferId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default OffersListPage
