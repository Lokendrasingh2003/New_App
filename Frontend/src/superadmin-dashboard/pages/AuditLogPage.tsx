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
  FormControlLabel,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { AuditEvent } from '../types/AuditEvent'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { downloadCsv, toCsv } from '../utils/csv'
import { buildCsvFilename, toLocalDateISO } from '../utils/filename'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const formatTypeLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ')

const AuditLogPage = () => {
  const { auditEvents, clearAuditEvents } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [typeFilter, setTypeFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [last7DaysOnly, setLast7DaysOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const isInitialLoading = useInitialLoadingDelay()

  const typeOptions = useMemo(() => {
    const values = Array.from(new Set(auditEvents.map((event) => event.type))).sort((a, b) => a.localeCompare(b))
    return ['ALL', ...values]
  }, [auditEvents])

  const selectedEvent = useMemo(
    () => (selectedId ? auditEvents.find((event) => event.id === selectedId) ?? null : null),
    [auditEvents, selectedId],
  )

  const filteredEvents = useMemo(() => {
    const now = new Date().getTime()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const searchValue = search.trim().toLowerCase()

    return [...auditEvents]
      .filter((event) => {
        const typeMatch = typeFilter === 'ALL' || event.type === typeFilter
        const searchMatch = !searchValue || event.message.toLowerCase().includes(searchValue)
        const createdAtMs = new Date(event.createdAt).getTime()
        const dateMatch = !last7DaysOnly || (Number.isFinite(createdAtMs) && createdAtMs >= sevenDaysAgo)

        return typeMatch && searchMatch && dateMatch
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [auditEvents, last7DaysOnly, search, typeFilter])

  const handleClear = () => {
    const result = clearAuditEvents()
    if (!result.ok) {
      showError(result.error ?? 'Could not clear audit log.')
      return
    }

    showSuccess('Audit log cleared')
    setConfirmClearOpen(false)
    setSelectedId(null)
  }

  const handleExportCsv = () => {
    if (filteredEvents.length === 0) {
      showError('Nothing to export')
      return
    }

    const rows = filteredEvents.map((event) => ({
      createdAt: event.createdAt,
      type: event.type,
      message: event.message,
      actorUsername: event.actor.username,
    }))

    const csv = toCsv(rows)
    const isFiltered = typeFilter !== 'ALL' || search.trim().length > 0 || last7DaysOnly
    const filename = buildCsvFilename('audit', isFiltered, toLocalDateISO())
    downloadCsv(filename, csv)
  }

  const columns = useMemo<GridColDef<AuditEvent>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Time',
        minWidth: 180,
        flex: 0.9,
        valueFormatter: (value: string) => formatDateTime(value),
      },
      {
        field: 'type',
        headerName: 'Type',
        minWidth: 180,
        flex: 0.9,
        renderCell: ({ row }: GridRenderCellParams<AuditEvent, string>) => (
          <Chip size="small" variant="outlined" label={row.type} />
        ),
      },
      {
        field: 'message',
        headerName: 'Message',
        minWidth: 360,
        flex: 2,
      },
      {
        field: 'actor',
        headerName: 'Actor',
        minWidth: 170,
        flex: 0.9,
        valueGetter: (_value, row) => row.actor.username,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 130,
        flex: 0.7,
        sortable: false,
        filterable: false,
        renderCell: ({ row }: GridRenderCellParams<AuditEvent>) => (
          <Button size="small" variant="outlined" startIcon={<VisibilityRoundedIcon />} onClick={() => setSelectedId(row.id)}>
            View
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <Box>
      <PageHeader
        title="Audit Log"
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button variant="contained" color="error" onClick={() => setConfirmClearOpen(true)} disabled={auditEvents.length === 0}>
              Clear Log
            </Button>
          </Stack>
        }
      />

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              select
              size="small"
              label="Type"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            >
              {typeOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option === 'ALL' ? 'All' : formatTypeLabel(option)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small"
              label="Search message"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 280 } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={last7DaysOnly}
                  onChange={(event) => setLast7DaysOnly(event.target.checked)}
                />
              }
              label="Last 7 days"
            />
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
      ) : filteredEvents.length === 0 ? (
        <EmptyState title="No results" description="No events match the current filters." actionLabel="Clear filters" onAction={() => {
          setTypeFilter('ALL')
          setSearch('')
          setLast7DaysOnly(false)
        }} />
      ) : (
        <DataGridContainer>
          <DataGrid
            autoHeight
            rows={filteredEvents}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 20, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            sx={{ bgcolor: 'background.paper' }}
          />
        </DataGridContainer>
      )}

      <Dialog open={Boolean(selectedEvent)} onClose={() => setSelectedId(null)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>Audit Event Details</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 1.5, pt: '10px !important' }}>
          {selectedEvent ? (
            <>
              <Typography variant="body2" color="text.secondary">
                Time: {formatDateTime(selectedEvent.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Type: {selectedEvent.type}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Actor: {selectedEvent.actor.username}
              </Typography>
              <Typography variant="body1">{selectedEvent.message}</Typography>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.100', overflowX: 'auto' }}>
                <Typography component="pre" variant="caption" sx={{ m: 0 }}>
                  {JSON.stringify(selectedEvent.meta ?? {}, null, 2)}
                </Typography>
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSelectedId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear audit log?"
        description="This action will remove all audit events from local demo storage."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={handleClear}
      />
    </Box>
  )
}

export default AuditLogPage
