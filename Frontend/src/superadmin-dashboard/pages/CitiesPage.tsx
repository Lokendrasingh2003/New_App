import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ToggleOffRoundedIcon from '@mui/icons-material/ToggleOffRounded'
import ToggleOnRoundedIcon from '@mui/icons-material/ToggleOnRounded'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import CityFormDialog from '../modules/cities/CityFormDialog'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { City } from '../types/City'
import type { CityUpsertInput } from '../store/types'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

type ConfirmState = {
  title: string
  description: string
  onConfirm: () => void
}

const formatDateTime = (value: string) => {
  return new Date(value).toLocaleString()
}

const StatusChip = ({ label, active }: { label: string; active: boolean }) => {
  return <Chip size="small" label={label} color={active ? 'success' : 'default'} variant={active ? 'filled' : 'outlined'} />
}

const CitiesPage = () => {
  const { cities, addCity, updateCity, toggleCityActive, toggleCityDelivery } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add')
  const [selectedCity, setSelectedCity] = useState<City | undefined>(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const isInitialLoading = useInitialLoadingDelay()

  const filteredCities = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return cities.filter((city) => {
      const matchesSearch =
        searchValue.length === 0 ||
        city.name.toLowerCase().includes(searchValue) ||
        city.slug.toLowerCase().includes(searchValue)

      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? city.isActive : !city.isActive)

      const matchesDelivery =
        deliveryFilter === 'all' || (deliveryFilter === 'enabled' ? city.deliveryEnabled : !city.deliveryEnabled)

      return matchesSearch && matchesStatus && matchesDelivery
    })
  }, [cities, deliveryFilter, search, statusFilter])

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setDeliveryFilter('all')
  }

  const handleExportCsv = () => {
    if (filteredCities.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredCities.map((city) => ({
      id: city.id,
      name: city.name,
      slug: city.slug,
      isActive: city.isActive,
      deliveryEnabled: city.deliveryEnabled,
      commissionOverridePercentage: city.commissionOverridePercentage,
      updatedAt: city.updatedAt,
    }))

    const csv = toCsv(rows)
    const isFiltered = search.trim().length > 0 || statusFilter !== 'all' || deliveryFilter !== 'all'
    const filename = buildCsvFilename('cities', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const handleAddCity = (input: CityUpsertInput) => {
    const result = addCity(input)

    if (result.ok) {
      showSuccess('City created')
    }

    return result
  }

  const handleEditCity = (input: CityUpsertInput) => {
    if (!selectedCity) {
      return { ok: false, error: 'No city selected.' }
    }

    const result = updateCity(selectedCity.id, input)

    if (result.ok) {
      showSuccess('City updated')
    }

    return result
  }

  const openAddDialog = () => {
    setDialogMode('add')
    setSelectedCity(undefined)
    setFormOpen(true)
  }

  const openEditDialog = (city: City) => {
    setDialogMode('edit')
    setSelectedCity(city)
    setFormOpen(true)
  }

  const handleToggleActive = (city: City) => {
    const isDeactivate = city.isActive

    setConfirmState({
      title: isDeactivate ? 'Deactivate city?' : 'Activate city?',
      description: isDeactivate
        ? 'Inactive city means no new orders in that city.'
        : 'Active city means new orders can be accepted in this city.',
      onConfirm: () => {
        const result = toggleCityActive(city.id)
        if (result.ok) {
          showSuccess(`City ${city.isActive ? 'deactivated' : 'activated'}`)
        } else {
          showError(result.error ?? 'Could not update city status.')
        }
        setConfirmState(null)
      },
    })
  }

  const handleToggleDelivery = (city: City) => {
    const isDisable = city.deliveryEnabled

    setConfirmState({
      title: isDisable ? 'Disable delivery?' : 'Enable delivery?',
      description: isDisable
        ? 'Delivery will be unavailable in this city.'
        : 'Delivery will be available in this city.',
      onConfirm: () => {
        const result = toggleCityDelivery(city.id)
        if (result.ok) {
          showSuccess(`Delivery ${city.deliveryEnabled ? 'disabled' : 'enabled'}`)
        } else {
          showError(result.error ?? 'Could not update delivery status.')
        }
        setConfirmState(null)
      },
    })
  }

  const columns = useMemo<GridColDef<City>[]>(
    () => [
      {
        field: 'name',
        headerName: 'City',
        flex: 1.3,
        minWidth: 220,
        renderCell: (params: GridRenderCellParams<City>) => (
          <Stack sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.slug}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'isActive',
        headerName: 'Active',
        minWidth: 120,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<City, boolean>) => (
          <StatusChip label={params.value ? 'Active' : 'Inactive'} active={Boolean(params.value)} />
        ),
      },
      {
        field: 'deliveryEnabled',
        headerName: 'Delivery',
        minWidth: 120,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<City, boolean>) => (
          <StatusChip label={params.value ? 'Enabled' : 'Disabled'} active={Boolean(params.value)} />
        ),
      },
      {
        field: 'commissionOverridePercentage',
        headerName: 'Commission Override (%)',
        minWidth: 190,
        flex: 1,
        valueGetter: (_value, row) => row.commissionOverridePercentage,
        renderCell: (params: GridRenderCellParams<City, number | null | undefined>) => (
          <Typography variant="body2">{params.value === null || params.value === undefined ? '-' : params.value}</Typography>
        ),
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<City, string>) => (
          <Typography variant="body2">{formatDateTime(String(params.value))}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 280,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<City>) => (
          <Stack direction="row" spacing={1} sx={{ py: 1 }}>
            <Tooltip title="Edit">
              <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(params.row)}>
                Edit
              </Button>
            </Tooltip>
            <Button
              size="small"
              variant="outlined"
              color={params.row.isActive ? 'warning' : 'success'}
              startIcon={params.row.isActive ? <ToggleOffRoundedIcon /> : <ToggleOnRoundedIcon />}
              onClick={() => handleToggleActive(params.row)}
            >
              {params.row.isActive ? 'Deactivate' : 'Activate'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color={params.row.deliveryEnabled ? 'warning' : 'success'}
              startIcon={params.row.deliveryEnabled ? <ToggleOffRoundedIcon /> : <ToggleOnRoundedIcon />}
              onClick={() => handleToggleDelivery(params.row)}
            >
              {params.row.deliveryEnabled ? 'Disable Delivery' : 'Enable Delivery'}
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader
        title="Cities"
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" onClick={openAddDialog}>
              Add City
            </Button>
          </Stack>
        }
      />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              placeholder="Search by city name or slug"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>

            <TextField
              select
              label="Delivery"
              value={deliveryFilter}
              onChange={(event) => setDeliveryFilter(event.target.value as 'all' | 'enabled' | 'disabled')}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="enabled">Enabled</MenuItem>
              <MenuItem value="disabled">Disabled</MenuItem>
            </TextField>
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
        ) : filteredCities.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No results"
              description="No cities match your current filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          </CardContent>
        ) : (
          <Box sx={{ p: 1.5 }}>
            <DataGridContainer>
              <DataGrid
                rows={filteredCities}
                columns={columns}
                disableRowSelectionOnClick
                autoHeight
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      page: 0,
                      pageSize: 10,
                    },
                  },
                }}
              />
            </DataGridContainer>
          </Box>
        )}
      </Card>

      <CityFormDialog
        open={formOpen}
        mode={dialogMode}
        city={selectedCity}
        cities={cities}
        onClose={() => setFormOpen(false)}
        onSubmit={dialogMode === 'add' ? handleAddCity : handleEditCity}
      />

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onClose={() => setConfirmState(null)}
        onConfirm={() => confirmState?.onConfirm()}
      />
    </>
  )
}

export default CitiesPage
