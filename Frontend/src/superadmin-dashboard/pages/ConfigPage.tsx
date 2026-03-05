import { Box, Button, Card, CardContent, Chip, Skeleton, Stack, Switch, TextField, Typography } from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { SystemConfig } from '../types/SystemConfig'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'
import EmptyState from '../ui/EmptyState'

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const configDescriptions: Record<string, string> = {
  max_categories_per_shop: 'Maximum number of categories a shop can register under.',
  max_subcategories: 'Maximum subcategories per category.',
  cart_expiry_hours: 'Hours after which inactive carts expire.',
  order_auto_cancel_minutes: 'Auto-cancel threshold for pending orders.',
  maintenance_mode: 'Freeze new orders platform-wide.',
  launch_offer_enabled: 'Enable launch offer visibility and eligibility.',
  default_commission_percentage: 'Default platform commission percentage.',
}

const getValidationError = (key: string, rawValue: string) => {
  const value = rawValue.trim()

  if (!value) {
    return 'Value is required.'
  }

  const asInt = Number(value)
  const asFloat = Number(value)

  switch (key) {
    case 'max_categories_per_shop':
      if (!Number.isInteger(asInt) || asInt < 1 || asInt > 10) {
        return 'Must be an integer between 1 and 10.'
      }
      return undefined
    case 'max_subcategories':
      if (!Number.isInteger(asInt) || asInt < 5 || asInt > 12) {
        return 'Must be an integer between 5 and 12.'
      }
      return undefined
    case 'cart_expiry_hours':
      if (!Number.isInteger(asInt) || asInt < 1 || asInt > 72) {
        return 'Must be an integer between 1 and 72.'
      }
      return undefined
    case 'order_auto_cancel_minutes':
      if (!Number.isInteger(asInt) || asInt < 5 || asInt > 60) {
        return 'Must be an integer between 5 and 60.'
      }
      return undefined
    case 'default_commission_percentage':
      if (!Number.isFinite(asFloat) || asFloat < 0 || asFloat > 100) {
        return 'Must be a number between 0 and 100.'
      }
      return undefined
    case 'maintenance_mode':
    case 'launch_offer_enabled':
      if (value !== 'true' && value !== 'false') {
        return 'Must be either true or false.'
      }
      return undefined
    default:
      return undefined
  }
}

