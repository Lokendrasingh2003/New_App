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
import type { CreateRefundInput } from '../store/types.ts'
import type { RefundLogEntry, RefundRecord, RefundStatus } from '../types/Refund'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const refundStatusOptions: Array<'ALL' | RefundStatus> = ['ALL', 'REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED']

const refundStatusColorMap: Record<RefundStatus, 'warning' | 'info' | 'success' | 'error'> = {
  REQUESTED: 'warning',
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

type CreateDialogState = {
  open: boolean
  orderId: string
  paymentId: string
  reason: string
  amount: string
}

type FailDialogState = {
  open: boolean
  refundId: string
  note: string
}

const initialCreateDialogState: CreateDialogState = {
  open: false,
  orderId: '',
  paymentId: '',
  reason: '',
  amount: '',
}

const initialFailDialogState: FailDialogState = {
  open: false,
  refundId: '',
  note: '',
}

const RefundsPage = () => {
  const {
    refunds,
    orders,
    payments,
    cities,
    syncRefunds,
    createRefund,
    setRefundProcessing,
    completeRefund,
    failRefund,
    getRefundById,
    getLogsForRefund,
    getCityName,
    getShopName,
  } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [statusFilter, setStatusFilter] = useState<'ALL' | RefundStatus>('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialogState>(initialCreateDialogState)
  const [processingConfirmId, setProcessingConfirmId] = useState<string | null>(null)
  const [completeConfirmId, setCompleteConfirmId] = useState<string | null>(null)
  const [failDialog, setFailDialog] = useState<FailDialogState>(initialFailDialogState)
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncRefunds()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load refunds from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncRefunds])

  const orderMap = useMemo(() => new Map(orders.map((item) => [item.id, item])), [orders])
  const paymentMap = useMemo(() => new Map(payments.map((item) => [item.id, item])), [payments])

  const selectedRefund = useMemo(
    () => (selectedRefundId ? getRefundById(selectedRefundId) ?? null : null),
    [getRefundById, selectedRefundId],
  )

  const selectedRefundLogs = useMemo<RefundLogEntry[]>(
    () => (selectedRefund ? getLogsForRefund(selectedRefund.id) : []),
    [getLogsForRefund, selectedRefund],
  )

  const matchedOrder = useMemo(() => {
    if (!createDialog.orderId.trim()) {
      return undefined
    }

    return orderMap.get(createDialog.orderId.trim())
  }, [createDialog.orderId, orderMap])

  const matchedPayment = useMemo(() => {
    if (!createDialog.paymentId.trim()) {
      return undefined
    }

    return paymentMap.get(createDialog.paymentId.trim())
  }, [createDialog.paymentId, paymentMap])

  const previewAmount = matchedPayment?.amount ?? matchedOrder?.total
  const previewCityId = matchedOrder?.cityId ?? matchedPayment?.cityId
  const previewShopId = matchedOrder?.shopId ?? matchedPayment?.shopId

  const filteredRefunds = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return refunds.filter((refund) => {
      const order = orderMap.get(refund.orderId)
      const payment = paymentMap.get(refund.paymentId)

      const statusMatch = statusFilter === 'ALL' || refund.status === statusFilter
      const cityMatch = cityFilter === 'ALL' || refund.cityId === cityFilter

      const searchMatch =
        !searchValue ||
        refund.id.toLowerCase().includes(searchValue) ||
        refund.orderId.toLowerCase().includes(searchValue) ||
        refund.paymentId.toLowerCase().includes(searchValue) ||
        order?.userPhone?.toLowerCase().includes(searchValue) ||
        payment?.userPhone?.toLowerCase().includes(searchValue)

      return statusMatch && cityMatch && searchMatch
    })
  }, [cityFilter, orderMap, paymentMap, refunds, search, statusFilter])

  const clearFilters = () => {
    setStatusFilter('ALL')
    setCityFilter('ALL')
    setSearch('')
  }

  const handleExportCsv = () => {
    if (filteredRefunds.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredRefunds.map((refund) => ({
      id: refund.id,
      orderId: refund.orderId,
      paymentId: refund.paymentId,
      amount: refund.amount,
      status: refund.status,
      reason: refund.reason,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered = statusFilter !== 'ALL' || cityFilter !== 'ALL' || search.trim().length > 0
    const filename = buildCsvFilename('refunds', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const createValidationError = useMemo(() => {
    const orderId = createDialog.orderId.trim()
    const paymentId = createDialog.paymentId.trim()
    const reason = createDialog.reason.trim()

    if (!orderId) {
      return 'Order ID is required.'
    }

    if (!paymentId) {
      return 'Payment ID is required.'
    }

    if (reason.length < 5) {
      return 'Reason must be at least 5 characters.'
    }

    if (!matchedOrder && !matchedPayment) {
      const amountValue = Number(createDialog.amount)
      if (!Number.isFinite(amountValue) || Number.isNaN(amountValue) || amountValue <= 0) {
        return 'Amount is required when order/payment match is not found.'
      }
    }

    return undefined
  }, [createDialog.amount, createDialog.orderId, createDialog.paymentId, createDialog.reason, matchedOrder, matchedPayment])

  const failValidationError = useMemo(() => {
    if (!failDialog.open) {
      return undefined
    }

    const note = failDialog.note.trim()
    if (!note) {
      return 'Failure note is required.'
    }

    return undefined
  }, [failDialog.note, failDialog.open])

  const runCreateRefund = async () => {
    const payload: CreateRefundInput = {
      orderId: createDialog.orderId.trim(),
      paymentId: createDialog.paymentId.trim(),
      reason: createDialog.reason.trim(),
      amount: createDialog.amount.trim() ? Number(createDialog.amount) : undefined,
    }

    const result = await createRefund(payload)
    if (!result.ok) {
      showError(result.error ?? 'Could not create refund.')
      return
    }

    showSuccess('Refund created')
    setCreateDialog(initialCreateDialogState)
  }

  const columns = useMemo<GridColDef<RefundRecord>[]>(
    () => [
      { field: 'id', headerName: 'Refund ID', minWidth: 150, flex: 0.9 },
      { field: 'orderId', headerName: 'Order ID', minWidth: 140, flex: 0.8 },
      { field: 'paymentId', headerName: 'Payment ID', minWidth: 140, flex: 0.8 },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams<RefundRecord>) => <Typography variant="body2">₹{params.row.amount}</Typography>,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<RefundRecord, RefundStatus>) => (
          <Chip size="small" label={params.value ?? 'REQUESTED'} color={refundStatusColorMap[params.value ?? 'REQUESTED']} />
        ),
      },
      {
        field: 'cityId',
        headerName: 'City',
        minWidth: 140,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<RefundRecord>) => <Typography variant="body2">{getCityName(params.row.cityId)}</Typography>,
      },
      {
        field: 'shopId',
        headerName: 'Shop',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<RefundRecord>) => <Typography variant="body2">{getShopName(params.row.shopId)}</Typography>,
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 0.95,
        renderCell: (params: GridRenderCellParams<RefundRecord>) => <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 110,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<RefundRecord>) => (
          <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedRefundId(params.row.id)}>
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
        title="Refunds"
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={() => setCreateDialog((previous) => ({ ...previous, open: true }))}>
              Create Refund
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
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | RefundStatus)}
              sx={{ minWidth: { xs: '100%', md: 200 } }}
            >
              {refundStatusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status === 'ALL' ? 'All' : status}
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
              placeholder="refundId / orderId / paymentId / userPhone"
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
        ) : filteredRefunds.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No refunds match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredRefunds}
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

      <Dialog
        open={createDialog.open}
        onClose={() => setCreateDialog(initialCreateDialogState)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Refund</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <TextField
              label="Order ID"
              value={createDialog.orderId}
              onChange={(event) => setCreateDialog((previous) => ({ ...previous, orderId: event.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Payment ID"
              value={createDialog.paymentId}
              onChange={(event) => setCreateDialog((previous) => ({ ...previous, paymentId: event.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Reason"
              value={createDialog.reason}
              onChange={(event) => setCreateDialog((previous) => ({ ...previous, reason: event.target.value }))}
              fullWidth
              multiline
              minRows={3}
              required
            />
            <TextField
              label="Manual Amount (optional)"
              value={createDialog.amount}
              onChange={(event) => setCreateDialog((previous) => ({ ...previous, amount: event.target.value }))}
              type="number"
              fullWidth
              helperText="Use only when order/payment mapping is missing."
            />

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Auto-fill Preview
                  </Typography>
                  <Typography variant="body2">Amount: {previewAmount ? `₹${previewAmount}` : 'Not found'}</Typography>
                  <Typography variant="body2">City: {previewCityId ? getCityName(previewCityId) : 'Not found'}</Typography>
                  <Typography variant="body2">Shop: {previewShopId ? getShopName(previewShopId) : 'Not found'}</Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(initialCreateDialogState)}>Cancel</Button>
          <Button variant="contained" disabled={Boolean(createValidationError)} onClick={async () => await runCreateRefund()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={Boolean(selectedRefundId)} onClose={() => setSelectedRefundId(null)}>
        <Box sx={{ width: { xs: 320, sm: 470 }, p: 2.5 }}>
          {selectedRefund ? (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedRefund.id}
              </Typography>

              <Chip
                size="small"
                label={selectedRefund.status}
                color={refundStatusColorMap[selectedRefund.status]}
                sx={{ width: 'fit-content' }}
              />

              <Typography variant="body2">Reason: {selectedRefund.reason}</Typography>
              <Typography variant="body2">Amount: ₹{selectedRefund.amount}</Typography>
              <Typography variant="body2">Order ID: {selectedRefund.orderId}</Typography>
              <Typography variant="body2">Payment ID: {selectedRefund.paymentId}</Typography>
              <Typography variant="body2">City: {getCityName(selectedRefund.cityId)}</Typography>
              <Typography variant="body2">Shop: {getShopName(selectedRefund.shopId)}</Typography>
              <Typography variant="body2">Created: {formatDateTime(selectedRefund.createdAt)}</Typography>
              <Typography variant="body2">Updated: {formatDateTime(selectedRefund.updatedAt)}</Typography>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedRefund.status !== 'REQUESTED'}
                  onClick={() => setProcessingConfirmId(selectedRefund.id)}
                >
                  Move to Processing
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  disabled={selectedRefund.status !== 'PROCESSING'}
                  onClick={() => setCompleteConfirmId(selectedRefund.id)}
                >
                  Complete
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={selectedRefund.status !== 'PROCESSING'}
                  onClick={() => setFailDialog({ open: true, refundId: selectedRefund.id, note: '' })}
                >
                  Mark Failed
                </Button>
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 1 }}>
                Activity Timeline
              </Typography>

              {selectedRefundLogs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No logs found.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {[...selectedRefundLogs].reverse().map((entry) => (
                    <Card key={entry.id} variant="outlined">
                      <CardContent sx={{ py: 1.25 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {entry.action}
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
              )}
            </Stack>
          ) : (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Refund unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected refund could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedRefundId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(processingConfirmId)}
        title="Move refund to processing?"
        description="This will mark the refund as processing."
        confirmLabel="Move"
        cancelLabel="Cancel"
        onClose={() => setProcessingConfirmId(null)}
        onConfirm={async () => {
          if (!processingConfirmId) {
            return
          }

          const result = await setRefundProcessing(processingConfirmId)
          if (!result.ok) {
            showError(result.error ?? 'Could not move refund to processing.')
            return
          }

          showSuccess('Refund moved to processing')
          setProcessingConfirmId(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(completeConfirmId)}
        title="Complete refund?"
        description="This will mark the refund as completed."
        confirmLabel="Complete"
        cancelLabel="Cancel"
        onClose={() => setCompleteConfirmId(null)}
        onConfirm={async () => {
          if (!completeConfirmId) {
            return
          }

          const result = await completeRefund(completeConfirmId)
          if (!result.ok) {
            showError(result.error ?? 'Could not complete refund.')
            return
          }

          showSuccess('Refund completed')
          setCompleteConfirmId(null)
        }}
      />

      <Dialog open={failDialog.open} onClose={() => setFailDialog(initialFailDialogState)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Mark refund failed</DialogTitle>
        <DialogContent>
          <TextField
            label="Failure note"
            value={failDialog.note}
            onChange={(event) => setFailDialog((previous) => ({ ...previous, note: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            error={Boolean(failValidationError)}
            helperText={failValidationError ?? 'Provide failure details.'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFailDialog(initialFailDialogState)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={Boolean(failValidationError)}
            onClick={async () => {
              if (!failDialog.refundId) {
                return
              }

              const result = await failRefund(failDialog.refundId, failDialog.note)
              if (!result.ok) {
                showError(result.error ?? 'Could not mark refund failed.')
                return
              }

              showSuccess('Refund marked failed')
              setFailDialog(initialFailDialogState)
            }}
          >
            Mark Failed
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default RefundsPage
