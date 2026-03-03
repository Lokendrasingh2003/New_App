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
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { CreateCouponInput, UpdateCouponPatch } from '../store/types'
import type { Coupon, CouponDiscountType, CouponScopeType } from '../types/Coupon'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

type CouponFormState = {
  code: string
  discountType: CouponDiscountType
  discountValue: string
  maxDiscount: string
  minOrderValue: string
  validFrom: string
  validTo: string
  usageLimitGlobal: string
  usageLimitPerUser: string
  scopeType: CouponScopeType
  cityId: string
  categoryId: string
  shopId: string
  isActive: boolean
}

const COUPON_CODE_REGEX = /^[A-Z0-9]{4,12}$/

const statusFilterOptions = ['ALL', 'ACTIVE', 'INACTIVE'] as const
const typeFilterOptions = ['ALL', 'FLAT', 'PERCENT', 'FREE_DELIVERY'] as const
const scopeFilterOptions = ['ALL', 'GLOBAL', 'CITY', 'CATEGORY', 'SHOP'] as const

type StatusFilter = (typeof statusFilterOptions)[number]
type TypeFilter = (typeof typeFilterOptions)[number]
type ScopeFilter = (typeof scopeFilterOptions)[number]

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const toLocalDateTimeInput = (iso: string) => {
  const date = new Date(iso)
  const timezoneOffset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - timezoneOffset * 60000)
  return localDate.toISOString().slice(0, 16)
}

const toIsoString = (localValue: string) => new Date(localValue).toISOString()

const couponValueSummary = (coupon: Coupon) => {
  if (coupon.discountType === 'FREE_DELIVERY') {
    return 'Free Delivery'
  }

  if (coupon.discountType === 'FLAT') {
    return `₹${coupon.discountValue ?? 0}`
  }

  return `${coupon.discountValue ?? 0}% (max ₹${coupon.maxDiscount ?? 0})`
}

const initialFormState: CouponFormState = {
  code: '',
  discountType: 'FLAT',
  discountValue: '',
  maxDiscount: '',
  minOrderValue: '',
  validFrom: '',
  validTo: '',
  usageLimitGlobal: '',
  usageLimitPerUser: '',
  scopeType: 'GLOBAL',
  cityId: '',
  categoryId: '',
  shopId: '',
  isActive: true,
}

