import { Alert, Avatar, Box, Button, Chip, CircularProgress, Container, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StorefrontIcon from '@mui/icons-material/Storefront'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import WarningIcon from '@mui/icons-material/Warning'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import StatusChip from '../components/StatusChip'
import { useShopkeeperStore } from '../shared/store/ShopkeeperStore'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { getOrder, getOrderAnalytics, getOrders, type OrderAnalytics } from '../services/orderService'
import { getShopDashboard, getShopStats, getTodayStats, type ShopStatsSnapshot } from '../services/shopService'
import type { Order, OrderDetail, OrderStatus } from '../types/order'

const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  'NEW',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'DISPATCHED',
  'DELIVERED',
  'CANCELLED',
]

const EMPTY_STATS: ShopStatsSnapshot = {
  totalOrders: 0,
  totalEarnings: 0,
  averageRating: 0,
  reviewCount: 0,
  totalProducts: 0,
  totalCategories: 0,
  activeOffers: 0,
  todayOrders: 0,
  todayEarnings: 0,
}

const EMPTY_ANALYTICS: OrderAnalytics = {
  totalOrders: 0,
  totalEarnings: 0,
  averageOrderValue: 0,
  ordersByStatus: {},
  ordersByDay: {},
}

const env = import.meta.env as Record<string, string | undefined>
const backendOrigin = (env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000').replace(/\/api\/?$/i, '')

const getOrderItemImageSrc = (imagePath?: string | null) => {
  if (!imagePath) {
    return ''
  }

  if (/^(https?:|data:|blob:)/i.test(imagePath)) {
    return imagePath
  }

  const normalizedPath = imagePath.replace(/\\/g, '/')
  if (normalizedPath.startsWith('/')) {
    return `${backendOrigin}${normalizedPath}`
  }

  return `${backendOrigin}/${normalizedPath}`
}

const formatPaymentModeLabel = (paymentMode?: string) => (paymentMode === 'COD' ? 'Cash on Delivery' : 'Online / UPI')
const formatPaymentStatusLabel = (paymentStatus?: string) => {
  const normalized = String(paymentStatus || 'PENDING').toUpperCase()

  if (normalized === 'SUCCESS') {
    return 'Paid'
  }

  if (normalized === 'REFUNDED') {
    return 'Refunded'
  }

  return 'Unpaid'
}

const getPaymentStatusColor = (paymentStatus?: string): 'success' | 'warning' | 'error' | 'info' => {
  const normalized = String(paymentStatus || 'PENDING').toUpperCase()

  if (normalized === 'SUCCESS') {
    return 'success'
  }

  if (normalized === 'FAILED') {
    return 'error'
  }

  if (normalized === 'REFUNDED') {
    return 'info'
  }

  return 'warning'
}

const DashboardPage = () => {
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { orders: storeOrders, shop } = useShopkeeperStore()
  const [stats, setStats] = useState<ShopStatsSnapshot>(EMPTY_STATS)
  const [analytics, setAnalytics] = useState<OrderAnalytics>(EMPTY_ANALYTICS)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)
  const [viewOrderDetails, setViewOrderDetails] = useState<OrderDetail | null>(null)
  const [isQuickViewLoading, setIsQuickViewLoading] = useState(false)
  const [quickViewError, setQuickViewError] = useState('')
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statsError, setStatsError] = useState('')

  const fetchDashboardStats = useCallback(
    async (mode: 'initial' | 'refresh' | 'poll' = 'initial') => {
      if (!shopId) {
        setStatsError('Shop not found for current session.')
        setIsLoadingStats(false)
        return
      }

      if (mode === 'initial') {
        setIsLoadingStats(true)
      } else {
        setIsRefreshing(true)
      }

      try {
        setStatsError('')
        const analyticsFrom = '2000-01-01T00:00:00.000Z'
        const analyticsTo = new Date().toISOString()

        const [statsData, dashboardData, todayData, analyticsData, recentOrdersResponse] = await Promise.all([
          getShopStats(shopId),
          getShopDashboard(shopId),
          getTodayStats(shopId),
          getOrderAnalytics(shopId, { from: analyticsFrom, to: analyticsTo, groupBy: 'daily' }),
          getOrders(shopId, { limit: 10, offset: 0, sort: 'recent' }),
        ])

        setStats({
          ...statsData,
          totalOrders: Number(statsData.totalOrders ?? dashboardData.orderCount ?? 0),
          totalEarnings: Number(statsData.totalEarnings ?? dashboardData.totalEarnings ?? 0),
          totalProducts: Number(statsData.totalProducts ?? dashboardData.productCount ?? 0),
          todayOrders: Number(todayData.todayOrders ?? statsData.todayOrders ?? 0),
          todayEarnings: Number(todayData.todayEarnings ?? statsData.todayEarnings ?? 0),
        })
        setAnalytics(analyticsData)
        setRecentOrders(recentOrdersResponse.orders)
      } catch (error) {
        setStatsError(error instanceof Error ? error.message : 'Unable to load dashboard stats.')
      } finally {
        setIsLoadingStats(false)
        setIsRefreshing(false)
      }
    },
    [shopId]
  )

  useEffect(() => {
    void fetchDashboardStats('initial')
  }, [fetchDashboardStats])

  useEffect(() => {
    if (!shopId) {
      return
    }

    const timer = window.setInterval(() => {
      void fetchDashboardStats('poll')
    }, 5 * 60 * 1000)

    return () => window.clearInterval(timer)
  }, [fetchDashboardStats, shopId])

  useEffect(() => {
    if (!viewOrderId) {
      setViewOrderDetails(null)
      setQuickViewError('')
      setIsQuickViewLoading(false)
      return
    }

    if (!shopId) {
      setViewOrderDetails(null)
      setQuickViewError('Shop not found for current session.')
      setIsQuickViewLoading(false)
      return
    }

    let isCancelled = false

    const loadQuickView = async () => {
      try {
        setIsQuickViewLoading(true)
        setQuickViewError('')
        const details = await getOrder(shopId, viewOrderId)

        if (!isCancelled) {
          setViewOrderDetails(details)
        }
      } catch (error) {
        if (!isCancelled) {
          setViewOrderDetails(null)
          setQuickViewError(error instanceof Error ? error.message : 'Unable to load order snapshot.')
        }
      } finally {
        if (!isCancelled) {
          setIsQuickViewLoading(false)
        }
      }
    }

    void loadQuickView()

    return () => {
      isCancelled = true
    }
  }, [shopId, viewOrderId])

  const todayOrderCount = stats.todayOrders
  const todaySales = stats.todayEarnings

  const getStatusCount = (status: OrderStatus) =>
    Number(analytics.ordersByStatus[status] ?? storeOrders.filter((order) => order.status === status).length)

  const pendingStatuses: OrderStatus[] = ['NEW', 'ACCEPTED', 'PREPARING', 'READY']
  const pendingOrderCount = pendingStatuses.reduce((sum, status) => sum + getStatusCount(status), 0)

  // DataGrid columns
  const columns: GridColDef[] = [
    {
      field: 'shortId',
      headerName: 'Order',
      flex: 0.8,
      minWidth: 80,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'customerName',
      headerName: 'Customer',
      flex: 1.2,
      minWidth: 120,
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'itemsCount',
      headerName: 'Items',
      flex: 0.6,
      minWidth: 60,
      type: 'number',
      headerAlign: 'center',
      align: 'center',
    },
    {
      field: 'total',
      headerName: 'Total',
      flex: 0.8,
      minWidth: 90,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params: GridRenderCellParams) => `₹${params.value}`,
    },
    {
      field: 'paymentMode',
      headerName: 'Payment',
      flex: 0.8,
      minWidth: 80,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <span style={{ fontSize: '0.85rem' }}>{formatPaymentModeLabel(String(params.value || ''))}</span>
      ),
    },
    {
      field: 'paymentStatus',
      headerName: 'Paid Status',
      flex: 0.9,
      minWidth: 120,
      sortable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          size="small"
          label={formatPaymentStatusLabel(String(params.row.paymentStatus || 'PENDING'))}
          color={getPaymentStatusColor(String(params.row.paymentStatus || 'PENDING'))}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 100,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <StatusChip status={params.value as OrderStatus} size="small" />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Time',
      flex: 0.9,
      minWidth: 100,
      headerAlign: 'right',
      align: 'right',
      renderCell: (params: GridRenderCellParams) => {
        const date = new Date(params.value)
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${hours}:${minutes}`
      },
    },
    {
      field: 'action',
      headerName: 'Actions',
      flex: 1,
      minWidth: 130,
      sortable: false,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="center"
          sx={{ width: '100%' }}
        >
          <Tooltip title="Quick View">
            <IconButton
              size="small"
              onClick={() => setViewOrderId(params.row.id)}
              sx={{
                border: '1px solid rgba(15,23,42,0.12)',
                bgcolor: 'background.paper',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            variant="text"
            onClick={() => navigate(`/shop/orders/${params.row.id}`)}
            sx={{
              minWidth: 0,
              px: 0.75,
              py: 0.25,
              fontSize: '0.75rem',
              textTransform: 'none',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            Open Details
          </Button>
        </Stack>
      ),
    },
  ]

  const recentOrdersData = (recentOrders.length > 0 ? recentOrders : storeOrders.slice(0, 10)).map((order) => ({
    ...order,
  }))

  const viewOrder = viewOrderId ? recentOrdersData.find((order) => order.id === viewOrderId) : null
  const quickViewCustomerName = viewOrderDetails?.customer?.name || viewOrder?.customerName || 'Customer'
  const quickViewPhone = viewOrderDetails?.customer?.phone || viewOrder?.customerPhone || '-'
  const quickViewItemCount = viewOrderDetails
    ? viewOrderDetails.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : Number(viewOrder?.itemsCount || 0)
  const quickViewTotal = viewOrderDetails?.pricing?.total ?? viewOrder?.total ?? 0
  const quickViewPaymentMode = viewOrderDetails?.payment?.mode || viewOrder?.paymentMode || 'COD'
  const quickViewPaymentStatus = viewOrderDetails?.payment?.status || viewOrder?.paymentStatus || 'PENDING'
  const quickViewStatus = viewOrderDetails?.status || viewOrder?.status || 'NEW'
  const quickViewOrderId = viewOrderDetails?.orderId || viewOrder?.shortId || ''

  const salesTrend = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
    const today = new Date()

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today)
      date.setHours(0, 0, 0, 0)
      date.setDate(today.getDate() - (6 - index))
      const key = date.toISOString().slice(0, 10)
      const dayStats = analytics.ordersByDay[key]

      return {
        key,
        label: formatter.format(date),
        date,
        sales: Number(dayStats?.earnings || 0),
        orders: Number(dayStats?.orders || 0),
      }
    })

    const peakSales = Math.max(...days.map((day) => day.sales), 1)
    const peakOrders = Math.max(...days.map((day) => day.orders), 1)

    return days.map((day) => ({
      ...day,
      totalHeightPercent:
        day.sales > 0 || day.orders > 0
          ? Math.max(((day.sales / peakSales) * 0.78 + (day.orders / peakOrders) * 0.22) * 100, 18)
          : 8,
      orderSharePercent: Math.min(34, Math.max(16, (day.orders / peakOrders) * 30)),
    }))
  }, [analytics])

  const weeklySales = useMemo(() => salesTrend.reduce((sum, day) => sum + day.sales, 0), [salesTrend])
  const weeklyOrders = useMemo(() => salesTrend.reduce((sum, day) => sum + day.orders, 0), [salesTrend])
  const avgDailySales = useMemo(() => Math.round(weeklySales / Math.max(salesTrend.length, 1)), [weeklySales, salesTrend])

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Avatar
            src={shop.imageUrl || undefined}
            alt={shop.shopName}
            sx={{ width: 72, height: 72, fontSize: 32, bgcolor: shop.imageUrl ? undefined : 'primary.main', boxShadow: 2 }}
          >
            {!shop.imageUrl && shop.shopName ? shop.shopName.charAt(0).toUpperCase() : null}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 0.2 }}>
              {shop.shopName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dashboard &bull; {shop.city}{shop.area ? `, ${shop.area}` : ''}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
            <Button
              variant="outlined"
              onClick={() => void fetchDashboardStats('refresh')}
              startIcon={isRefreshing ? <CircularProgress size={14} /> : <RefreshIcon />}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/shop/products')}>Add Product</Button>
            <Button variant="contained" color="primary" onClick={() => navigate('/shop/offers')}>Create Offer</Button>
          </Stack>
        </Box>
        <PageHeader
          title="Dashboard"
          subtitle="Monitor shop performance, active operations and quick actions in one place."
          actions={[]}
        />

        {statsError ? <Alert severity="error">{statsError}</Alert> : null}

        <Box
          sx={{
            borderRadius: 2.5,
            border: '1px solid rgba(15,23,42,0.08)',
            background: 'linear-gradient(135deg, rgba(15,118,110,0.1) 0%, rgba(255,255,255,1) 44%, rgba(37,99,235,0.08) 100%)',
            px: { xs: 2, md: 2.5 },
            py: 2,
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Today overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You have {pendingOrderCount} active orders requiring attention. Auto refresh runs every 5 minutes.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" spacing={2} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Today's sales</Typography>
                  {isLoadingStats ? <Skeleton variant="text" width={96} /> : <Typography variant="h6">₹{todaySales.toLocaleString('en-IN')}</Typography>}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Today's orders</Typography>
                  {isLoadingStats ? <Skeleton variant="text" width={64} /> : <Typography variant="h6">{todayOrderCount}</Typography>}
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {isLoadingStats ? (
          <Grid container spacing={2}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid rgba(15,23,42,0.08)',
                    p: 2,
                    backgroundColor: 'background.paper',
                  }}
                >
                  <Skeleton variant="text" width="55%" />
                  <Skeleton variant="text" width="40%" height={42} />
                  <Skeleton variant="text" width="70%" />
                </Box>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Total Orders" value={stats.totalOrders} helperText="All-time orders" icon={<ShoppingCartIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Total Earnings"
                value={`₹${stats.totalEarnings.toLocaleString('en-IN')}`}
                helperText="All-time revenue"
                icon={<TrendingUpIcon />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Average Rating"
                value={Number(stats.averageRating || 0).toFixed(1)}
                helperText="Verified rating"
                icon={<StarOutlineIcon />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Review Count" value={stats.reviewCount} helperText="Published reviews" icon={<RateReviewOutlinedIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Total Products" value={stats.totalProducts} helperText="Active products" icon={<Inventory2OutlinedIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Active Offers" value={stats.activeOffers} helperText="Live discounts" icon={<LocalOfferOutlinedIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard title="Today's Orders" value={stats.todayOrders} helperText="Orders today" icon={<StorefrontIcon />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard
                title="Today's Earnings"
                value={`₹${stats.todayEarnings.toLocaleString('en-IN')}`}
                helperText="Revenue today"
                icon={<WarningIcon />}
              />
            </Grid>
          </Grid>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2.5,
                border: '1px solid rgba(15,23,42,0.08)',
                p: 2.25,
                height: '100%',
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={1.5}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.35 }}>Sales Trend</Typography>
                  <Typography variant="body2" color="text.secondary">Last 7 days performance snapshot</Typography>
                </Box>

                <Stack direction="row" spacing={2.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Weekly Sales</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{weeklySales.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Avg / Day</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{avgDailySales.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Orders</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{weeklyOrders}</Typography>
                  </Box>
                </Stack>
              </Stack>

              <Box sx={{ position: 'relative' }}>
                <Box
                  sx={{
                    position: 'absolute',
                    inset: '26px 0 52px 0',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                >
                  {[0, 1, 2, 3].map((line) => (
                    <Box
                      key={line}
                      sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: `${line * 33.33}%`,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        opacity: 0.85,
                      }}
                    />
                  ))}
                </Box>

                <Stack direction="row" spacing={1.5} alignItems="flex-end" sx={{ overflowX: 'auto', pb: 0.5, position: 'relative', zIndex: 1 }}>
                  {salesTrend.map((day, index) => {
                    const salesSharePercent = 100 - day.orderSharePercent

                    return (
                      <Box key={day.key} sx={{ flex: 1, minWidth: 92 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            mb: 0.75,
                            display: 'block',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: index === salesTrend.length - 1 ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          ₹{day.sales.toLocaleString('en-IN')}
                        </Typography>

                        <Box sx={{ height: 150, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', mb: 0.75 }}>
                          <Box
                            sx={{
                              width: 44,
                              height: `${day.totalHeightPercent}%`,
                              minHeight: day.sales > 0 || day.orders > 0 ? 16 : 6,
                              borderRadius: 1,
                              overflow: 'hidden',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'flex-end',
                              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                            }}
                          >
                            <Box sx={{ height: `${salesSharePercent}%`, bgcolor: 'info.main' }} />
                            <Box
                              sx={{
                                height: `${day.orderSharePercent}%`,
                                bgcolor: index === salesTrend.length - 1 ? 'primary.dark' : 'primary.main',
                              }}
                            />
                          </Box>
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', fontWeight: 700, color: 'text.primary' }}>
                          {day.label}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary' }}>
                          {day.orders} orders
                        </Typography>
                      </Box>
                    )
                  })}
                </Stack>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Box
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2.5,
                border: '1px solid rgba(15,23,42,0.08)',
                p: 2.25,
                height: '100%',
              }}
            >
              <Typography variant="h6" sx={{ mb: 0.35 }}>Operations Snapshot</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Live order stage distribution</Typography>
              <Stack spacing={1.2}>
                {ORDER_STATUS_OPTIONS.map((status) => {
                  const count = getStatusCount(status)
                  return (
                    <Stack key={status} direction="row" justifyContent="space-between" alignItems="center">
                      <StatusChip status={status} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{count}</Typography>
                    </Stack>
                  )
                })}
              </Stack>
            </Box>
          </Grid>
        </Grid>

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
            spacing={1.2}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', md: 'center' }}
            sx={{ px: 2.25, py: 1.8, borderBottom: '1px solid rgba(15,23,42,0.08)' }}
          >
            <Box>
              <Typography variant="h6">Recent Orders</Typography>
              <Typography variant="body2" color="text.secondary">Latest 10 orders with quick details access</Typography>
            </Box>
            <Button variant="outlined" onClick={() => navigate('/shop/orders')}>View All Orders</Button>
          </Stack>

          <Box sx={{ overflowX: 'auto', p: 1 }}>
            <DataGrid
              autoHeight
              rows={recentOrdersData}
              columns={columns}
              rowHeight={60}
              pageSizeOptions={[10, 25]}
              initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
              disableRowSelectionOnClick
              density="compact"
              sx={{
                border: 'none',
                minWidth: 960,
                '& .MuiDataGrid-cell': {
                  alignItems: 'center',
                },
              }}
            />
          </Box>
        </Box>

        <Dialog open={Boolean(viewOrderId)} onClose={() => setViewOrderId(null)} fullWidth maxWidth="sm">
          <DialogTitle>Order Snapshot</DialogTitle>
          <DialogContent>
            {isQuickViewLoading ? (
              <Stack spacing={1.25} alignItems="center" sx={{ py: 2 }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary">
                  Loading quick view...
                </Typography>
              </Stack>
            ) : null}

            {quickViewError ? <Alert severity="error" sx={{ mb: 1.5 }}>{quickViewError}</Alert> : null}

            {viewOrderId && !isQuickViewLoading && (
              <Stack spacing={1.25}>
                <Typography variant="body2">
                  <strong>Order ID:</strong> {quickViewOrderId || '-'}
                </Typography>
                <Typography variant="body2">
                  <strong>Customer:</strong> {quickViewCustomerName}
                </Typography>
                <Typography variant="body2">
                  <strong>Phone:</strong> {quickViewPhone}
                </Typography>
                <Typography variant="body2">
                  <strong>Total Qty:</strong> {quickViewItemCount}
                </Typography>
                <Typography variant="body2">
                  <strong>Total:</strong> ₹{quickViewTotal}
                </Typography>
                <Typography variant="body2">
                  <strong>Payment:</strong> {formatPaymentModeLabel(quickViewPaymentMode)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="body2">
                    <strong>Paid Status:</strong>
                  </Typography>
                  <Chip
                    size="small"
                    label={formatPaymentStatusLabel(quickViewPaymentStatus)}
                    color={getPaymentStatusColor(quickViewPaymentStatus)}
                    variant="outlined"
                  />
                </Box>
                <Typography variant="body2">
                  <strong>Status:</strong> {quickViewStatus}
                </Typography>

                {viewOrderDetails?.items?.length ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Ordered Items
                    </Typography>
                    <Stack spacing={1}>
                      {viewOrderDetails.items.map((item) => {
                        const itemImage = getOrderItemImageSrc(item.image)

                        return (
                          <Box
                            key={`${item.productId}-${item.variantId || item.variantLabel}`}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              p: 1,
                              border: '1px solid rgba(15,23,42,0.08)',
                              borderRadius: 1.5,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                              {itemImage ? (
                                <Box
                                  component="img"
                                  src={itemImage}
                                  alt={item.productName}
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 1.5,
                                    objectFit: 'cover',
                                    border: '1px solid rgba(15,23,42,0.08)',
                                    bgcolor: 'grey.100',
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 1.5,
                                    border: '1px solid rgba(15,23,42,0.08)',
                                    bgcolor: 'grey.100',
                                    color: 'text.secondary',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: 10,
                                    textAlign: 'center',
                                    px: 0.5,
                                    flexShrink: 0,
                                  }}
                                >
                                  No Image
                                </Box>
                              )}

                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {item.productName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.variantLabel} • Qty {item.quantity}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                              ₹{item.price * item.quantity}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewOrderId(null)}>Close</Button>
            {viewOrder && (
              <Button
                onClick={() => {
                  navigate(`/shop/orders/${encodeURIComponent(viewOrder.id)}`)
                  setViewOrderId(null)
                }}
              >
                Open Details
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Stack>
    </Container>
  )
}

export default DashboardPage
