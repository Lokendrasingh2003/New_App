import EditRoundedIcon from '@mui/icons-material/EditRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
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
  Drawer,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { Shop, ShopStatus } from '../types/shop'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const SHOP_STATUSES: Array<'all' | ShopStatus> = [
  'all',
  'pending_approval',
  'approved',
  'rejected',
  'suspended',
  'reactivated',
]

const MAX_SLUG_LENGTH = 25

const statusLabelMap: Record<ShopStatus, string> = {
  pending_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  reactivated: 'Reactivated',
}

const statusColorMap: Record<ShopStatus, 'warning' | 'success' | 'error' | 'default' | 'info'> = {
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'error',
  suspended: 'default',
  reactivated: 'info',
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const sanitizeSlug = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
}

const ShopsPage = () => {
  const {
    shops,
    cities,
    categories,
    syncShops,
    approveShop,
    rejectShop,
    suspendShop,
    reactivateShop,
    toggleShopPublic,
    updateShopSlug,
  } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [cityFilter, setCityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ShopStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<Shop | null>(null)

  const [rejectTarget, setRejectTarget] = useState<Shop | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [suspendTarget, setSuspendTarget] = useState<Shop | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

  const [slugTarget, setSlugTarget] = useState<Shop | null>(null)
  const [slugInput, setSlugInput] = useState('')
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncShops()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load shops from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncShops])

  const selectedShop = useMemo(
    () => (selectedShopId ? shops.find((shop) => shop.id === selectedShopId) ?? null : null),
    [selectedShopId, shops],
  )

  const cityNameById = useMemo(() => {
    return new Map(cities.map((city) => [city.id, city.name]))
  }, [cities])

  const categoryOptions = useMemo(() => {
    const values = new Set(categories.map((category) => category.name))
    shops.forEach((shop) => values.add(shop.categoryName))
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [categories, shops])

  const filteredShops = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return shops.filter((shop) => {
      const cityMatch = cityFilter === 'all' || shop.cityId === cityFilter
      const statusMatch = statusFilter === 'all' || shop.status === statusFilter
      const categoryMatch = categoryFilter === 'all' || shop.categoryName === categoryFilter

      const searchMatch =
        !searchValue ||
        shop.shopName.toLowerCase().includes(searchValue) ||
        shop.ownerName.toLowerCase().includes(searchValue) ||
        shop.phone.toLowerCase().includes(searchValue) ||
        shop.slug.toLowerCase().includes(searchValue)

      return cityMatch && statusMatch && categoryMatch && searchMatch
    })
  }, [categoryFilter, cityFilter, search, shops, statusFilter])

  const slugValidationError = useMemo(() => {
    if (!slugTarget) {
      return undefined
    }

    const normalized = sanitizeSlug(slugInput)

    if (!normalized) {
      return 'Slug is required.'
    }

    if (normalized.length > MAX_SLUG_LENGTH) {
      return `Slug must be at most ${MAX_SLUG_LENGTH} characters.`
    }

    const duplicate = shops.some(
      (shop) => shop.id !== slugTarget.id && shop.slug.toLowerCase() === normalized.toLowerCase(),
    )

    if (duplicate) {
      return 'Slug must be unique.'
    }

    return undefined
  }, [shops, slugInput, slugTarget])

  const clearFilters = () => {
    setCityFilter('all')
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearch('')
  }

  const handleExportCsv = () => {
    if (filteredShops.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredShops.map((shop) => ({
      id: shop.id,
      shopName: shop.shopName,
      ownerName: shop.ownerName,
      phone: shop.phone,
      cityName: cityNameById.get(shop.cityId) ?? 'Unknown city',
      categoryName: shop.categoryName,
      slug: shop.slug,
      status: shop.status,
      isPublic: shop.isPublic,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt,
      rejectReason: shop.rejectReason ?? '',
    }))

    const csv = toCsv(rows)
    const isFiltered =
      cityFilter !== 'all' || statusFilter !== 'all' || categoryFilter !== 'all' || search.trim().length > 0
    const filename = buildCsvFilename('shops', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const runAction = async (result: Promise<{ ok: boolean; error?: string }>, successMessage: string) => {
    const resolved = await result

    if (resolved.ok) {
      showSuccess(successMessage)
      return
    }

    showError(resolved.error ?? 'Action failed.')
  }

  const openRejectDialog = (shop: Shop) => {
    setRejectTarget(shop)
    setRejectReason('')
  }

  const openSuspendDialog = (shop: Shop) => {
    setSuspendTarget(shop)
    setSuspendReason('')
  }

  const openSlugDialog = (shop: Shop) => {
    setSlugTarget(shop)
    setSlugInput(shop.slug)
  }

  const columns = useMemo<GridColDef<Shop>[]>(
    () => [
      {
        field: 'shopName',
        headerName: 'Shop',
        minWidth: 220,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<Shop>) => (
          <Stack sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.shopName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.slug}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'ownerName',
        headerName: 'Owner',
        minWidth: 220,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Shop>) => (
          <Stack sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.ownerName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.phone}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'cityId',
        headerName: 'City',
        minWidth: 160,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<Shop>) => (
          <Typography variant="body2">{cityNameById.get(params.row.cityId) ?? 'Unknown city'}</Typography>
        ),
      },
      {
        field: 'categoryName',
        headerName: 'Category',
        minWidth: 160,
        flex: 0.9,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 150,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<Shop, ShopStatus>) => (
          <Chip
            size="small"
            label={statusLabelMap[params.value ?? 'pending_approval']}
            color={statusColorMap[params.value ?? 'pending_approval']}
            variant="filled"
          />
        ),
      },
      {
        field: 'isPublic',
        headerName: 'Public',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams<Shop, boolean>) => (
          <Chip size="small" label={params.value ? 'Yes' : 'No'} color={params.value ? 'success' : 'default'} />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Shop, string>) => (
          <Typography variant="body2">{formatDateTime(String(params.value))}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 620,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Shop>) => {
          const row = params.row
          const canApproveReject = row.status === 'pending_approval'
          const canSuspend = row.status === 'approved' || row.status === 'reactivated'
          const canReactivate = row.status === 'suspended'
          const canTogglePublic = row.status === 'approved' || row.status === 'reactivated'

          return (
            <Stack direction="row" spacing={1} sx={{ py: 1 }}>
              <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedShopId(row.id)}>
                View
              </Button>
              <Button size="small" variant="outlined" disabled={!canApproveReject} onClick={() => setApproveTarget(row)}>
                Approve
              </Button>
              <Button size="small" variant="outlined" color="error" disabled={!canApproveReject} onClick={() => openRejectDialog(row)}>
                Reject
              </Button>
              <Button size="small" variant="outlined" color="warning" disabled={!canSuspend} onClick={() => openSuspendDialog(row)}>
                Suspend
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="success"
                disabled={!canReactivate}
                onClick={() => {
                  void runAction(reactivateShop(row.id), `${row.shopName} reactivated`)
                }}
              >
                Reactivate
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!canTogglePublic}
                onClick={() => {
                  void runAction(toggleShopPublic(row.id), `${row.shopName} visibility updated`)
                }}
              >
                Toggle Public
              </Button>
              <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openSlugDialog(row)}>
                Edit Slug
              </Button>
            </Stack>
          )
        },
      },
    ],
    [cityNameById, reactivateShop, toggleShopPublic],
  )

  return (
    <>
      <PageHeader
        title="Shops"
        actions={
          <Button variant="outlined" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              select
              label="City"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              <MenuItem value="all">All</MenuItem>
              {cities.map((city) => (
                <MenuItem key={city.id} value={city.id}>
                  {city.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ShopStatus)}
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            >
              {SHOP_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'all' ? 'All' : statusLabelMap[status]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Category"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            >
              <MenuItem value="all">All</MenuItem>
              {categoryOptions.map((category) => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search"
              placeholder="shop / owner / phone / slug"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
            />
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
        ) : filteredShops.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No shops match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredShops}
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

      <Drawer anchor="right" open={Boolean(selectedShopId)} onClose={() => setSelectedShopId(null)}>
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 2.5 }}>
          {selectedShop ? (
            <Stack spacing={1.75}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedShop.shopName}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip label={statusLabelMap[selectedShop.status]} color={statusColorMap[selectedShop.status]} size="small" />
                <Chip label={selectedShop.isPublic ? 'Public' : 'Private'} color={selectedShop.isPublic ? 'success' : 'default'} size="small" />
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Slug: {selectedShop.slug}
              </Typography>
              <Typography variant="body2">Owner: {selectedShop.ownerName}</Typography>
              <Typography variant="body2">Phone: {selectedShop.phone}</Typography>
              <Typography variant="body2">Description: {selectedShop.description || '--'}</Typography>
              <Typography variant="body2">City: {cityNameById.get(selectedShop.cityId) ?? 'Unknown city'}</Typography>
              <Typography variant="body2">Category: {selectedShop.categoryName || 'Unknown category'}</Typography>
              <Typography variant="body2">Address: {selectedShop.addressLine1 || '--'}</Typography>
              <Typography variant="body2">Area: {selectedShop.area || '--'}</Typography>
              <Typography variant="body2">Pincode: {selectedShop.pincode || '--'}</Typography>
              <Typography variant="body2">Opening: {selectedShop.openingTime || '--'}</Typography>
              <Typography variant="body2">Closing: {selectedShop.closingTime || '--'}</Typography>
              <Typography variant="body2">GST: {selectedShop.gstNumber || '--'}</Typography>
              <Typography variant="body2">Business Proof: {selectedShop.businessProofUrl || '--'}</Typography>
              {selectedShop.businessProofUrl ? (
                <Box
                  component="img"
                  src={selectedShop.businessProofUrl}
                  alt="Business proof"
                  sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                />
              ) : null}
              <Typography variant="body2">Identity Proof: {selectedShop.identityProofUrl || '--'}</Typography>
              {selectedShop.identityProofUrl ? (
                <Box
                  component="img"
                  src={selectedShop.identityProofUrl}
                  alt="Identity proof"
                  sx={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                />
              ) : null}
              <Typography variant="body2">Bank Holder: {selectedShop.bankAccountHolderName || '--'}</Typography>
              <Typography variant="body2">Bank IFSC: {selectedShop.bankIfscCode || '--'}</Typography>
              <Typography variant="body2">Bank A/C: {selectedShop.bankAccountNumberMasked || '--'}</Typography>
              <Typography variant="body2">Review Status: {selectedShop.registrationReviewStatus || '--'}</Typography>
              <Typography variant="body2">Image URL: {selectedShop.imageUrl || '--'}</Typography>
              {selectedShop.imageUrl ? (
                <Box
                  component="img"
                  src={selectedShop.imageUrl}
                  alt="Shop image"
                  sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                />
              ) : null}
              <Typography variant="body2">Created: {formatDateTime(selectedShop.createdAt)}</Typography>
              <Typography variant="body2">Updated: {formatDateTime(selectedShop.updatedAt)}</Typography>
              {selectedShop.rejectReason ? (
                <Typography variant="body2" color="error.main">
                  Reject reason: {selectedShop.rejectReason}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedShop.status === 'pending_approval' ? (
                  <>
                    <Button variant="outlined" onClick={() => setApproveTarget(selectedShop)}>
                      Approve
                    </Button>
                    <Button variant="outlined" color="error" onClick={() => openRejectDialog(selectedShop)}>
                      Reject
                    </Button>
                  </>
                ) : null}

                {(selectedShop.status === 'approved' || selectedShop.status === 'reactivated') && (
                  <>
                    <Button variant="outlined" color="warning" onClick={() => openSuspendDialog(selectedShop)}>
                      Suspend
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        void runAction(toggleShopPublic(selectedShop.id), `${selectedShop.shopName} visibility updated`)
                      }}
                    >
                      Toggle Public
                    </Button>
                  </>
                )}

                {selectedShop.status === 'suspended' ? (
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => {
                      void runAction(reactivateShop(selectedShop.id), `${selectedShop.shopName} reactivated`)
                    }}
                  >
                    Reactivate
                  </Button>
                ) : null}

                <Button variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openSlugDialog(selectedShop)}>
                  Edit Slug
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Shop unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected shop could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedShopId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(approveTarget)}
        title="Approve this shop?"
        description="Approved shop will become active for moderation and public visibility by default."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (!approveTarget) {
            return
          }

          await runAction(approveShop(approveTarget.id), `${approveTarget.shopName} approved`)
          setApproveTarget(null)
        }}
      />

      <Dialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Reject Shop</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Provide a reason for rejecting this shop request.
            </Typography>
            <TextField
              label="Reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText="Minimum 5 characters"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={rejectReason.trim().length < 5}
            onClick={async () => {
              if (!rejectTarget) {
                return
              }

              await runAction(rejectShop(rejectTarget.id, rejectReason), `${rejectTarget.shopName} rejected`)
              setRejectTarget(null)
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(suspendTarget)} onClose={() => setSuspendTarget(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Suspend Shop</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Optionally provide a reason for suspension.
            </Typography>
            <TextField
              label="Reason (optional)"
              value={suspendReason}
              onChange={(event) => setSuspendReason(event.target.value)}
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSuspendTarget(null)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={async () => {
              if (!suspendTarget) {
                return
              }

              await runAction(suspendShop(suspendTarget.id, suspendReason), `${suspendTarget.shopName} suspended`)
              setSuspendTarget(null)
            }}
          >
            Suspend
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(slugTarget)} onClose={() => setSlugTarget(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Edit Shop Slug</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              label="Slug"
              value={slugInput}
              onChange={(event) => setSlugInput(sanitizeSlug(event.target.value))}
              fullWidth
              error={Boolean(slugValidationError)}
              helperText={slugValidationError ?? 'Use lowercase letters, numbers and hyphens. Max 25 characters.'}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSlugTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={Boolean(slugValidationError)}
            onClick={async () => {
              if (!slugTarget) {
                return
              }

              await runAction(updateShopSlug(slugTarget.id, slugInput), `${slugTarget.shopName} slug updated`)
              setSlugTarget(null)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ShopsPage
