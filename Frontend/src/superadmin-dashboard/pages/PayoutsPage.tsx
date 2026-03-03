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
import type { PayoutLogEntry, PayoutRequest, PayoutRequestStatus } from '../types/Payout'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const payoutStatusOptions: Array<'ALL' | PayoutRequestStatus> = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED']

const payoutStatusColorMap: Record<PayoutRequestStatus, 'warning' | 'success' | 'error' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'error',
  COMPLETED: 'success',
}

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '—')

type RejectDialogState = {
  open: boolean
  payoutRequestId: string
  reason: string
}

const initialRejectDialogState: RejectDialogState = {
  open: false,
  payoutRequestId: '',
  reason: '',
}

const PayoutsPage = () => {
  const {
    payoutRequests,
    shops,
    cities,
    approvePayout,
    rejectPayout,
    completePayout,
    getLogsForPayout,
    getShopName,
  } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [statusFilter, setStatusFilter] = useState<'ALL' | PayoutRequestStatus>('ALL')
  const [cityFilter, setCityFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null)
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null)
  const [completeTargetId, setCompleteTargetId] = useState<string | null>(null)
  const [rejectDialog, setRejectDialog] = useState<RejectDialogState>(initialRejectDialogState)
  const isInitialLoading = useInitialLoadingDelay()

  const shopMap = useMemo(() => new Map(shops.map((shop) => [shop.id, shop])), [shops])

  const selectedPayout = useMemo(
    () => (selectedPayoutId ? payoutRequests.find((item) => item.id === selectedPayoutId) ?? null : null),
    [payoutRequests, selectedPayoutId],
  )

  const selectedPayoutLogs = useMemo<PayoutLogEntry[]>(
    () => (selectedPayout ? getLogsForPayout(selectedPayout.id) : []),
    [getLogsForPayout, selectedPayout],
  )

  useEffect(() => {
    if (selectedPayoutId && !selectedPayout) {
      showError('Payout request not found')
    }
  }, [selectedPayout, selectedPayoutId, showError])

  const filteredRequests = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return payoutRequests.filter((request) => {
      const shop = shopMap.get(request.shopId)
      const requestCityId = shop?.cityId ?? ''
      const requestShopName = shop?.shopName ?? 'Unknown shop'

      const statusMatch = statusFilter === 'ALL' || request.status === statusFilter
      const cityMatch = cityFilter === 'ALL' || requestCityId === cityFilter
      const searchMatch =
        !searchValue ||
        request.id.toLowerCase().includes(searchValue) ||
        requestShopName.toLowerCase().includes(searchValue)

      return statusMatch && cityMatch && searchMatch
    })
  }, [cityFilter, payoutRequests, search, shopMap, statusFilter])

  const clearFilters = () => {
    setStatusFilter('ALL')
    setCityFilter('ALL')
    setSearch('')
  }

  const handleExportCsv = () => {
    if (filteredRequests.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredRequests.map((request) => ({
      id: request.id,
      shopName: getShopName(request.shopId),
      amount: request.amount,
      status: request.status,
      requestedAt: request.requestedAt,
      processedAt: request.processedAt ?? '',
      rejectReason: request.rejectReason ?? '',
    }))

    const csv = toCsv(rows)
    const isFiltered = statusFilter !== 'ALL' || cityFilter !== 'ALL' || search.trim().length > 0
    const filename = buildCsvFilename('payouts', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const runApprove = (payoutRequestId: string) => {
    const result = approvePayout(payoutRequestId)
    if (!result.ok) {
      showError(result.error ?? 'Could not approve payout request.')
      return
    }

    showSuccess('Payout approved')
    setApproveTargetId(null)
  }

  const runReject = (payoutRequestId: string, reason: string) => {
    const result = rejectPayout(payoutRequestId, reason)
    if (!result.ok) {
      showError(result.error ?? 'Could not reject payout request.')
      return
    }

    showSuccess('Payout rejected')
    setRejectDialog(initialRejectDialogState)
  }

  const runComplete = (payoutRequestId: string) => {
    const result = completePayout(payoutRequestId)
    if (!result.ok) {
      showError(result.error ?? 'Could not mark payout as completed.')
      return
    }

    showSuccess('Payout marked completed')
    setCompleteTargetId(null)
  }

  const columns = useMemo<GridColDef<PayoutRequest>[]>(
    () => [
      { field: 'id', headerName: 'Request ID', minWidth: 150, flex: 0.9 },
      {
        field: 'shopId',
        headerName: 'Shop',
        minWidth: 210,
        flex: 1,
        renderCell: (params: GridRenderCellParams<PayoutRequest>) => (
          <Typography variant="body2">{getShopName(params.row.shopId)}</Typography>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams<PayoutRequest>) => <Typography variant="body2">₹{params.row.amount}</Typography>,
      },
      {
        field: 'status',
        headerName: 'Status',
        minWidth: 140,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<PayoutRequest, PayoutRequestStatus>) => (
          <Chip size="small" label={params.value ?? 'PENDING'} color={payoutStatusColorMap[params.value ?? 'PENDING']} />
        ),
      },
      {
        field: 'requestedAt',
        headerName: 'Requested At',
        minWidth: 190,
        flex: 0.95,
        renderCell: (params: GridRenderCellParams<PayoutRequest>) => <Typography variant="body2">{formatDateTime(params.row.requestedAt)}</Typography>,
      },
      {
        field: 'processedAt',
        headerName: 'Processed At',
        minWidth: 190,
        flex: 0.95,
        renderCell: (params: GridRenderCellParams<PayoutRequest>) => <Typography variant="body2">{formatDateTime(params.row.processedAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 430,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<PayoutRequest>) => {
          const row = params.row

          return (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedPayoutId(row.id)}>
                View
              </Button>
              <Button size="small" variant="outlined" disabled={row.status !== 'PENDING'} onClick={() => setApproveTargetId(row.id)}>
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={row.status !== 'PENDING'}
                onClick={() => setRejectDialog({ open: true, payoutRequestId: row.id, reason: '' })}
              >
                Reject
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="success"
                disabled={row.status !== 'APPROVED'}
                onClick={() => setCompleteTargetId(row.id)}
              >
                Mark Completed
              </Button>
            </Stack>
          )
        },
      },
    ],
    [getShopName],
  )

  const rejectReasonError = rejectDialog.open && !rejectDialog.reason.trim() ? 'Reason is required.' : undefined

  return (
    <>
      <PageHeader
        title="Payout Requests"
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
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | PayoutRequestStatus)}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              {payoutStatusOptions.map((status) => (
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
              sx={{ minWidth: { xs: '100%', md: 200 } }}
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
              placeholder="payout id / shop name"
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
        ) : filteredRequests.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No payout requests match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredRequests}
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

      <Drawer anchor="right" open={Boolean(selectedPayoutId)} onClose={() => setSelectedPayoutId(null)}>
        <Box sx={{ width: { xs: 320, sm: 470 }, p: 2.5 }}>
          {selectedPayout ? (
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {selectedPayout.id}
              </Typography>
              <Chip
                size="small"
                label={selectedPayout.status}
                color={payoutStatusColorMap[selectedPayout.status]}
                sx={{ width: 'fit-content' }}
              />

              <Typography variant="body2">Shop: {getShopName(selectedPayout.shopId)}</Typography>
              <Typography variant="body2">Amount: ₹{selectedPayout.amount}</Typography>
              <Typography variant="body2">Requested At: {formatDateTime(selectedPayout.requestedAt)}</Typography>
              <Typography variant="body2">Processed At: {formatDateTime(selectedPayout.processedAt)}</Typography>
              {selectedPayout.rejectReason ? (
                <Typography variant="body2" color="error.main">
                  Reject Reason: {selectedPayout.rejectReason}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={selectedPayout.status !== 'PENDING'}
                  onClick={() => setApproveTargetId(selectedPayout.id)}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={selectedPayout.status !== 'PENDING'}
                  onClick={() =>
                    setRejectDialog({
                      open: true,
                      payoutRequestId: selectedPayout.id,
                      reason: '',
                    })
                  }
                >
                  Reject
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  disabled={selectedPayout.status !== 'APPROVED'}
                  onClick={() => setCompleteTargetId(selectedPayout.id)}
                >
                  Mark Completed
                </Button>
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, pt: 1 }}>
                Payout Activity
              </Typography>

              {selectedPayoutLogs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No activity logs found.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {[...selectedPayoutLogs].reverse().map((entry) => (
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
                Payout unavailable
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The selected payout request could not be found.
              </Typography>
              <Button variant="outlined" onClick={() => setSelectedPayoutId(null)}>
                Close
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ConfirmDialog
        open={Boolean(approveTargetId)}
        title="Approve payout request?"
        description="This will approve the selected payout request."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        onClose={() => setApproveTargetId(null)}
        onConfirm={() => {
          if (!approveTargetId) {
            return
          }

          runApprove(approveTargetId)
        }}
      />

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog(initialRejectDialogState)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Reject payout request</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
            value={rejectDialog.reason}
            onChange={(event) => setRejectDialog((previous) => ({ ...previous, reason: event.target.value }))}
            fullWidth
            multiline
            minRows={3}
            sx={{ mt: 1 }}
            error={Boolean(rejectReasonError)}
            helperText={rejectReasonError ?? 'Provide a clear rejection reason.'}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialog(initialRejectDialogState)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={Boolean(rejectReasonError)}
            onClick={() => {
              if (!rejectDialog.payoutRequestId) {
                return
              }

              runReject(rejectDialog.payoutRequestId, rejectDialog.reason)
            }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(completeTargetId)}
        title="Mark payout completed?"
        description="This will mark the selected payout request as completed."
        confirmLabel="Mark Completed"
        cancelLabel="Cancel"
        onClose={() => setCompleteTargetId(null)}
        onConfirm={() => {
          if (!completeTargetId) {
            return
          }

          runComplete(completeTargetId)
        }}
      />
    </>
  )
}

export default PayoutsPage
