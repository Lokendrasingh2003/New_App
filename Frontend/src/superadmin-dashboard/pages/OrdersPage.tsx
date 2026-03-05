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
  Divider,
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
import type { Order, OrderStatus, PaymentStatus } from '../types/Order'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const ORDER_STATUSES: Array<'all' | OrderStatus> = [
  'all',
  'pending_payment',
  'confirmed',
  'accepted',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
]

const PAYMENT_STATUSES: Array<'all' | PaymentStatus> = ['all', 'pending', 'success', 'failed', 'refunded']

const orderStatusLabelMap: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const orderStatusColorMap: Record<OrderStatus, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
  pending_payment: 'warning',
  confirmed: 'info',
  accepted: 'info',
  preparing: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'default',
  refunded: 'error',
}

const paymentStatusColorMap: Record<PaymentStatus, 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'warning',
  success: 'success',
  failed: 'error',
  refunded: 'info',
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const OrdersPage = () => {
  const { orders, shops, cities, syncOrders, forceCancelOrder, triggerRefund, getOrderById, getCityName, getShopName } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [cityFilter, setCityFilter] = useState('all')
  const [shopFilter, setShopFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [search, setSearch] = useState('')

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [forceCancelOpen, setForceCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncOrders()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load orders from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncOrders])

  const selectedOrder = useMemo(
    () => (selectedOrderId ? getOrderById(selectedOrderId) ?? null : null),
    [getOrderById, selectedOrderId],
  )

  useEffect(() => {
    if (selectedOrderId && !selectedOrder) {
      showError('Order not found')
    }
  }, [selectedOrder, selectedOrderId, showError])

  const filteredShopOptions = useMemo(() => {
    if (cityFilter === 'all') {
      return shops
    }

    return shops.filter((shop) => shop.cityId === cityFilter)
  }, [cityFilter, shops])

  const filteredOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null
    const toTime = toDate ? new Date(`${toDate}T23:59:59`).getTime() : null

    return orders.filter((order) => {
      const cityMatch = cityFilter === 'all' || order.cityId === cityFilter
      const shopMatch = shopFilter === 'all' || order.shopId === shopFilter
      const statusMatch = statusFilter === 'all' || order.status === statusFilter
      const paymentMatch = paymentFilter === 'all' || order.paymentStatus === paymentFilter

      const searchMatch =
        !searchValue ||
        order.id.toLowerCase().includes(searchValue) ||
        order.userPhone.toLowerCase().includes(searchValue)

      const createdTime = new Date(order.createdAt).getTime()
      const fromMatch = fromTime === null || createdTime >= fromTime
      const toMatch = toTime === null || createdTime <= toTime

      return cityMatch && shopMatch && statusMatch && paymentMatch && searchMatch && fromMatch && toMatch
    })
  }, [cityFilter, fromDate, orders, paymentFilter, search, shopFilter, statusFilter, toDate])

  const refundDisabledReason = useMemo(() => {
    if (!selectedOrder) {
      return 'Select an order to continue.'
    }

    if (selectedOrder.status !== 'cancelled') {
      return 'Refund is enabled only for cancelled orders.'
    }

    if (selectedOrder.paymentStatus !== 'success') {
      return 'Refund is enabled only when payment status is success.'
    }

    return undefined
  }, [selectedOrder])

  const clearFilters = () => {
    setCityFilter('all')
    setShopFilter('all')
    setStatusFilter('all')
    setPaymentFilter('all')
    setFromDate('')
    setToDate('')
    setSearch('')
  }

  const handleExportCsv = () => {
    if (filteredOrders.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredOrders.map((order) => ({
      id: order.id,
      userPhone: order.userPhone,
      cityName: getCityName(order.cityId),
      shopName: getShopName(order.shopId),
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered =
      cityFilter !== 'all' ||
      shopFilter !== 'all' ||
      statusFilter !== 'all' ||
      paymentFilter !== 'all' ||
      fromDate.length > 0 ||
      toDate.length > 0 ||
      search.trim().length > 0
    const filename = buildCsvFilename('orders', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const columns = useMemo<GridColDef<Order>[]>(
    () => [
      { field: 'id', headerName: 'Order ID', minWidth: 130, flex: 0.8 },
      { field: 'userPhone', headerName: 'User Phone', minWidth: 140, flex: 0.9 },
      {
        field: 'cityId',
        headerName: 'City',
        minWidth: 150,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<Order>) => <Typography variant="body2">{getCityName(params.row.cityId)}</Typography>,
      },
      {
        field: 'shopId',
        headerName: 'Shop',
        minWidth: 180,
        flex: 1.1,
        renderCell: (params: GridRenderCellParams<Order>) => <Typography variant="body2">{getShopName(params.row.shopId)}</Typography>,
      },
      {
        field: 'total',
        headerName: 'Total',
        minWidth: 120,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<Order>) => <Typography variant="body2">₹{params.row.total}</Typography>,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 170,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Order, OrderStatus>) => (
          <Chip
            size="small"
            label={orderStatusLabelMap[params.value ?? 'pending_payment']}
            color={orderStatusColorMap[params.value ?? 'pending_payment']}
          />
        ),
      },
      {
        field: 'paymentStatus',
        headerName: 'Payment',
        minWidth: 140,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<Order, PaymentStatus>) => (
          <Chip
            size="small"
            label={params.value ?? 'pending'}
            color={paymentStatusColorMap[params.value ?? 'pending']}
          />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Order>) => (
          <Typography variant="body2">{formatDateTime(params.row.createdAt)}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 120,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Order>) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityRoundedIcon />}
            onClick={() => setSelectedOrderId(params.row.id)}
          >
            View
          </Button>
        ),
      },
    ],
    [getCityName, getShopName],
  )

  return (
    <>
      <PageHeader
        title="Orders"
        actions={
          <Button variant="outlined" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
            <TextField
              select
              label="City"
              value={cityFilter}
              onChange={(event) => {
                setCityFilter(event.target.value)
                setShopFilter('all')
              }}
              sx={{ minWidth: { xs: '100%', md: 170 } }}
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
              label="Shop"
              value={shopFilter}
              onChange={(event) => setShopFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            >
              <MenuItem value="all">All</MenuItem>
              {filteredShopOptions.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.shopName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {ORDER_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'all' ? 'All' : orderStatusLabelMap[status]}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Payment"
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as 'all' | PaymentStatus)}
              sx={{ minWidth: { xs: '100%', md: 170 } }}
            >
              {PAYMENT_STATUSES.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'all' ? 'All' : status}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              label="From"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              type="date"
              label="To"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Search"
              placeholder="orderId / user phone"
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
        ) : filteredOrders.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No orders match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredOrders}
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

      <Drawer anchor="right" open={Boolean(selectedOrderId)} onClose={() => setSelectedOrderId(null)}>
        <Box sx={{ width: { xs: 320, sm: 460 }, p: 2.5 }}>
          {selectedOrder ? (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {selectedOrder.id}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip label={orderStatusLabelMap[selectedOrder.status]} color={orderStatusColorMap[selectedOrder.status]} size="small" />
                  <Chip label={selectedOrder.paymentStatus} color={paymentStatusColorMap[selectedOrder.paymentStatus]} size="small" />
                </Stack>
              </Stack>

              <Typography variant="body2">City: {getCityName(selectedOrder.cityId)}</Typography>
              <Typography variant="body2">Shop: {getShopName(selectedOrder.shopId)}</Typography>
              <Typography variant="body2">User Phone: {selectedOrder.userPhone}</Typography>
              <Typography variant="body2">Total: ₹{selectedOrder.total}</Typography>
              <Typography variant="body2">Created: {formatDateTime(selectedOrder.createdAt)}</Typography>
              <Typography variant="body2">Updated: {formatDateTime(selectedOrder.updatedAt)}</Typography>

              <Divider />

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Status Timeline
                </Typography>
                <Stack spacing={1}>
                  {[...selectedOrder.statusLogs].reverse().map((entry, index) => (
                    <Card key={`${entry.status}-${entry.at}-${index}`} variant="outlined">
                      <CardContent sx={{ py: 1.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {orderStatusLabelMap[entry.status as OrderStatus] ?? entry.status}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTime(entry.at)}
                        </Typography>
                        {entry.note ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {entry.note}
                          </Typography>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Stack>

              <Divider />

              <Stack spacing={1.25}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Actions
                </Typography>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    setCancelReason('')
                    setForceCancelOpen(true)
                  }}
                  disabled={selectedOrder.status === 'delivered' || selectedOrder.status === 'refunded'}
                >
                  Force Cancel
                </Button>

                <Button
                  variant="outlined"
                  onClick={() => setRefundConfirmOpen(true)}
                  disabled={Boolean(refundDisabledReason)}
                >
                  Trigger Refund
                </Button>

                {refundDisabledReason ? (
                  <Typography variant="caption" color="text.secondary">
                    {refundDisabledReason}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Order unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected order could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedOrderId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={forceCancelOpen} onClose={() => setForceCancelOpen(false)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Force Cancel Order</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter a reason for administrative cancellation.
            </Typography>
            <TextField
              label="Reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              multiline
              minRows={3}
              fullWidth
              helperText="Minimum 5 characters"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForceCancelOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={cancelReason.trim().length < 5 || !selectedOrder}
            onClick={async () => {
              if (!selectedOrder) {
                showError('Order not found')
                return
              }

              const result = await forceCancelOrder(selectedOrder.id, cancelReason)
              if (result.ok) {
                showSuccess(`Order ${selectedOrder.id} cancelled`)
                setForceCancelOpen(false)
              } else {
                showError(result.error ?? 'Could not cancel order.')
              }
            }}
          >
            Force Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={refundConfirmOpen}
        title="Trigger refund for this order?"
        description="This action marks payment as refunded and records a refund status log."
        confirmLabel="Trigger Refund"
        cancelLabel="Cancel"
        onClose={() => setRefundConfirmOpen(false)}
        onConfirm={async () => {
          if (!selectedOrder) {
            showError('Order not found')
            setRefundConfirmOpen(false)
            return
          }

          const result = await triggerRefund(selectedOrder.id)
          if (result.ok) {
            showSuccess(`Refund triggered for ${selectedOrder.id}`)
          } else {
            showError(result.error ?? 'Could not trigger refund.')
          }

          setRefundConfirmOpen(false)
        }}
      />
    </>
  )
}

export default OrdersPage
