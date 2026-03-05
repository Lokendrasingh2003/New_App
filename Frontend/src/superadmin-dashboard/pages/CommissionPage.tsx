import { Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { useSuperAdminStore } from '../store/SuperAdminStore'
import type { CommissionScope } from '../types/CommissionConfig'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import ConfirmDialog from '../ui/ConfirmDialog'
import PageHeader from '../ui/PageHeader'

type OverrideScopeType = 'city' | 'category' | 'shop'

type OverrideDialogState = {
  open: boolean
  scope: OverrideScopeType
  targetId: string
  percentage: string
}

type RemoveDialogState = {
  open: boolean
  scope: OverrideScopeType
  targetId: string
  label: string
}

const formatDateTime = (value: string) => new Date(value).toLocaleString()

const initialOverrideDialogState: OverrideDialogState = {
  open: false,
  scope: 'city',
  targetId: '',
  percentage: '',
}

const initialRemoveDialogState: RemoveDialogState = {
  open: false,
  scope: 'city',
  targetId: '',
  label: '',
}

const CommissionPage = () => {
  const {
    commission,
    cities,
    categories,
    shops,
    syncCommission,
    setDefaultCommission,
    upsertCityOverride,
    removeCityOverride,
    upsertCategoryOverride,
    removeCategoryOverride,
    upsertShopOverride,
    removeShopOverride,
    getEffectiveCommission,
  } = useSuperAdminStore()
  const { showSuccess, showError } = useAppSnackbar()

  const [defaultInput, setDefaultInput] = useState(String(commission.defaultPercentage))
  const [overrideDialog, setOverrideDialog] = useState<OverrideDialogState>(initialOverrideDialogState)
  const [removeDialog, setRemoveDialog] = useState<RemoveDialogState>(initialRemoveDialogState)
  const [previewCityId, setPreviewCityId] = useState('')
  const [previewCategoryId, setPreviewCategoryId] = useState('')
  const [previewShopId, setPreviewShopId] = useState('')

  useEffect(() => {
    let mounted = true

    const run = async () => {
      const result = await syncCommission()
      if (!result.ok && mounted) {
        showError(result.error ?? 'Could not load commission settings from backend.')
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [showError, syncCommission])

  const cityMap = useMemo(() => new Map(cities.map((item) => [item.id, item])), [cities])
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories])
  const shopMap = useMemo(() => new Map(shops.map((item) => [item.id, item])), [shops])

  const defaultValidationError = useMemo(() => {
    const value = Number(defaultInput)
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return 'Default commission must be a valid number.'
    }

    if (value < 0 || value > 100) {
      return 'Default commission must be between 0 and 100.'
    }

    return undefined
  }, [defaultInput])

  const overrideValidationError = useMemo(() => {
    if (!overrideDialog.targetId.trim()) {
      return 'Please select a target.'
    }

    const value = Number(overrideDialog.percentage)
    if (!Number.isFinite(value) || Number.isNaN(value)) {
      return 'Commission must be a valid number.'
    }

    if (value < 0 || value > 100) {
      return 'Commission must be between 0 and 100.'
    }

    return undefined
  }, [overrideDialog.percentage, overrideDialog.targetId])

  const previewScope = useMemo<CommissionScope>(
    () => ({
      cityId: previewCityId || undefined,
      categoryId: previewCategoryId || undefined,
      shopId: previewShopId || undefined,
    }),
    [previewCategoryId, previewCityId, previewShopId],
  )

  const previewResult = useMemo(() => {
    const percentage = getEffectiveCommission(previewScope)

    if (previewScope.shopId) {
      const shopOverride = commission.shopOverrides.find((item) => item.shopId === previewScope.shopId)
      if (shopOverride) {
        return {
          percentage,
          appliedRule: 'Shop override applied (priority: Shop > Category > City > Default).',
        }
      }
    }

    if (previewScope.categoryId) {
      const categoryOverride = commission.categoryOverrides.find((item) => item.categoryId === previewScope.categoryId)
      if (categoryOverride) {
        return {
          percentage,
          appliedRule: 'Category override applied (priority: Category > City > Default).',
        }
      }
    }

    if (previewScope.cityId) {
      const cityOverride = commission.cityOverrides.find((item) => item.cityId === previewScope.cityId)
      if (cityOverride) {
        return {
          percentage,
          appliedRule: 'City override applied (priority: City > Default).',
        }
      }
    }

    return {
      percentage,
      appliedRule: 'Default commission applied.',
    }
  }, [commission.categoryOverrides, commission.cityOverrides, commission.shopOverrides, getEffectiveCommission, previewScope])

  const cityColumns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'cityLabel',
        headerName: 'City',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'percentage',
        headerName: 'Commission %',
        minWidth: 140,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{params.row.percentage}%</Typography>,
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 180,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setOverrideDialog({
                  open: true,
                  scope: 'city',
                  targetId: String(params.row.cityId),
                  percentage: String(params.row.percentage),
                })
              }
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              onClick={() =>
                setRemoveDialog({
                  open: true,
                  scope: 'city',
                  targetId: String(params.row.cityId),
                  label: String(params.row.cityLabel),
                })
              }
            >
              Remove
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  const categoryColumns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'categoryLabel',
        headerName: 'Category',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'percentage',
        headerName: 'Commission %',
        minWidth: 140,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{params.row.percentage}%</Typography>,
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 180,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setOverrideDialog({
                  open: true,
                  scope: 'category',
                  targetId: String(params.row.categoryId),
                  percentage: String(params.row.percentage),
                })
              }
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              onClick={() =>
                setRemoveDialog({
                  open: true,
                  scope: 'category',
                  targetId: String(params.row.categoryId),
                  label: String(params.row.categoryLabel),
                })
              }
            >
              Remove
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  const shopColumns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'shopLabel',
        headerName: 'Shop',
        minWidth: 220,
        flex: 1,
      },
      {
        field: 'percentage',
        headerName: 'Commission %',
        minWidth: 140,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{params.row.percentage}%</Typography>,
      },
      {
        field: 'updatedAt',
        headerName: 'Updated At',
        minWidth: 190,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams) => <Typography variant="body2">{formatDateTime(params.row.updatedAt)}</Typography>,
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 180,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams) => (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setOverrideDialog({
                  open: true,
                  scope: 'shop',
                  targetId: String(params.row.shopId),
                  percentage: String(params.row.percentage),
                })
              }
            >
              Edit
            </Button>
            <Button
              size="small"
              color="error"
              onClick={() =>
                setRemoveDialog({
                  open: true,
                  scope: 'shop',
                  targetId: String(params.row.shopId),
                  label: String(params.row.shopLabel),
                })
              }
            >
              Remove
            </Button>
          </Stack>
        ),
      },
    ],
    [],
  )

  const cityRows = useMemo(
    () =>
      commission.cityOverrides.map((item) => ({
        ...item,
        id: item.cityId,
        cityLabel: cityMap.get(item.cityId)?.name ?? `Missing city (${item.cityId})`,
      })),
    [cityMap, commission.cityOverrides],
  )

  const categoryRows = useMemo(
    () =>
      commission.categoryOverrides.map((item) => ({
        ...item,
        id: item.categoryId,
        categoryLabel: categoryMap.get(item.categoryId)?.name ?? `Missing category (${item.categoryId})`,
      })),
    [categoryMap, commission.categoryOverrides],
  )

  const shopRows = useMemo(
    () =>
      commission.shopOverrides.map((item) => ({
        ...item,
        id: item.shopId,
        shopLabel: shopMap.get(item.shopId)?.shopName ?? `Missing shop (${item.shopId})`,
      })),
    [commission.shopOverrides, shopMap],
  )

  const handleSaveOverride = async () => {
    if (overrideValidationError) {
      showError(overrideValidationError)
      return
    }

    const percentage = Number(overrideDialog.percentage)

    const result =
      overrideDialog.scope === 'city'
        ? await upsertCityOverride(overrideDialog.targetId, percentage)
        : overrideDialog.scope === 'category'
          ? await upsertCategoryOverride(overrideDialog.targetId, percentage)
          : await upsertShopOverride(overrideDialog.targetId, percentage)

    if (!result.ok) {
      showError(result.error ?? 'Could not save override.')
      return
    }

    showSuccess('Override saved')
    setOverrideDialog(initialOverrideDialogState)
  }

  return (
    <>
      <PageHeader title="Commission Engine" />

      <Stack spacing={2} sx={{ mb: 2 }}>
        <Card>
          <CardContent>
            <Stack spacing={1.5} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Default Commission (%)"
                value={defaultInput}
                onChange={(event) => setDefaultInput(event.target.value)}
                type="number"
                error={Boolean(defaultValidationError)}
                helperText={defaultValidationError ?? 'Valid range: 0 to 100'}
                sx={{ minWidth: { xs: '100%', sm: 280 } }}
              />
              <Button
                variant="contained"
                disabled={Boolean(defaultValidationError)}
                onClick={async () => {
                  const result = await setDefaultCommission(Number(defaultInput))
                  if (!result.ok) {
                    showError(result.error ?? 'Could not save default commission.')
                    return
                  }

                  showSuccess('Default commission updated')
                }}
              >
                Save Default
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Effective Commission Preview
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
                <TextField
                  select
                  label="City"
                  value={previewCityId}
                  onChange={(event) => setPreviewCityId(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  {cities.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Category"
                  value={previewCategoryId}
                  onChange={(event) => setPreviewCategoryId(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  {categories.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Shop"
                  value={previewShopId}
                  onChange={(event) => setPreviewShopId(event.target.value)}
                  fullWidth
                >
                  <MenuItem value="">None</MenuItem>
                  {shops.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.shopName}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {previewResult.percentage}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {previewResult.appliedRule}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <PageHeader
              title="City Overrides"
              actions={
                <Button
                  variant="outlined"
                  onClick={() =>
                    setOverrideDialog({
                      open: true,
                      scope: 'city',
                      targetId: '',
                      percentage: '',
                    })
                  }
                >
                  Add City Override
                </Button>
              }
            />
            <DataGridContainer>
              <DataGrid rows={cityRows} columns={cityColumns} autoHeight disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]} />
            </DataGridContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <PageHeader
              title="Category Overrides"
              actions={
                <Button
                  variant="outlined"
                  onClick={() =>
                    setOverrideDialog({
                      open: true,
                      scope: 'category',
                      targetId: '',
                      percentage: '',
                    })
                  }
                >
                  Add Category Override
                </Button>
              }
            />
            <DataGridContainer>
              <DataGrid
                rows={categoryRows}
                columns={categoryColumns}
                autoHeight
                disableRowSelectionOnClick
                pageSizeOptions={[5, 10, 25]}
              />
            </DataGridContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <PageHeader
              title="Shop Overrides"
              actions={
                <Button
                  variant="outlined"
                  onClick={() =>
                    setOverrideDialog({
                      open: true,
                      scope: 'shop',
                      targetId: '',
                      percentage: '',
                    })
                  }
                >
                  Add Shop Override
                </Button>
              }
            />
            <DataGridContainer>
              <DataGrid rows={shopRows} columns={shopColumns} autoHeight disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]} />
            </DataGridContainer>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={overrideDialog.open} onClose={() => setOverrideDialog(initialOverrideDialogState)} fullWidth maxWidth="sm">
        <DialogTitle>{overrideDialog.targetId ? 'Edit Override' : 'Add Override'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField
              select
              label={overrideDialog.scope === 'city' ? 'City' : overrideDialog.scope === 'category' ? 'Category' : 'Shop'}
              value={overrideDialog.targetId}
              onChange={(event) => setOverrideDialog((previous) => ({ ...previous, targetId: event.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select</MenuItem>
              {overrideDialog.scope === 'city'
                ? cities.map((item) => (
                    <MenuItem key={item.id} value={item.id}>
                      {item.name}
                    </MenuItem>
                  ))
                : overrideDialog.scope === 'category'
                  ? categories.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.name}
                      </MenuItem>
                    ))
                  : shops.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.shopName}
                      </MenuItem>
                    ))}
            </TextField>

            <TextField
              label="Commission (%)"
              type="number"
              value={overrideDialog.percentage}
              onChange={(event) => setOverrideDialog((previous) => ({ ...previous, percentage: event.target.value }))}
              error={Boolean(overrideValidationError)}
              helperText={overrideValidationError ?? 'Valid range: 0 to 100'}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOverrideDialog(initialOverrideDialogState)}>Cancel</Button>
          <Button variant="contained" disabled={Boolean(overrideValidationError)} onClick={async () => await handleSaveOverride()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={removeDialog.open}
        title="Remove override?"
        description={`This will remove the ${removeDialog.scope} override for ${removeDialog.label}.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={() => setRemoveDialog(initialRemoveDialogState)}
        onConfirm={async () => {
          const result =
            removeDialog.scope === 'city'
              ? await removeCityOverride(removeDialog.targetId)
              : removeDialog.scope === 'category'
                ? await removeCategoryOverride(removeDialog.targetId)
                : await removeShopOverride(removeDialog.targetId)

          if (!result.ok) {
            showError(result.error ?? 'Could not remove override.')
            return
          }

          showSuccess('Override removed')
          setRemoveDialog(initialRemoveDialogState)
        }}
      />
    </>
  )
}

export default CommissionPage
