import { Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import { useMemo } from 'react'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'

type StatCardProps = {
  label: string
  value: string | number
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Card>
    <CardContent>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ mt: 0.75, fontWeight: 800 }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
)

const DashboardPage = () => {
  const { cities, shops, orders, categories, config, auditEvents } = useSuperAdminStore()

  const topStats = useMemo(
    () => [
      { label: 'Active Cities', value: cities.filter((city) => city.isActive).length },
      { label: 'Total Shops', value: shops.length },
      { label: 'Pending Approvals', value: shops.filter((shop) => shop.status === 'pending_approval').length },
      { label: 'Total Orders', value: orders.length },
    ],
    [cities, orders.length, shops],
  )

  const maintenanceMode = config.find((item) => item.key === 'maintenance_mode')?.value === 'true' ? 'On' : 'Off'

  const secondaryStats = useMemo(
    () => [
      { label: 'Delivered Orders', value: orders.filter((order) => order.status === 'delivered').length },
      {
        label: 'Refunded/Cancelled Orders',
        value: orders.filter((order) => order.status === 'refunded' || order.status === 'cancelled').length,
      },
      { label: 'Active Categories', value: categories.filter((category) => category.isActive).length },
      { label: 'Maintenance Mode', value: maintenanceMode },
    ],
    [categories, maintenanceMode, orders],
  )

  const recentEvents = useMemo(() => auditEvents.slice(-8).reverse(), [auditEvents])

  return (
    <>
      <PageHeader title="Dashboard" />

      <Grid container spacing={2}>
        {maintenanceMode === 'On' ? (
          <Grid size={12}>
            <Card sx={{ borderColor: 'warning.main', borderWidth: 1, borderStyle: 'solid' }}>
              <CardContent>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'warning.dark' }}>
                  Maintenance Mode is ON — new orders should be blocked.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : null}

        {topStats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label={stat.label} value={stat.value} />
          </Grid>
        ))}

        {secondaryStats.map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label={stat.label} value={stat.value} />
          </Grid>
        ))}

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Recent Activity
              </Typography>

              {recentEvents.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Audit logs will appear here as administrative actions are performed."
                />
              ) : (
                <Stack divider={<Divider flexItem />}>
                  {recentEvents.map((event) => (
                    <Stack key={event.id} spacing={0.5} sx={{ py: 1.25 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {event.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.type} • {new Date(event.createdAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}

export default DashboardPage
