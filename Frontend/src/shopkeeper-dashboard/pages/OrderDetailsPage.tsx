import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import {
  acceptOrder,
  getOrder,
  markOrderReady,
  rejectOrder,
  updateOrderStatus,
} from '../services/orderService'
import type { OrderDetail } from '../types/order'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'

const OrderDetailsPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const resolvedOrderId = orderId ? decodeURIComponent(orderId) : undefined
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { showMessage } = useAppFeedback()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [pageError, setPageError] = useState('')
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; reason: string }>({ open: false, reason: '' })
  const autoPreparingTriggeredRef = useRef(false)
  const autoDeliveredTriggeredRef = useRef(false)

  useEffect(() => {
    if (!shopId || !resolvedOrderId) {
      setPageError('Invalid order request.')
      setIsLoading(false)
      return
    }

    let isCancelled = false

    const loadOrder = async (silent = false) => {
      try {
        if (!silent) {
          setIsLoading(true)
        }
        setPageError('')

        const response = await getOrder(shopId, resolvedOrderId)
        if (!isCancelled) {
          setOrder(response)
        }
      } catch (error) {
        if (!isCancelled) {
          setPageError(error instanceof Error ? error.message : 'Unable to load order details.')
        }
      } finally {
        if (!isCancelled && !silent) {
          setIsLoading(false)
        }
      }
    }

    void loadOrder(false)
    const intervalId = window.setInterval(() => {
      void loadOrder(true)
    }, 8000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [resolvedOrderId, shopId])

  const workflowLabel = useMemo(() => {
    if (!order) {
      return ''
    }

    return `${order.status} • Updated ${new Date(order.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}`
  }, [order])

  const applyStatusUpdate = async (nextStatus: 'PREPARING' | 'DISPATCHED' | 'DELIVERED') => {
    if (!shopId || !resolvedOrderId) {
      return
    }

    setIsActionLoading(true)
    try {
      const response = await updateOrderStatus(shopId, resolvedOrderId, nextStatus, `Status updated to ${nextStatus}`)
      setOrder(response)
      showMessage(`Order moved to ${nextStatus}`)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to update order status.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!shopId || !resolvedOrderId) {
      return
    }

    setIsActionLoading(true)
    try {
      await acceptOrder(shopId, resolvedOrderId)
      const preparing = await updateOrderStatus(shopId, resolvedOrderId, 'PREPARING', 'Auto moved to PREPARING after acceptance')
      setOrder(preparing)
      showMessage('Order accepted and moved to preparing')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to accept order.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleMarkReady = async () => {
    if (!shopId || !resolvedOrderId) {
      return
    }

    setIsActionLoading(true)
    try {
      const ready = await markOrderReady(shopId, resolvedOrderId)
      setOrder(ready)
      showMessage('Order marked ready')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to mark order ready.')
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!shopId || !resolvedOrderId) {
      return
    }

    setIsActionLoading(true)
    try {
      const cancelled = await rejectOrder(shopId, resolvedOrderId, rejectDialog.reason)
      setOrder(cancelled)
      setRejectDialog({ open: false, reason: '' })
      showMessage('Order cancelled successfully')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to reject order.')
    } finally {
      setIsActionLoading(false)
    }
  }

  useEffect(() => {
    if (!shopId || !resolvedOrderId || !order || isActionLoading) {
      return
    }

    if (order.status === 'ACCEPTED' && !autoPreparingTriggeredRef.current) {
      autoPreparingTriggeredRef.current = true
      void applyStatusUpdate('PREPARING')
    }

    if (order.status === 'DISPATCHED' && !autoDeliveredTriggeredRef.current) {
      autoDeliveredTriggeredRef.current = true
      const timer = window.setTimeout(() => {
        void applyStatusUpdate('DELIVERED')
      }, 1000)

      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [order, shopId, resolvedOrderId, isActionLoading])

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={24} />
          <Typography variant="body2" color="text.secondary">
            Loading order details...
          </Typography>
        </Stack>
      </Container>
    )
  }

  if (!resolvedOrderId || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Order not found" subtitle="The requested order ID is invalid or no longer exists." />
          {pageError ? <Alert severity="error">{pageError}</Alert> : null}
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We could not locate this order. It may have been removed.
              </Typography>
              <Button variant="outlined" onClick={() => navigate('/shop/orders')}>
                Back to Orders
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={3}>
        <PageHeader title="Order Details" subtitle={`Order ${order.orderId}`} />
        {pageError ? <Alert severity="error">{pageError}</Alert> : null}

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {order.customer.name || 'Customer'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.customer.phone || '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment
                </Typography>
                <Typography variant="body1">{order.payment.mode}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.items.length} items
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5">₹{order.pricing.total}</Typography>
              </Grid>
            </Grid>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Delivery: {order.deliveryAddress?.addressLine1 || '-'}, {order.deliveryAddress?.area || '-'}, {order.deliveryAddress?.city || '-'} - {order.deliveryAddress?.pincode || '-'}
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems="center">
              <StatusChip status={order.status} size="medium" />
              <Typography variant="body2" color="text.secondary">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">{workflowLabel}</Typography>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mt: 2 }}>
              {order.status === 'NEW' && (
                <Button variant="contained" onClick={() => void handleAccept()} disabled={isActionLoading}>
                  Accept
                </Button>
              )}
              {order.status === 'PREPARING' && (
                <Button variant="contained" color="secondary" onClick={() => void handleMarkReady()} disabled={isActionLoading}>
                  Mark Ready
                </Button>
              )}
              {order.status === 'READY' && (
                <Button variant="contained" color="secondary" onClick={() => void applyStatusUpdate('DISPATCHED')} disabled={isActionLoading}>
                  Dispatch
                </Button>
              )}
              {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setRejectDialog({ open: true, reason: '' })}
                  disabled={isActionLoading}
                >
                  Reject / Cancel
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Items</Typography>
            <Stack spacing={1.2}>
              {order.items.map((item) => (
                <Box
                  key={`${item.productId}-${item.variantId || item.variantLabel}`}
                  sx={{ display: 'flex', justifyContent: 'space-between', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 1.5, p: 1.25 }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.productName}</Typography>
                    <Typography variant="caption" color="text.secondary">{item.variantLabel} • Qty {item.quantity}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{item.price * item.quantity}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1.5 }}>Status History</Typography>
            <Stack spacing={1}>
              {(order.statusHistory || []).map((entry, index) => (
                <Typography key={`${entry.status}-${entry.timestamp}-${index}`} variant="body2" color="text.secondary">
                  {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} • {entry.status}{entry.note ? ` • ${entry.note}` : ''}
                </Typography>
              ))}
              {(order.statusHistory || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No history available</Typography>
              ) : null}
            </Stack>
          </CardContent>
        </Card>

        <Box>
          <Button variant="outlined" onClick={() => navigate('/shop/orders')}>
            Back to Orders
          </Button>
        </Box>
      </Stack>

      <ConfirmDialog
        open={rejectDialog.open}
        title="Reject order?"
        description="This will cancel the order and requires a reason."
        confirmLabel="Reject Order"
        confirmColor="error"
        isDestructive
        inputLabel="Reason"
        inputPlaceholder="Enter rejection reason"
        inputValue={rejectDialog.reason}
        inputRequired
        onInputChange={(value) => setRejectDialog((prev) => ({ ...prev, reason: value }))}
        onCancel={() => setRejectDialog({ open: false, reason: '' })}
        onConfirm={() => {
          void handleReject()
        }}
      />
    </Container>
  )
}

export default OrderDetailsPage