const ConfigPage = () => {
  const { config, syncConfig, updateConfigValue, toggleFeatureFlag, getConfigBoolean } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [editTarget, setEditTarget] = useState<SystemConfig | null>(null)
  const [editValue, setEditValue] = useState('')
  const [maintenanceConfirmOpen, setMaintenanceConfirmOpen] = useState(false)
  const [search, setSearch] = useState('')
  const isInitialLoading = useInitialLoadingDelay()

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncConfig()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load config from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncConfig])

  const maintenanceEnabled = getConfigBoolean('maintenance_mode')
  const launchOfferEnabled = getConfigBoolean('launch_offer_enabled')

  const editableConfigs = useMemo(
    () => config.filter((item) => item.key !== 'maintenance_mode' && item.key !== 'launch_offer_enabled'),
    [config],
  )

  const filteredConfigs = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    if (!searchValue) {
      return editableConfigs
    }

    return editableConfigs.filter(
      (item) =>
        item.key.toLowerCase().includes(searchValue) ||
        item.value.toLowerCase().includes(searchValue) ||
        (item.description ?? configDescriptions[item.key] ?? '').toLowerCase().includes(searchValue),
    )
  }, [editableConfigs, search])

  const validationError = editTarget ? getValidationError(editTarget.key, editValue) : undefined

  const columns = useMemo<GridColDef<SystemConfig>[]>(
    () => [
      {
        field: 'key',
        headerName: 'Key',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'value',
        headerName: 'Value',
        minWidth: 150,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<SystemConfig>) => (
          <Typography variant="body2">{params.row.value || 'Not set'}</Typography>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        minWidth: 320,
        flex: 1.6,
        renderCell: (params: GridRenderCellParams<SystemConfig>) => (
          <Typography variant="body2" color="text.secondary">
            {params.row.description ?? configDescriptions[params.row.key] ?? 'Not set'}
          </Typography>
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<SystemConfig>) => (
          <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 120,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<SystemConfig>) => (
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setEditTarget(params.row)
              setEditValue(params.row.value)
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [],
  )

  const handleToggle = async (key: string) => {
    const result = await toggleFeatureFlag(key)
    if (!result.ok) {
      showError(result.error ?? 'Could not toggle feature flag.')
      return
    }

    showSuccess(`${key} updated`)
  }

  const handleExportCsv = () => {
    if (filteredConfigs.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredConfigs.map((item) => ({
      key: item.key,
      value: item.value,
      description: item.description ?? configDescriptions[item.key] ?? '',
      updatedAt: item.updatedAt,
    }))

    const csv = toCsv(rows)
    const filename = buildCsvFilename('config', search.trim().length > 0, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const clearFilters = () => {
    setSearch('')
  }

  return (
    <>
      <PageHeader
        title="System Config"
        actions={
          <Button variant="outlined" onClick={handleExportCsv}>
            Export CSV
          </Button>
        }
      />

      <Stack spacing={2} sx={{ mb: 2 }}>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Feature Flags
              </Typography>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Maintenance Mode
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Freeze new orders platform-wide.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={maintenanceEnabled ? 'ON' : 'OFF'} color={maintenanceEnabled ? 'warning' : 'default'} />
                  <Switch
                    checked={maintenanceEnabled}
                    onChange={async (_, checked) => {
                      if (checked) {
                        setMaintenanceConfirmOpen(true)
                        return
                      }

                      await handleToggle('maintenance_mode')
                    }}
                  />
                </Stack>
              </Stack>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Launch Offer Enabled
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Controls launch offer visibility and usage in client apps.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={launchOfferEnabled ? 'ON' : 'OFF'} color={launchOfferEnabled ? 'success' : 'default'} />
                  <Switch checked={launchOfferEnabled} onChange={async () => await handleToggle('launch_offer_enabled')} />
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
            Config Table Editor
          </Typography>
          <TextField
            label="Search"
            placeholder="key / value / description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          />
          <DataGridContainer>
            {isInitialLoading ? (
              <Stack spacing={1}>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="rectangular" height={180} />
              </Stack>
            ) : filteredConfigs.length === 0 ? (
              <EmptyState
                title="No results"
                description="No config rows match your current filters."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            ) : (
              <DataGrid
                rows={filteredConfigs}
                columns={columns}
                getRowId={(row) => row.key}
                autoHeight
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
              />
            )}
          </DataGridContainer>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editTarget)} onClose={() => setEditTarget(null)} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle>Edit Config</DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ pt: 1 }}>
            <TextField label="Key" value={editTarget?.key ?? ''} fullWidth InputProps={{ readOnly: true }} />
            <TextField
              label="Value"
              value={editValue}
              onChange={(event) => setEditValue(event.target.value)}
              fullWidth
              error={Boolean(validationError)}
              helperText={validationError ?? (editTarget ? configDescriptions[editTarget.key] ?? 'Not set' : '')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={Boolean(validationError) || !editTarget}
            onClick={async () => {
              if (!editTarget) {
                return
              }

              const result = await updateConfigValue(editTarget.key, editValue)
              if (!result.ok) {
                showError(result.error ?? 'Could not update config.')
                return
              }

              showSuccess('Config updated')
              setEditTarget(null)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={maintenanceConfirmOpen}
        title="Turn on maintenance mode?"
        description="This will freeze new orders platform-wide."
        confirmLabel="Turn On"
        cancelLabel="Cancel"
        onClose={() => setMaintenanceConfirmOpen(false)}
        onConfirm={async () => {
          await handleToggle('maintenance_mode')
          setMaintenanceConfirmOpen(false)
        }}
      />
    </>
  )
}

export default ConfigPage
