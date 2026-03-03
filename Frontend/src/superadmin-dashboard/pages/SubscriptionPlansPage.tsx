import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded'
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
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { UpdatePlanPatch } from '../store/types'
import type { SubscriptionPlan } from '../types/Subscription'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

type PlanFormState = {
  price: string
  durationDays: string
  productLimit: string
  priorityRank: string
  featuresText: string
}

const SubscriptionTabs = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <Tabs
      value={pathname}
      onChange={(_, value) => navigate(value)}
      variant="scrollable"
      allowScrollButtonsMobile
      sx={{ mb: 2 }}
    >
      <Tab value="/superadmin/subscriptions/plans" label="Plans" />
      <Tab value="/superadmin/subscriptions/shops" label="Shop Subscriptions" />
    </Tabs>
  )
}

const SubscriptionPlansPage = () => {
  const { plans, updatePlan, togglePlanActive } = useSuperAdminStore()
  const { showError, showSuccess } = useAppSnackbar()

  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [toggleTarget, setToggleTarget] = useState<SubscriptionPlan | null>(null)
  const isInitialLoading = useInitialLoadingDelay()
  const [formState, setFormState] = useState<PlanFormState>({
    price: '',
    durationDays: '',
    productLimit: '',
    priorityRank: '',
    featuresText: '',
  })

  const formError = useMemo(() => {
    const price = Number(formState.price)
    if (!Number.isFinite(price) || Number.isNaN(price) || price < 0) {
      return 'Price must be 0 or greater.'
    }

    const durationDays = Number(formState.durationDays)
    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      return 'Duration must be a positive integer.'
    }

    const priorityRank = Number(formState.priorityRank)
    if (!Number.isInteger(priorityRank) || priorityRank < 0) {
      return 'Priority rank must be 0 or greater.'
    }

    if (formState.productLimit.trim()) {
      const productLimit = Number(formState.productLimit)
      if (!Number.isInteger(productLimit) || productLimit <= 0) {
        return 'Product limit must be a positive integer.'
      }
    }

    const features = formState.featuresText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    if (features.length === 0) {
      return 'At least one feature is required.'
    }

    return undefined
  }, [formState])

  const openEditDialog = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setFormState({
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      productLimit: plan.productLimit === null ? '' : String(plan.productLimit),
      priorityRank: String(plan.priorityRank),
      featuresText: plan.features.join('\n'),
    })
  }

  const handleSavePlan = () => {
    if (!editingPlan) {
      return
    }

    const payload: UpdatePlanPatch = {
      price: Number(formState.price),
      durationDays: Number(formState.durationDays),
      productLimit: formState.productLimit.trim() ? Number(formState.productLimit) : null,
      priorityRank: Number(formState.priorityRank),
      features: formState.featuresText
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    }

    const result = updatePlan(editingPlan.id, payload)
    if (!result.ok) {
      showError(result.error ?? 'Could not update plan.')
      return
    }

    showSuccess('Plan updated')
    setEditingPlan(null)
  }

  const handleConfirmToggle = () => {
    if (!toggleTarget) {
      return
    }

    const result = togglePlanActive(toggleTarget.id)
    if (!result.ok) {
      showError(result.error ?? 'Could not update plan status.')
      return
    }

    showSuccess(toggleTarget.isActive ? 'Plan deactivated' : 'Plan activated')
    setToggleTarget(null)
  }

  const columns = useMemo<GridColDef<SubscriptionPlan>[]>(
    () => [
      { field: 'name', headerName: 'Plan', minWidth: 120, flex: 0.8 },
      {
        field: 'price',
        headerName: 'Price',
        minWidth: 110,
        flex: 0.7,
        valueFormatter: (value: number) => `₹${value}`,
      },
      {
        field: 'durationDays',
        headerName: 'Duration',
        minWidth: 120,
        flex: 0.7,
        valueFormatter: (value: number) => `${value} days`,
      },
      {
        field: 'productLimit',
        headerName: 'Product Limit',
        minWidth: 140,
        flex: 0.8,
        renderCell: ({ row }: GridRenderCellParams<SubscriptionPlan, number | null>) =>
          row.productLimit === null ? 'Unlimited' : row.productLimit,
      },
      { field: 'priorityRank', headerName: 'Priority', minWidth: 100, flex: 0.6 },
      {
        field: 'isActive',
        headerName: 'Status',
        minWidth: 120,
        flex: 0.7,
        renderCell: ({ row }: GridRenderCellParams<SubscriptionPlan, boolean>) => (
          <Chip
            size="small"
            label={row.isActive ? 'Active' : 'Inactive'}
            color={row.isActive ? 'success' : 'default'}
            variant={row.isActive ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 220,
        flex: 1,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<SubscriptionPlan>) => (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(row)}>
              Edit
            </Button>
            <Button
              size="small"
              color={row.isActive ? 'error' : 'success'}
              variant={row.isActive ? 'contained' : 'outlined'}
              startIcon={<PowerSettingsNewRoundedIcon />}
              onClick={() => setToggleTarget(row)}
            >
              {row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  const activePlans = plans.filter((plan) => plan.isActive).length

  const handleExportCsv = () => {
    if (plans.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = plans.map((plan) => ({
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      productLimit: plan.productLimit ?? '',
      priorityRank: plan.priorityRank,
      isActive: plan.isActive,
      updatedAt: plan.updatedAt,
    }))

    const csv = toCsv(rows)
    const filename = buildCsvFilename('subscription_plans', false, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        actions={
          <Button variant="outlined" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />
      <SubscriptionTabs />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Total plans: {plans.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active plans: {activePlans}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {isInitialLoading ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rectangular" height={180} />
            </Stack>
          </CardContent>
        </Card>
      ) : plans.length === 0 ? (
        <EmptyState title="No plans found" description="No subscription plans are available yet." />
      ) : (
        <DataGridContainer>
          <DataGrid
            autoHeight
            rows={plans}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </DataGridContainer>
      )}

      <Dialog open={Boolean(editingPlan)} onClose={() => setEditingPlan(null)} maxWidth="sm" fullWidth scroll="paper">
        <DialogTitle>Edit Plan</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: '10px !important' }}>
          <TextField
            label="Price"
            type="number"
            value={formState.price}
            onChange={(event) => setFormState((previous) => ({ ...previous, price: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Duration (days)"
            type="number"
            value={formState.durationDays}
            onChange={(event) => setFormState((previous) => ({ ...previous, durationDays: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Product Limit (leave empty for unlimited)"
            type="number"
            value={formState.productLimit}
            onChange={(event) => setFormState((previous) => ({ ...previous, productLimit: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Priority Rank"
            type="number"
            value={formState.priorityRank}
            onChange={(event) => setFormState((previous) => ({ ...previous, priorityRank: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Features (comma or newline separated)"
            multiline
            minRows={4}
            value={formState.featuresText}
            onChange={(event) => setFormState((previous) => ({ ...previous, featuresText: event.target.value }))}
            fullWidth
          />
          {formError ? (
            <Typography variant="caption" color="error.main">
              {formError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingPlan(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePlan} disabled={Boolean(formError)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.isActive ? 'Deactivate Plan?' : 'Activate Plan?'}
        description={`This will ${toggleTarget?.isActive ? 'deactivate' : 'activate'} ${toggleTarget?.name ?? 'this plan'}.`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        onClose={() => setToggleTarget(null)}
        onConfirm={handleConfirmToggle}
      />
    </Box>
  )
}

export default SubscriptionPlansPage
