import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { ShopSubscription, SubscriptionStatus } from '../types/Subscription'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const statusFilterOptions = ['ALL', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const

type StatusFilter = (typeof statusFilterOptions)[number]

const statusColor: Record<SubscriptionStatus, 'success' | 'warning' | 'default'> = {
  ACTIVE: 'success',
  EXPIRED: 'warning',
  CANCELLED: 'default',
}

const formatDate = (value: string) => new Date(value).toLocaleDateString()

const daysUntil = (iso: string) => {
  const current = new Date().getTime()
  const target = new Date(iso).getTime()
  const diff = Math.ceil((target - current) / (24 * 60 * 60 * 1000))
  return diff
}

const SubscriptionTabs = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <Tabs
      value={pathname}
      onChange={(_, value) => navigate(value)}
      variant="scrollable"
      allowScrollButtonsMobile
      sx={{ mb: 2 }}
    >
      <Tab value="/superadmin/subscriptions/plans" label="Plans" />
      <Tab value="/superadmin/subscriptions/shops" label="Shop Subscriptions" />
    </Tabs>
  )
}

const ShopSubscriptionsPage = () => {
  const { shopSubscriptions, plans, shops, getPlanById, getShopName, getCityName, getExpiringSubscriptions } = useSuperAdminStore()
  const { showError } = useAppSnackbar()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [planFilter, setPlanFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isInitialLoading = useInitialLoadingDelay()

  const selectedSubscription = useMemo(
    () => (selectedId ? shopSubscriptions.find((item) => item.id === selectedId) ?? null : null),
    [selectedId, shopSubscriptions],
  )

  const expiringSoon = useMemo(() => getExpiringSubscriptions(15), [getExpiringSubscriptions])

  const filteredRows = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return shopSubscriptions.filter((item) => {
      const planMatch = planFilter === 'ALL' || item.planId === planFilter
      const statusMatch = statusFilter === 'ALL' || item.status === statusFilter
      const shopName = getShopName(item.shopId).toLowerCase()
      const searchMatch = !searchValue || shopName.includes(searchValue)

      return planMatch && statusMatch && searchMatch
    })
  }, [getShopName, planFilter, search, shopSubscriptions, statusFilter])

  const columns = useMemo<GridColDef<ShopSubscription>[]>(
    () => [
      {
        field: 'shopId',
        headerName: 'Shop',
        minWidth: 180,
        flex: 1,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => getShopName(row.shopId),
      },
      {
        field: 'planId',
        headerName: 'Plan',
        minWidth: 130,
        flex: 0.8,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => getPlanById(row.planId)?.name ?? 'Unknown',
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        flex: 0.8,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => (
          <Chip size="small" label={row.status} color={statusColor[row.status]} variant={row.status === 'ACTIVE' ? 'filled' : 'outlined'} />
        ),
      },
      {
        field: 'startDate',
        headerName: 'Start',
        minWidth: 120,
        flex: 0.7,
        valueFormatter: (value: string) => formatDate(value),
      },
      {
        field: 'expiryDate',
        headerName: 'Expiry',
        minWidth: 130,
        flex: 0.8,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => {
          const remaining = daysUntil(row.expiryDate)
          return (
            <Stack spacing={0.25}>
              <Typography variant="body2">{formatDate(row.expiryDate)}</Typography>
              <Typography variant="caption" color={remaining <= 15 && remaining >= 0 ? 'warning.main' : 'text.secondary'}>
                {remaining < 0 ? `Expired ${Math.abs(remaining)}d ago` : `${remaining}d left`}
              </Typography>
            </Stack>
          )
        },
      },
      {
        field: 'autoRenew',
        headerName: 'Auto Renew',
        minWidth: 120,
        flex: 0.7,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => (row.autoRenew ? 'On' : 'Off'),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 120,
        flex: 0.8,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<ShopSubscription>) => (
          <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedId(row.id)}>
            Details
          </Button>
        ),
      },
    ],
    [getPlanById, getShopName],
  )

  const activeCount = shopSubscriptions.filter((item) => item.status === 'ACTIVE').length

  const shopCityMap = useMemo(() => new Map(shops.map((shop) => [shop.id, shop.cityId])), [shops])

  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredRows.map((item) => ({
      shopName: getShopName(item.shopId),
      cityName: getCityName(shopCityMap.get(item.shopId) ?? ''),
      planName: getPlanById(item.planId)?.name ?? 'Unknown',
      status: item.status,
      startDate: item.startDate,
      expiryDate: item.expiryDate,
      autoRenew: item.autoRenew,
      updatedAt: item.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered = statusFilter !== 'ALL' || planFilter !== 'ALL' || search.trim().length > 0
    const filename = buildCsvFilename('shop_subscriptions', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        actions={
          <Button variant="outlined" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />
      <SubscriptionTabs />

      <Stack spacing={2.5}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Active Subscriptions
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {activeCount}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">
                Expiring in 15 Days
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                {expiringSoon.length}
              </Typography>
              <Stack spacing={0.75}>
                {expiringSoon.slice(0, 4).map((item) => (
                  <Typography key={item.id} variant="caption" color="text.secondary">
                    {getShopName(item.shopId)} • {daysUntil(item.expiryDate)}d • {getPlanById(item.planId)?.name ?? 'Unknown'}
                  </Typography>
                ))}
                {expiringSoon.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No active subscriptions expiring soon.
                  </Typography>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Search shop"
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 260 } }}
              />

              <TextField
                select
                label="Status"
                size="small"
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
                label="Plan"
                size="small"
                value={planFilter}
                onChange={(event) => setPlanFilter(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 180 } }}
              >
                <MenuItem value="ALL">ALL</MenuItem>
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </CardContent>
        </Card>

        {isInitialLoading ? (
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1}>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="rectangular" height={180} />
              </Stack>
            </CardContent>
          </Card>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No results"
            description="Try changing filters to see matching subscriptions."
            actionLabel="Clear filters"
            onAction={() => {
              setStatusFilter('ALL')
              setPlanFilter('ALL')
              setSearch('')
            }}
          />
        ) : (
          <DataGridContainer>
            <DataGrid
              autoHeight
              rows={filteredRows}
              columns={columns}
              disableRowSelectionOnClick
              pageSizeOptions={[5, 10]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              sx={{ bgcolor: 'background.paper' }}
            />
          </DataGridContainer>
        )}
      </Stack>

      <Drawer
        anchor="right"
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 420 }, p: 2.5 } }}
      >
        {selectedSubscription ? (
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Subscription Details
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Shop: {getShopName(selectedSubscription.shopId)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Plan: {getPlanById(selectedSubscription.planId)?.name ?? 'Unknown'}
            </Typography>
            <Box>
              <Chip
                size="small"
                label={selectedSubscription.status}
                color={statusColor[selectedSubscription.status]}
                variant={selectedSubscription.status === 'ACTIVE' ? 'filled' : 'outlined'}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Start: {formatDate(selectedSubscription.startDate)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Expiry: {formatDate(selectedSubscription.expiryDate)} ({daysUntil(selectedSubscription.expiryDate)}d)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Auto Renew: {selectedSubscription.autoRenew ? 'Enabled' : 'Disabled'}
            </Typography>
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Subscription unavailable
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The selected subscription could not be found.
            </Typography>
            <Button variant="outlined" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </Stack>
        )}
      </Drawer>
    </Box>
  )
}

export default ShopSubscriptionsPage
