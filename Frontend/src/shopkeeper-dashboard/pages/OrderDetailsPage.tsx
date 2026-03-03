import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import StatusChip from '../components/StatusChip'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'

const OrderDetailsPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { getOrderById } = useShopkeeperStore()

  const order = useMemo(() => (orderId ? getOrderById(orderId) : undefined), [getOrderById, orderId])

  if (!orderId || !order) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Stack spacing={2.5}>
          <PageHeader title="Order not found" subtitle="The requested order ID is invalid or no longer exists." />
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We could not locate this order. It may have been removed from demo data.
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
        <PageHeader title="Order Details" subtitle={`Order ${order.shortId}`} />

        <Card>
          <CardContent>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Customer
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {order.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.customerPhone}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Payment
                </Typography>
                <Typography variant="body1">{order.paymentMode}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {order.itemsCount} items
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="caption" color="text.secondary">
                  Total
                </Typography>
                <Typography variant="h5">₹{order.total}</Typography>
              </Grid>
            </Grid>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }} alignItems="center">
              <StatusChip status={order.status} size="medium" />
              <Typography variant="body2" color="text.secondary">
                Placed on {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box>
          <Button variant="outlined" onClick={() => navigate('/shop/orders')}>
            Back to Orders
          </Button>
        </Box>
      </Stack>
    </Container>
  )
}

export default OrderDetailsPage
