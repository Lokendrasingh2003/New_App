import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
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
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import type { OrderStatus } from '../types/order'

type StatusFilter = 'ALL' | OrderStatus
const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
]

const OrdersListPage = () => {
  const navigate = useNavigate()
  const { orders, cancelOrder, updateOrderStatus } = useShopkeeperStore()
  const { showMessage } = useAppFeedback()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [confirmCancel, setConfirmCancel] = useState<{ id: string; shortId: string; reason: string } | null>(null)
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false)
    }, 380)

    return () => window.clearTimeout(timer)
  }, [])

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const keyword = searchQuery.trim().toLowerCase()
        const matchesSearch =
          order.shortId.toLowerCase().includes(keyword) || order.customerName.toLowerCase().includes(keyword)
        const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
        return matchesSearch && matchesStatus
      }),
    [orders, searchQuery, statusFilter],
  )

  const columns: GridColDef[] = [
    { field: 'shortId', headerName: 'Order', flex: 0.75, minWidth: 90 },
    { field: 'customerName', headerName: 'Customer', flex: 1.2, minWidth: 150 },
    {
      field: 'total',
      headerName: 'Total',
      flex: 0.7,
      minWidth: 100,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params: GridRenderCellParams) => `₹${params.row.total}`,
    },
    {
      field: 'paymentMode',
      headerName: 'Payment',
      flex: 0.7,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.95,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => <StatusChip status={params.row.status} />,
    },
    {
      field: 'manageStatus',
      headerName: 'Manage Status',
      flex: 1.05,
      minWidth: 170,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Select
          size="small"
          fullWidth
          value={params.row.status}
          onChange={(event) => {
            const nextStatus = event.target.value as OrderStatus
            if (nextStatus === params.row.status) {
              return
            }

            updateOrderStatus(params.row.id, nextStatus)
            showMessage(`Order ${params.row.shortId} status updated to ${nextStatus}`)
          }}
          sx={{ minWidth: 150 }}
        >
          {ORDER_STATUS_OPTIONS.map((status) => (
            <MenuItem key={status} value={status}>
              {status}
            </MenuItem>
          ))}
        </Select>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Placed At',
      flex: 0.95,
      minWidth: 140,
      valueFormatter: (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      sortable: false,
      minWidth: 130,
      flex: 0.85,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Quick View">
            <IconButton size="small" onClick={() => setViewOrderId(params.row.id)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Open Details">
            <IconButton size="small" onClick={() => navigate(`/shop/orders/${params.row.id}`)}>
              <VisibilityOutlinedIcon fontSize="small" color="primary" />
            </IconButton>
          </Tooltip>
          {params.row.status !== 'CANCELLED' && params.row.status !== 'DELIVERED' && (
            <Tooltip title="Cancel Order">
              <IconButton
                size="small"
                color="error"
                onClick={() => setConfirmCancel({ id: params.row.id, shortId: params.row.shortId, reason: '' })}
              >
                <CancelOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      ),
    },
  ]

  const viewOrder = viewOrderId ? orders.find((order) => order.id === viewOrderId) : null
  const activeOrdersCount = orders.filter((order) => order.status !== 'DELIVERED' && order.status !== 'CANCELLED').length
  const codOrdersCount = filteredOrders.filter((order) => order.paymentMode === 'COD').length

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Orders"
          subtitle="Manage and track all shop orders"
          actions={[
            {
              label: 'Refresh',
              onClick: () => showMessage('Orders refreshed'),
              variant: 'outlined',
            },
          ]}
        />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Total Orders</Typography>
            <Typography variant="h6">{orders.length}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Active Orders</Typography>
            <Typography variant="h6">{activeOrdersCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Filtered Results</Typography>
            <Typography variant="h6">{filteredOrders.length}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">COD in Filter</Typography>
            <Typography variant="h6">{codOrdersCount}</Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 2,
            borderRadius: 2.5,
            border: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.25, color: 'text.secondary', fontWeight: 700 }}>
            FILTERS
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
            <TextField
              placeholder="Search by order ID or customer name..."
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
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="NEW">New</MenuItem>
                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                <MenuItem value="PREPARING">Preparing</MenuItem>
                <MenuItem value="READY">Ready</MenuItem>
                <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                <MenuItem value="DELIVERED">Delivered</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
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
        ) : filteredOrders.length === 0 ? (
          <EmptyStateCard
            title="No results found"
            description="Try changing filters or search."
            actionLabel="Clear filters"
            onAction={() => {
              setSearchQuery('')
              setStatusFilter('ALL')
            }}
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
                <Typography variant="h6">Order List</Typography>
                <Typography variant="body2" color="text.secondary">Manage status updates and order actions</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Showing {filteredOrders.length} orders</Typography>
            </Stack>

            <Box sx={{ overflowX: 'auto', p: 1 }}>
              <DataGrid
                autoHeight
                rows={filteredOrders}
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
                  minWidth: 1180,
                }}
              />
            </Box>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title="Cancel order?"
        description={`This will mark order ${confirmCancel?.shortId ?? ''} as cancelled.`}
        confirmLabel="Cancel Order"
        confirmColor="error"
        isDestructive
        inputLabel="Cancel reason"
        inputPlaceholder="Enter reason for cancellation"
        inputValue={confirmCancel?.reason ?? ''}
        inputRequired
        onInputChange={(value) =>
          setConfirmCancel((prev) =>
            prev
              ? {
                  ...prev,
                  reason: value,
                }
              : prev,
          )
        }
        onCancel={() => setConfirmCancel(null)}
        onConfirm={() => {
          if (!confirmCancel) {
            return
          }

          cancelOrder(confirmCancel.id, confirmCancel.reason)
          showMessage(`Order ${confirmCancel.shortId} cancelled: ${confirmCancel.reason.trim()}`)
          setConfirmCancel(null)
        }}
      />

      <Dialog open={Boolean(viewOrder)} onClose={() => setViewOrderId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Order Snapshot</DialogTitle>
        <DialogContent>
          {viewOrder && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2">
                <strong>Order ID:</strong> {viewOrder.shortId}
              </Typography>
              <Typography variant="body2">
                <strong>Customer:</strong> {viewOrder.customerName}
              </Typography>
              <Typography variant="body2">
                <strong>Phone:</strong> {viewOrder.customerPhone}
              </Typography>
              <Typography variant="body2">
                <strong>Items:</strong> {viewOrder.itemsCount}
              </Typography>
              <Typography variant="body2">
                <strong>Total:</strong> ₹{viewOrder.total}
              </Typography>
              <Typography variant="body2">
                <strong>Payment:</strong> {viewOrder.paymentMode}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {viewOrder.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOrderId(null)}>Close</Button>
          {viewOrder && (
            <Button
              onClick={() => {
                navigate(`/shop/orders/${viewOrder.id}`)
                setViewOrderId(null)
              }}
            >
              Open Details
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default OrdersListPage
