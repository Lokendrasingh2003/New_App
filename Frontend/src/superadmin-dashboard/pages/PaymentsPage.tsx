import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
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
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { Payment, PaymentMethod, PaymentStatus } from '../types/Payment'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const paymentStatusOptions: Array<'ALL' | PaymentStatus> = ['ALL', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']
const paymentMethodOptions: Array<'ALL' | PaymentMethod> = ['ALL', 'UPI', 'CARD', 'NETBANKING', 'WALLET']

const paymentStatusColorMap: Record<PaymentStatus, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'error',
  REFUNDED: 'info',
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const canRetryStatus = (status: PaymentStatus) => status === 'PENDING' || status === 'FAILED'

const PaymentsPage = () => {
  const { payments, cities, syncPayments, retryVerifyPayment, getPaymentById, getCityName, getShopName } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL')
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [retryTargetId, setRetryTargetId] = useState<string | null>(null)
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncPayments()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load payments from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncPayments])

  const selectedPayment = useMemo(
    () => (selectedPaymentId ? getPaymentById(selectedPaymentId) ?? null : null),
    [getPaymentById, selectedPaymentId],
  )

  useEffect(() => {
    if (selectedPaymentId && !selectedPayment) {
      showError('Payment not found')
    }
  }, [selectedPayment, selectedPaymentId, showError])

  const filteredPayments = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return payments.filter((payment) => {
      const statusMatch = statusFilter === 'ALL' || payment.status === statusFilter
      const methodMatch = methodFilter === 'ALL' || payment.method === methodFilter
      const cityMatch = cityFilter === 'ALL' || payment.cityId === cityFilter

      const searchMatch =
        !searchValue ||
        payment.id.toLowerCase().includes(searchValue) ||
        payment.orderId.toLowerCase().includes(searchValue) ||
        payment.userPhone.toLowerCase().includes(searchValue) ||
        payment.gatewayTransactionId.toLowerCase().includes(searchValue)

      return statusMatch && methodMatch && cityMatch && searchMatch
    })
  }, [cityFilter, methodFilter, payments, search, statusFilter])

  const clearFilters = () => {
    setStatusFilter('ALL')
    setMethodFilter('ALL')
    setCityFilter('ALL')
    setSearch('')
  }

  const handleExportCsv = () => {
    if (filteredPayments.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredPayments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      userPhone: payment.userPhone,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      gatewayTransactionId: payment.gatewayTransactionId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      failureReason: payment.failureReason ?? '',
    }))

    const csv = toCsv(rows)
    const isFiltered =
      statusFilter !== 'ALL' || methodFilter !== 'ALL' || cityFilter !== 'ALL' || search.trim().length > 0
    const filename = buildCsvFilename('payments', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const columns = useMemo<GridColDef<Payment>[]>(
    () => [
      { field: 'id', headerName: 'Payment ID', minWidth: 150, flex: 0.9 },
      { field: 'orderId', headerName: 'Order ID', minWidth: 140, flex: 0.9 },
      { field: 'userPhone', headerName: 'User Phone', minWidth: 140, flex: 0.9 },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 120,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<Payment>) => <Typography variant="body2">₹{params.row.amount}</Typography>,
      },
      {
        field: 'method',
        headerName: 'Method',
        minWidth: 130,
        flex: 0.8,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 130,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<Payment, PaymentStatus>) => (
          <Chip size="small" label={params.value ?? 'PENDING'} color={paymentStatusColorMap[params.value ?? 'PENDING']} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<Payment>) => <Typography variant="body2">{formatDateTime(params.row.createdAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 250,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<Payment>) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedPaymentId(params.row.id)}>
              View
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ReplayRoundedIcon />}
              disabled={!canRetryStatus(params.row.status)}
              onClick={() => setRetryTargetId(params.row.id)}
            >
              Retry Verify
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  const handleRetryVerify = async (paymentId: string) => {
    const result = await retryVerifyPayment(paymentId)
    if (!result.ok) {
      showError(result.error ?? 'Could not retry verification.')
      return
    }

    showSuccess('Verification retried')
    setRetryTargetId(null)
  }

  return (
    <>
      <PageHeader
        title="Payments"
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
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | PaymentStatus)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {paymentStatusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All' : status}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Method"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as 'ALL' | PaymentMethod)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {paymentMethodOptions.map((method) => (
                <MenuItem key={method} value={method}>
                  {method === 'ALL' ? 'All' : method}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="City"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 190 } }}
            >
              <MenuItem value="ALL">All</MenuItem>
              {cities.map((city) => (
                <MenuItem key={city.id} value={city.id}>
                  {city.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search"
              placeholder="paymentId / orderId / phone / gatewayTxn"
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
        ) : filteredPayments.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No payments match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredPayments}
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

      <Drawer anchor="right" open={Boolean(selectedPaymentId)} onClose={() => setSelectedPaymentId(null)}>
        <Box sx={{ width: { xs: 320, sm: 460 }, p: 2.5 }}>
          {selectedPayment ? (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedPayment.id}
              </Typography>
              <Chip size="small" label={selectedPayment.status} color={paymentStatusColorMap[selectedPayment.status]} sx={{ width: 'fit-content' }} />

              <Typography variant="body2">Amount: ₹{selectedPayment.amount}</Typography>
              <Typography variant="body2">Method: {selectedPayment.method}</Typography>
              <Typography variant="body2">Gateway Txn ID: {selectedPayment.gatewayTransactionId}</Typography>
              <Typography variant="body2">Order ID: {selectedPayment.orderId}</Typography>
              <Typography variant="body2">Shop: {getShopName(selectedPayment.shopId)}</Typography>
              <Typography variant="body2">City: {getCityName(selectedPayment.cityId)}</Typography>
              <Typography variant="body2">User Phone: {selectedPayment.userPhone}</Typography>
              <Typography variant="body2">Created: {formatDateTime(selectedPayment.createdAt)}</Typography>
              <Typography variant="body2">Updated: {formatDateTime(selectedPayment.updatedAt)}</Typography>
              {selectedPayment.failureReason ? (
                <Typography variant="body2" color="error.main">
                  Failure Reason: {selectedPayment.failureReason}
                </Typography>
              ) : null}

              <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<ReplayRoundedIcon />}
                  disabled={!canRetryStatus(selectedPayment.status)}
                  onClick={() => setRetryTargetId(selectedPayment.id)}
                >
                  Retry Verify
                </Button>
              </Stack>
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Payment unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected payment could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedPaymentId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(retryTargetId)}
        title="Retry verification?"
        description="This will retry payment verification via admin API."
        confirmLabel="Retry"
        cancelLabel="Cancel"
        onClose={() => setRetryTargetId(null)}
        onConfirm={async () => {
          if (!retryTargetId) {
            return
          }

          await handleRetryVerify(retryTargetId)
        }}
      />
    </>
  )
}

export default PaymentsPage