const CouponsPage = () => {
  const { coupons, cities, categories, shops, createCoupon, updateCoupon, toggleCouponActive } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL')
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL')
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null)
  const [formState, setFormState] = useState<CouponFormState>(initialFormState)

  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<Coupon | null>(null)
  const isInitialLoading = useInitialLoadingDelay()

  const cityMap = useMemo(() => new Map(cities.map((city) => [city.id, city.name])), [cities])
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories])
  const shopMap = useMemo(() => new Map(shops.map((shop) => [shop.id, shop.shopName])), [shops])

  const selectedCoupon = useMemo(
    () => (selectedCouponId ? coupons.find((coupon) => coupon.id === selectedCouponId) ?? null : null),
    [coupons, selectedCouponId],
  )

  const filteredCoupons = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return coupons.filter((coupon) => {
      const statusMatch =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? coupon.isActive : !coupon.isActive)
      const typeMatch = typeFilter === 'ALL' || coupon.discountType === typeFilter
      const scopeMatch = scopeFilter === 'ALL' || coupon.scope.type === scopeFilter
      const searchMatch = !searchValue || coupon.code.toLowerCase().includes(searchValue)

      return statusMatch && typeMatch && scopeMatch && searchMatch
    })
  }, [coupons, scopeFilter, search, statusFilter, typeFilter])

  const isExpired = (coupon: Coupon) => new Date().getTime() > new Date(coupon.validTo).getTime()

  const scopeLabel = (coupon: Coupon) => {
    if (coupon.scope.type === 'CITY') {
      return cityMap.get(coupon.scope.cityId ?? '') ?? 'Unknown city'
    }

    if (coupon.scope.type === 'CATEGORY') {
      return categoryMap.get(coupon.scope.categoryId ?? '') ?? 'Unknown category'
    }

    if (coupon.scope.type === 'SHOP') {
      return shopMap.get(coupon.scope.shopId ?? '') ?? 'Unknown shop'
    }

    return 'Global'
  }

  const formValidationError = useMemo(() => {
    const code = formState.code.toUpperCase().replace(/\s+/g, '').trim()

    if (!code) {
      return 'Code is required.'
    }

    if (!COUPON_CODE_REGEX.test(code)) {
      return 'Code must be 4-12 chars, uppercase letters/numbers only.'
    }

    const duplicateCode = coupons.some(
      (coupon) =>
        coupon.id !== editingCouponId && coupon.code.toLowerCase() === code.toLowerCase(),
    )
    if (duplicateCode) {
      return 'Code must be unique.'
    }

    if (!formState.validFrom || !formState.validTo) {
      return 'Valid from/to are required.'
    }

    const fromTime = new Date(formState.validFrom).getTime()
    const toTime = new Date(formState.validTo).getTime()
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || toTime <= fromTime) {
      return 'Valid To must be after Valid From.'
    }

    if (formState.discountType === 'FLAT') {
      const value = Number(formState.discountValue)
      if (!Number.isFinite(value) || Number.isNaN(value) || value <= 0) {
        return 'Flat discount must be greater than 0.'
      }
    }

    if (formState.discountType === 'PERCENT') {
      const value = Number(formState.discountValue)
      if (!Number.isFinite(value) || Number.isNaN(value) || value < 1 || value > 90) {
        return 'Percent discount must be between 1 and 90.'
      }

      const maxDiscount = Number(formState.maxDiscount)
      if (!Number.isFinite(maxDiscount) || Number.isNaN(maxDiscount) || maxDiscount <= 0) {
        return 'Max discount is required for percent coupons.'
      }
    }

    if (formState.discountType === 'FREE_DELIVERY' && formState.discountValue.trim()) {
      return 'Discount value must be empty for free delivery.'
    }

    if (formState.scopeType === 'CITY' && !formState.cityId) {
      return 'City is required for city scope.'
    }

    if (formState.scopeType === 'CATEGORY' && !formState.categoryId) {
      return 'Category is required for category scope.'
    }

    if (formState.scopeType === 'SHOP' && !formState.shopId) {
      return 'Shop is required for shop scope.'
    }

    return undefined
  }, [coupons, editingCouponId, formState])

  const openCreateDialog = () => {
    setEditingCouponId(null)
    setFormState({
      ...initialFormState,
      validFrom: toLocalDateTimeInput(new Date().toISOString()),
      validTo: toLocalDateTimeInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
    })
    setFormOpen(true)
  }

  const openEditDialog = (coupon: Coupon) => {
    setEditingCouponId(coupon.id)
    setFormState({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue !== undefined && coupon.discountValue !== null ? String(coupon.discountValue) : '',
      maxDiscount: coupon.maxDiscount !== null && coupon.maxDiscount !== undefined ? String(coupon.maxDiscount) : '',
      minOrderValue:
        coupon.minOrderValue !== null && coupon.minOrderValue !== undefined ? String(coupon.minOrderValue) : '',
      validFrom: toLocalDateTimeInput(coupon.validFrom),
      validTo: toLocalDateTimeInput(coupon.validTo),
      usageLimitGlobal:
        coupon.usageLimitGlobal !== null && coupon.usageLimitGlobal !== undefined ? String(coupon.usageLimitGlobal) : '',
      usageLimitPerUser:
        coupon.usageLimitPerUser !== null && coupon.usageLimitPerUser !== undefined ? String(coupon.usageLimitPerUser) : '',
      scopeType: coupon.scope.type,
      cityId: coupon.scope.cityId ?? '',
      categoryId: coupon.scope.categoryId ?? '',
      shopId: coupon.scope.shopId ?? '',
      isActive: coupon.isActive,
    })
    setFormOpen(true)
  }

  const buildPayload = (): CreateCouponInput => {
    const code = formState.code.toUpperCase().replace(/\s+/g, '').trim()

    return {
      code,
      discountType: formState.discountType,
      discountValue:
        formState.discountType === 'FREE_DELIVERY' || !formState.discountValue.trim()
          ? undefined
          : Number(formState.discountValue),
      maxDiscount: formState.maxDiscount.trim() ? Number(formState.maxDiscount) : null,
      minOrderValue: formState.minOrderValue.trim() ? Number(formState.minOrderValue) : null,
      validFrom: toIsoString(formState.validFrom),
      validTo: toIsoString(formState.validTo),
      usageLimitGlobal: formState.usageLimitGlobal.trim() ? Number(formState.usageLimitGlobal) : null,
      usageLimitPerUser: formState.usageLimitPerUser.trim() ? Number(formState.usageLimitPerUser) : null,
      scope: {
        type: formState.scopeType,
        cityId: formState.scopeType === 'CITY' ? formState.cityId : undefined,
        categoryId: formState.scopeType === 'CATEGORY' ? formState.categoryId : undefined,
        shopId: formState.scopeType === 'SHOP' ? formState.shopId : undefined,
      },
      isActive: formState.isActive,
    }
  }

  const handleSaveCoupon = () => {
    const payload = buildPayload()

    const result = editingCouponId
      ? updateCoupon(editingCouponId, payload as UpdateCouponPatch)
      : createCoupon(payload)

    if (!result.ok) {
      showError(result.error ?? 'Could not save coupon.')
      return
    }

    showSuccess(editingCouponId ? 'Coupon updated' : 'Coupon created')
    setFormOpen(false)
  }

  const requestToggleCoupon = (coupon: Coupon) => {
    if (coupon.isActive) {
      setDeactivateTarget(coupon)
      return
    }

    const result = toggleCouponActive(coupon.id)
    if (!result.ok) {
      showError(result.error ?? 'Could not update coupon status.')
      return
    }

    showSuccess('Coupon activated')
  }

  const handleExportCsv = () => {
    if (filteredCoupons.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredCoupons.map((coupon) => ({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue ?? '',
      maxDiscount: coupon.maxDiscount ?? '',
      minOrderValue: coupon.minOrderValue ?? '',
      scopeType: coupon.scope.type,
      scopeTarget: scopeLabel(coupon),
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      isActive: coupon.isActive,
      updatedAt: coupon.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered =
      statusFilter !== 'ALL' || typeFilter !== 'ALL' || scopeFilter !== 'ALL' || search.trim().length > 0
    const filename = buildCsvFilename('coupons', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const columns = useMemo<GridColDef<Coupon>[]>(
    () => [
      { field: 'code', headerName: 'Code', minWidth: 130, flex: 0.8 },
      { field: 'discountType', headerName: 'Type', minWidth: 140, flex: 0.8 },
      {
        field: 'value',
        headerName: 'Value',
        minWidth: 180,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Coupon>) => (
          <Typography variant="body2">{couponValueSummary(params.row)}</Typography>
        ),
      },
      {
        field: 'scope',
        headerName: 'Scope',
        minWidth: 220,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Coupon>) => (
          <Typography variant="body2">{`${params.row.scope.type}: ${scopeLabel(params.row)}`}</Typography>
        ),
      },
      {
        field: 'validity',
        headerName: 'Validity',
        minWidth: 240,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<Coupon>) => (
          <Typography variant="body2">
            {formatDateTime(params.row.validFrom)} - {formatDateTime(params.row.validTo)}
          </Typography>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Active',
        minWidth: 110,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams<Coupon, boolean>) => (
          <Chip size="small" label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} />
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Coupon>) => (
          <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 270,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Coupon>) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedCouponId(params.row.id)}>
              View
            </Button>
            <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(params.row)}>
              Edit
            </Button>
            <Button
              size="small"
              variant="outlined"
              color={params.row.isActive ? 'error' : 'success'}
              onClick={() => requestToggleCoupon(params.row)}
            >
              {params.row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Stack>
        ),
      },
    ],
    [scopeLabel],
  )

  return (
    <>
      <PageHeader
        title="Coupons"
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={openCreateDialog}>
              Create Coupon
            </Button>
          </Stack>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              sx={{ minWidth: { xs: '100%', md: 160 } }}
            >
              {statusFilterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              sx={{ minWidth: { xs: '100%', md: 190 } }}
            >
              {typeFilterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Scope"
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as ScopeFilter)}
              sx={{ minWidth: { xs: '100%', md: 190 } }}
            >
              {scopeFilterOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'ALL' ? 'All' : option}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search"
              placeholder="code"
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
        ) : filteredCoupons.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No coupons match your current filters."
              actionLabel="Clear filters"
              onAction={() => {
                setStatusFilter('ALL')
                setTypeFilter('ALL')
                setScopeFilter('ALL')
                setSearch('')
              }}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredCoupons}
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

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="md" scroll="paper">
        <DialogTitle>{editingCouponId ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Code"
                value={formState.code}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    code: event.target.value.toUpperCase().replace(/\s+/g, ''),
                  }))
                }
                fullWidth
              />

              <TextField
                select
                label="Discount Type"
                value={formState.discountType}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    discountType: event.target.value as CouponDiscountType,
                    discountValue: event.target.value === 'FREE_DELIVERY' ? '' : previous.discountValue,
                    maxDiscount: event.target.value === 'PERCENT' ? previous.maxDiscount : '',
                  }))
                }
                fullWidth
              >
                <MenuItem value="FLAT">FLAT</MenuItem>
                <MenuItem value="PERCENT">PERCENT</MenuItem>
                <MenuItem value="FREE_DELIVERY">FREE_DELIVERY</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Discount Value"
                type="number"
                value={formState.discountValue}
                onChange={(event) => setFormState((previous) => ({ ...previous, discountValue: event.target.value }))}
                disabled={formState.discountType === 'FREE_DELIVERY'}
                fullWidth
              />

              <TextField
                label="Max Discount"
                type="number"
                value={formState.maxDiscount}
                onChange={(event) => setFormState((previous) => ({ ...previous, maxDiscount: event.target.value }))}
                disabled={formState.discountType !== 'PERCENT'}
                fullWidth
              />

              <TextField
                label="Min Order Value"
                type="number"
                value={formState.minOrderValue}
                onChange={(event) => setFormState((previous) => ({ ...previous, minOrderValue: event.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Valid From"
                type="datetime-local"
                value={formState.validFrom}
                onChange={(event) => setFormState((previous) => ({ ...previous, validFrom: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <TextField
                label="Valid To"
                type="datetime-local"
                value={formState.validTo}
                onChange={(event) => setFormState((previous) => ({ ...previous, validTo: event.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                label="Global Usage Limit"
                type="number"
                value={formState.usageLimitGlobal}
                onChange={(event) => setFormState((previous) => ({ ...previous, usageLimitGlobal: event.target.value }))}
                fullWidth
              />

              <TextField
                label="Per User Usage Limit"
                type="number"
                value={formState.usageLimitPerUser}
                onChange={(event) => setFormState((previous) => ({ ...previous, usageLimitPerUser: event.target.value }))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
              <TextField
                select
                label="Scope Type"
                value={formState.scopeType}
                onChange={(event) =>
                  setFormState((previous) => ({
                    ...previous,
                    scopeType: event.target.value as CouponScopeType,
                    cityId: '',
                    categoryId: '',
                    shopId: '',
                  }))
                }
                fullWidth
              >
                <MenuItem value="GLOBAL">GLOBAL</MenuItem>
                <MenuItem value="CITY">CITY</MenuItem>
                <MenuItem value="CATEGORY">CATEGORY</MenuItem>
                <MenuItem value="SHOP">SHOP</MenuItem>
              </TextField>

              {formState.scopeType === 'CITY' ? (
                <TextField
                  select
                  label="City"
                  value={formState.cityId}
                  onChange={(event) => setFormState((previous) => ({ ...previous, cityId: event.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">Select city</MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city.id} value={city.id}>
                      {city.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {formState.scopeType === 'CATEGORY' ? (
                <TextField
                  select
                  label="Category"
                  value={formState.categoryId}
                  onChange={(event) => setFormState((previous) => ({ ...previous, categoryId: event.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">Select category</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}

              {formState.scopeType === 'SHOP' ? (
                <TextField
                  select
                  label="Shop"
                  value={formState.shopId}
                  onChange={(event) => setFormState((previous) => ({ ...previous, shopId: event.target.value }))}
                  fullWidth
                >
                  <MenuItem value="">Select shop</MenuItem>
                  {shops.map((shop) => (
                    <MenuItem key={shop.id} value={shop.id}>
                      {shop.shopName}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
            </Stack>

            <FormControlLabel
              control={
                <Switch
                  checked={formState.isActive}
                  onChange={(_, checked) => setFormState((previous) => ({ ...previous, isActive: checked }))}
                />
              }
              label="Active"
            />

            {formValidationError ? (
              <Typography variant="body2" color="error.main">
                {formValidationError}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={Boolean(formValidationError)} onClick={handleSaveCoupon}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={Boolean(selectedCouponId)} onClose={() => setSelectedCouponId(null)}>
        <Box sx={{ width: { xs: 320, sm: 470 }, p: 2.5 }}>
          {selectedCoupon ? (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedCoupon.code}
              </Typography>

              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  label={selectedCoupon.isActive ? 'Active' : 'Inactive'}
                  color={selectedCoupon.isActive ? 'success' : 'default'}
                />
                <Chip
                  size="small"
                  label={isExpired(selectedCoupon) ? 'Expired' : 'Valid'}
                  color={isExpired(selectedCoupon) ? 'error' : 'info'}
                />
              </Stack>

              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {couponValueSummary(selectedCoupon)}
              </Typography>
              <Typography variant="body2">Scope: {selectedCoupon.scope.type} - {scopeLabel(selectedCoupon)}</Typography>
              <Typography variant="body2">Min Order: {selectedCoupon.minOrderValue ? `₹${selectedCoupon.minOrderValue}` : 'Not set'}</Typography>
              <Typography variant="body2">
                Usage Limits: Global {selectedCoupon.usageLimitGlobal ?? '—'} | Per User {selectedCoupon.usageLimitPerUser ?? '—'}
              </Typography>
              <Typography variant="body2">Valid From: {formatDateTime(selectedCoupon.validFrom)}</Typography>
              <Typography variant="body2">Valid To: {formatDateTime(selectedCoupon.validTo)}</Typography>
              <Typography variant="body2">Created: {formatDateTime(selectedCoupon.createdAt)}</Typography>
              <Typography variant="body2">Updated: {formatDateTime(selectedCoupon.updatedAt)}</Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color={selectedCoupon.isActive ? 'error' : 'success'}
                  onClick={() => requestToggleCoupon(selectedCoupon)}
                >
                  {selectedCoupon.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    openEditDialog(selectedCoupon)
                    setSelectedCouponId(null)
                  }}
                >
                  Edit
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Coupon unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected coupon could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedCouponId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate coupon?"
        description="Users won’t be able to apply it."
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => {
          if (!deactivateTarget) {
            return
          }

          const result = toggleCouponActive(deactivateTarget.id)
          if (!result.ok) {
            showError(result.error ?? 'Could not update coupon status.')
            return
          }

          showSuccess('Coupon deactivated')
          setDeactivateTarget(null)
        }}
      />
    </>
  )
}

export default CouponsPage
