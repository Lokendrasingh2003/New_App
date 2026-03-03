import { Alert, Box, Button, Chip, Container, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { getShopkeeperId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import { paymentService, type PaymentItem, type PaymentStats } from '../services/paymentService'

const initialStats: PaymentStats = {
  totalPayments: 0,
  successfulPayments: 0,
  failedPayments: 0,
  pendingPayments: 0,
  totalAmount: 0,
  totalCommission: 0,
  netEarnings: 0,
  successRate: 0,
}

const PaymentsPage = () => {
  const navigate = useNavigate()
  const shopkeeperId = getShopkeeperId()
  const { showError, showSuccess } = useAppFeedback()
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [stats, setStats] = useState<PaymentStats>(initialStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback(async () => {
    if (!shopkeeperId) {
      setError('Shopkeeper not found for current session.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const [list, statsData] = await Promise.all([
        paymentService.getPayments(shopkeeperId, {
          status: status || undefined,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
        paymentService.getPaymentStats(shopkeeperId),
      ])
      setPayments(list.payments || [])
      setTotal(list.pagination?.total || 0)
      setStats(statsData)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load payments.'
      setError(message)
      showError(message)
    } finally {
      setLoading(false)
    }
  }, [shopkeeperId, status, search, dateFrom, dateTo, page, pageSize, showError])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleBulkUpdate = async (nextStatus: 'SUCCESS' | 'FAILED' | 'PENDING') => {
    if (!shopkeeperId || !selectedIds.length) {
      return
    }

    try {
      await paymentService.bulkStatusUpdate(
        shopkeeperId,
        selectedIds,
        nextStatus
      )
      showSuccess('Payment statuses updated')
      setSelectedIds([])
      await fetchData()
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Unable to update statuses.')
    }
  }

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'transactionId',
        headerName: 'Transaction ID',
        width: 170,
        renderCell: (params: GridRenderCellParams) => <Chip label={String(params.value || 'N/A')} size="small" />,
      },
      {
        field: 'orderId',
        headerName: 'Order',
        width: 120,
        renderCell: (params: GridRenderCellParams) => `#${String(params.row.orderId || '').slice(-8)}`,
      },
      {
        field: 'customerName',
        headerName: 'Customer',
        width: 160,
        valueGetter: (_value, row) => row.userId?.name || row.userId?.phone || 'Unknown',
      },
      {
        field: 'amount',
        headerName: 'Amount',
        width: 120,
        renderCell: (params: GridRenderCellParams) => `₹${Number(params.value || 0).toFixed(2)}`,
      },
      {
        field: 'commission',
        headerName: 'Commission (3%)',
        width: 150,
        renderCell: (params: GridRenderCellParams) => (
          <Typography color="error">₹{Number(params.row.commission?.amount || 0).toFixed(2)}</Typography>
        ),
      },
      {
        field: 'netAmount',
        headerName: 'Net Amount',
        width: 130,
        renderCell: (params: GridRenderCellParams) => (
          <Typography sx={{ fontWeight: 700 }}>₹{Number(params.row.commission?.payableAmount || 0).toFixed(2)}</Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (params: GridRenderCellParams) => {
          const colors: Record<string, 'success' | 'warning' | 'error'> = {
            SUCCESS: 'success',
            PENDING: 'warning',
            FAILED: 'error',
          }
          return <Chip label={String(params.value)} color={colors[String(params.value)] || 'warning'} size="small" />
        },
      },
      {
        field: 'processedAt',
        headerName: 'Date',
        width: 160,
        renderCell: (params: GridRenderCellParams) =>
          new Date(params.row.processedAt || params.row.createdAt).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 110,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Button size="small" onClick={() => navigate(`/shop/payments/${params.row._id}`)}>
            View
          </Button>
        ),
      },
    ],
    [navigate]
  )

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2}>
        <PageHeader title="Payments" subtitle="Track and manage payment transactions" />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField label="Search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} />
          <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="SUCCESS">Success</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0) }} />
          <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0) }} />
          <Button variant="outlined" onClick={() => void fetchData()}>Refresh</Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Total Amount" value={`₹${stats.totalAmount.toFixed(2)}`} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Successful Payments" value={stats.successfulPayments} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Failed Payments" value={stats.failedPayments} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Success Rate" value={`${stats.successRate.toFixed(2)}%`} /></Grid>
        </Grid>

        <Stack direction="row" spacing={1.25}>
          <Button variant="outlined" disabled={!selectedIds.length} onClick={() => void handleBulkUpdate('SUCCESS')}>Mark Success</Button>
          <Button variant="outlined" color="error" disabled={!selectedIds.length} onClick={() => void handleBulkUpdate('FAILED')}>Mark Failed</Button>
        </Stack>

        <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.08)', p: 1 }}>
          <DataGrid
            autoHeight
            rows={payments}
            columns={columns}
            getRowId={(row) => row._id}
            rowCount={total}
            loading={loading}
            checkboxSelection
            paginationMode="server"
            pageSizeOptions={[10, 20, 50]}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page)
              setPageSize(model.pageSize)
            }}
            onRowSelectionModelChange={(model) => {
              const nextIds = Array.isArray(model)
                ? model.map((id) => String(id))
                : Array.from(model.ids || []).map((id) => String(id))
              setSelectedIds(nextIds)
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Stack>
    </Container>
  )
}

export default PaymentsPage
