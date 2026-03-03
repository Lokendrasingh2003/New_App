import { Alert, Box, Button, Chip, Container, Grid, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RefundCreateDialog, { type RefundCreatePaymentOption } from '../components/RefundCreateDialog'
import RefundProcessDialog from '../components/RefundProcessDialog'
import StatCard from '../components/StatCard'
import { paymentService } from '../services/paymentService'
import { refundService, type RefundItem, type RefundStats } from '../services/refundService'
import { getShopkeeperId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const defaultStats: RefundStats = {
  totalRefunds: 0,
  requestedRefunds: 0,
  processingRefunds: 0,
  completedRefunds: 0,
  failedRefunds: 0,
  totalRefundAmount: 0,
  averageProcessingTime: 0,
}

const RefundsPage = () => {
  const navigate = useNavigate()
  const shopkeeperId = getShopkeeperId()
  const { showError, showSuccess } = useAppFeedback()
  const [refunds, setRefunds] = useState<RefundItem[]>([])
  const [stats, setStats] = useState<RefundStats>(defaultStats)
  const [paymentOptions, setPaymentOptions] = useState<RefundCreatePaymentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [processRefundId, setProcessRefundId] = useState<string | null>(null)

  const loadRefunds = useCallback(async () => {
    if (!shopkeeperId) {
      setError('Shopkeeper not found for current session.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const [list, statsData, paymentsList] = await Promise.all([
        refundService.getRefunds(shopkeeperId, {
          status: status || undefined,
          search: search || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: pageSize,
          offset: page * pageSize,
        }),
        refundService.getRefundStats(shopkeeperId),
        paymentService.getPayments(shopkeeperId, {
          status: 'SUCCESS',
          limit: 100,
          offset: 0,
        }),
      ])
      setRefunds(list.refunds || [])
      setTotal(list.pagination?.total || 0)
      setStats(statsData)
      setPaymentOptions(
        (paymentsList.payments || []).map((item) => ({
          paymentId: item._id,
          orderId: item.orderId,
          transactionId: item.transactionId,
          amount: item.amount,
          paymentMode: item.paymentMode,
        }))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load refunds.'
      setError(message)
      showError(message)
    } finally {
      setLoading(false)
    }
  }, [shopkeeperId, status, search, dateFrom, dateTo, page, pageSize, showError])

  useEffect(() => {
    void loadRefunds()
  }, [loadRefunds])

  const selectedRefund = useMemo(
    () => (processRefundId ? refunds.find((item) => item._id === processRefundId) || null : null),
    [refunds, processRefundId]
  )

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'refundId',
        headerName: 'Refund ID',
        width: 130,
        renderCell: (params: GridRenderCellParams) => `#${String(params.row._id).slice(-6)}`,
      },
      {
        field: 'orderId',
        headerName: 'Order',
        width: 120,
        renderCell: (params: GridRenderCellParams) => `#${String(params.row.orderId).slice(-8)}`,
      },
      {
        field: 'paymentId',
        headerName: 'Payment',
        width: 130,
        renderCell: (params: GridRenderCellParams) => <Chip label={String(params.row.paymentId).slice(-8)} size="small" variant="outlined" />,
      },
      {
        field: 'customerName',
        headerName: 'Customer',
        width: 150,
        valueGetter: (_value, row) => row.userId?.name || row.userId?.phone || 'Unknown',
      },
      {
        field: 'refundAmount',
        headerName: 'Amount',
        width: 120,
        renderCell: (params: GridRenderCellParams) => <Typography color="error">₹{Number(params.value || 0).toFixed(2)}</Typography>,
      },
      {
        field: 'reason',
        headerName: 'Reason',
        width: 220,
        renderCell: (params: GridRenderCellParams) => {
          const value = String(params.value || '')
          const truncated = value.length > 32 ? `${value.slice(0, 32)}...` : value
          return (
            <Tooltip title={value}>
              <Typography variant="body2">{truncated}</Typography>
            </Tooltip>
          )
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        renderCell: (params: GridRenderCellParams) => {
          const colors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
            COMPLETED: 'success',
            PROCESSING: 'info',
            REQUESTED: 'warning',
            FAILED: 'error',
          }
          return <Chip label={String(params.value)} color={colors[String(params.value)] || 'warning'} size="small" />
        },
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 160,
        renderCell: (params: GridRenderCellParams) => new Date(params.value as string).toLocaleDateString(),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 180,
        sortable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => navigate(`/shop/refunds/${params.row._id}`)}>
              View
            </Button>
            {params.row.status === 'REQUESTED' ? (
              <Button size="small" color="warning" onClick={() => setProcessRefundId(params.row._id)}>
                Process
              </Button>
            ) : null}
          </Stack>
        ),
      },
    ],
    [navigate]
  )

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2}>
        <PageHeader
          title="Refunds"
          subtitle="Manage refund requests and status progression"
          actions={[{ label: 'New Refund', onClick: () => setCreateOpen(true), variant: 'contained' }]}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField label="Search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0) }} />
          <TextField select label="Status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0) }} sx={{ minWidth: 160 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="REQUESTED">Requested</MenuItem>
            <MenuItem value="PROCESSING">Processing</MenuItem>
            <MenuItem value="COMPLETED">Completed</MenuItem>
            <MenuItem value="FAILED">Failed</MenuItem>
          </TextField>
          <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(0) }} />
          <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(0) }} />
          <Button variant="outlined" onClick={() => void loadRefunds()}>Refresh</Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Total Refunds" value={stats.totalRefunds} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Pending Refunds" value={stats.requestedRefunds + stats.processingRefunds} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Completed Refunds" value={stats.completedRefunds} /></Grid>
          <Grid size={{ xs: 12, md: 3 }}><StatCard title="Total Refund Amount" value={`₹${stats.totalRefundAmount.toFixed(2)}`} /></Grid>
        </Grid>

        <Box sx={{ backgroundColor: 'background.paper', borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.08)', p: 1 }}>
          <DataGrid
            autoHeight
            rows={refunds}
            columns={columns}
            getRowId={(row) => row._id}
            rowCount={total}
            loading={loading}
            paginationMode="server"
            pageSizeOptions={[10, 20, 50]}
            paginationModel={{ page, pageSize }}
            onPaginationModelChange={(model) => {
              setPage(model.page)
              setPageSize(model.pageSize)
            }}
            disableRowSelectionOnClick
          />
        </Box>
      </Stack>

      {shopkeeperId ? (
        <RefundCreateDialog
          open={createOpen}
          shopkeeperId={shopkeeperId}
          paymentOptions={paymentOptions}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            showSuccess('Refund request created')
            void loadRefunds()
          }}
        />
      ) : null}

      {shopkeeperId && selectedRefund ? (
        <RefundProcessDialog
          open={Boolean(processRefundId)}
          shopkeeperId={shopkeeperId}
          refundId={selectedRefund._id}
          refundAmount={Number(selectedRefund.refundAmount || 0)}
          onClose={() => setProcessRefundId(null)}
          onProcessed={() => {
            showSuccess('Refund moved to processing')
            void loadRefunds()
          }}
        />
      ) : null}
    </Container>
  )
}

export default RefundsPage
