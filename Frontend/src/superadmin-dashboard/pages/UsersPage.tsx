import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import {
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import DataGridContainer from '../modules/cities/DataGridContainer'
import { getAdminShopById } from '../services/adminShopsService'
import { getAdminUserById, listAdminUsers } from '../services/adminUsersService'
import type { Shop } from '../types/shop'
import type { AdminUser, AdminUserDetail } from '../types/user'
import { useAppSnackbar } from '../ui/AppSnackbarProvider'
import EmptyState from '../ui/EmptyState'
import PageHeader from '../ui/PageHeader'
import { useInitialLoadingDelay } from '../hooks/useInitialLoadingDelay'

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--'
  }

  return new Date(value).toLocaleString()
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const UsersPage = () => {
  const { showError } = useAppSnackbar()
  const isInitialLoading = useInitialLoadingDelay()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null)
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null)
  const [isLoadingShopDetail, setIsLoadingShopDetail] = useState(false)
  const [search, setSearch] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const items = await listAdminUsers({ search, verified: verifiedFilter })
        if (mounted) {
          setUsers(items)
        }
      } catch (error) {
        if (mounted) {
          showError(error instanceof Error ? error.message : 'Could not load users.')
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [search, showError, verifiedFilter])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null)
      return
    }

    let mounted = true

    const loadDetail = async () => {
      try {
        setIsLoadingDetail(true)
        const detail = await getAdminUserById(selectedUserId)
        if (mounted) {
          setSelectedUser(detail)
        }
      } catch (error) {
        if (mounted) {
          showError(error instanceof Error ? error.message : 'Could not load user details.')
        }
      } finally {
        if (mounted) {
          setIsLoadingDetail(false)
        }
      }
    }

    loadDetail()

    return () => {
      mounted = false
    }
  }, [selectedUserId, showError])

  useEffect(() => {
    if (!selectedShopId) {
      setSelectedShop(null)
      return
    }

    let mounted = true

    const loadShopDetail = async () => {
      try {
        setIsLoadingShopDetail(true)
        const detail = await getAdminShopById(selectedShopId)
        if (mounted) {
          setSelectedShop(detail)
        }
      } catch (error) {
        if (mounted) {
          showError(error instanceof Error ? error.message : 'Could not load shop details.')
        }
      } finally {
        if (mounted) {
          setIsLoadingShopDetail(false)
        }
      }
    }

    loadShopDetail()

    return () => {
      mounted = false
    }
  }, [selectedShopId, showError])

  const filteredUsers = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return users.filter((user) => {
      const verifiedMatch =
        verifiedFilter === 'all' || (verifiedFilter === 'verified' ? user.isVerified : !user.isVerified)

      const searchMatch =
        !searchValue ||
        user.phone.toLowerCase().includes(searchValue) ||
        (user.name || '').toLowerCase().includes(searchValue) ||
        (user.email || '').toLowerCase().includes(searchValue) ||
        (user.cityName || '').toLowerCase().includes(searchValue) ||
        (user.shopName || '').toLowerCase().includes(searchValue)

      return verifiedMatch && searchMatch
    })
  }, [search, users, verifiedFilter])

  const columns = useMemo<GridColDef<AdminUser>[]>(
    () => [
      {
        field: 'shopName',
        headerName: 'Shop Name',
        minWidth: 220,
        flex: 1,
        renderCell: (params: GridRenderCellParams<AdminUser>) => {
          if (params.row.role !== 'SHOPKEEPER' || !params.row.shopId || !params.row.shopName) {
            return <Typography variant="body2">{params.row.role === 'SHOPKEEPER' ? params.row.shopName || '--' : '--'}</Typography>
          }

          return (
            <Button
              size="small"
              variant="text"
              sx={{ justifyContent: 'flex-start', px: 0, minWidth: 0, textTransform: 'none' }}
              onClick={() => setSelectedShopId(params.row.shopId || null)}
            >
              {params.row.shopName}
            </Button>
          )
        },
      },
      {
        field: 'name',
        headerName: 'User',
        minWidth: 240,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<AdminUser>) => (
          <Stack sx={{ py: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {params.row.name || '--'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {params.row.phone}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        minWidth: 220,
        flex: 1,
        renderCell: (params: GridRenderCellParams<AdminUser, string | null>) => (
          <Typography variant="body2">{params.value || '--'}</Typography>
        ),
      },
      {
        field: 'isVerified',
        headerName: 'Verified',
        minWidth: 120,
        flex: 0.6,
        renderCell: (params: GridRenderCellParams<AdminUser, boolean>) => (
          <Chip
            size="small"
            label={params.value ? 'Verified' : 'Pending'}
            color={params.value ? 'success' : 'warning'}
            variant={params.value ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        minWidth: 130,
        flex: 0.7,
        renderCell: (params: GridRenderCellParams<AdminUser, string>) => (
          <Chip
            size="small"
            label={params.value === 'SHOPKEEPER' ? 'Shopkeeper' : 'User'}
            color={params.value === 'SHOPKEEPER' ? 'info' : 'default'}
            variant={params.value === 'SHOPKEEPER' ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'cityName',
        headerName: 'City',
        minWidth: 150,
        flex: 0.8,
        renderCell: (params: GridRenderCellParams<AdminUser, string | null>) => (
          <Typography variant="body2">{params.value || '--'}</Typography>
        ),
      },
      {
        field: 'orderCount',
        headerName: 'Orders',
        minWidth: 110,
        flex: 0.6,
        valueGetter: (_value, row) => row.orderStats.count,
      },
      {
        field: 'totalSpent',
        headerName: 'Total Spent',
        minWidth: 150,
        flex: 0.8,
        valueGetter: (_value, row) => row.orderStats.totalSpent,
        renderCell: (params: GridRenderCellParams<AdminUser, number>) => (
          <Typography variant="body2">{currency.format(Number(params.value || 0))}</Typography>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Joined',
        minWidth: 180,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<AdminUser, string>) => (
          <Typography variant="body2">{formatDateTime(params.value)}</Typography>
        ),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        minWidth: 140,
        flex: 0.7,
        sortable: false,
        filterable: false,
        renderCell: (params: GridRenderCellParams<AdminUser>) => (
          <Button
            size="small"
            variant="outlined"
            startIcon={<VisibilityRoundedIcon />}
            onClick={() => setSelectedUserId(params.row.id)}
          >
            Details
          </Button>
        ),
      },
    ],
    [],
  )

  return (
    <>
      <PageHeader title="Users" />

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              label="Search"
              placeholder="Search by name, phone, email, city"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Verification"
              value={verifiedFilter}
              onChange={(event) => setVerifiedFilter(event.target.value as 'all' | 'verified' | 'unverified')}
              sx={{ minWidth: { xs: '100%', md: 190 } }}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="verified">Verified</MenuItem>
              <MenuItem value="unverified">Pending</MenuItem>
            </TextField>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        {isInitialLoading ? (
          <CardContent>
            <Stack spacing={1}>
              <Skeleton variant="rounded" height={42} />
              <Skeleton variant="rounded" height={42} />
              <Skeleton variant="rounded" height={42} />
              <Skeleton variant="rounded" height={42} />
            </Stack>
          </CardContent>
        ) : filteredUsers.length === 0 ? (
          <CardContent>
            <EmptyState
              title="No users found"
              description="No users match current filters."
              actionLabel={search || verifiedFilter !== 'all' ? 'Reset Filters' : undefined}
              onAction={
                search || verifiedFilter !== 'all'
                  ? () => {
                      setSearch('')
                      setVerifiedFilter('all')
                    }
                  : undefined
              }
            />
          </CardContent>
        ) : (
          <DataGridContainer>
            <DataGrid
              autoHeight
              rows={filteredUsers}
              columns={columns}
              getRowId={(row) => row.id}
              disableRowSelectionOnClick
              pageSizeOptions={[10, 25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 25,
                    page: 0,
                  },
                },
              }}
            />
          </DataGridContainer>
        )}
      </Card>

      <Dialog
        open={Boolean(selectedShopId)}
        onClose={() => {
          setSelectedShopId(null)
          setSelectedShop(null)
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Shop Details</DialogTitle>
        <DialogContent dividers>
          {isLoadingShopDetail || !selectedShop ? (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Skeleton variant="rounded" height={28} />
              <Skeleton variant="rounded" height={28} />
              <Skeleton variant="rounded" height={28} />
              <Skeleton variant="rounded" height={90} />
            </Stack>
          ) : (
            <Stack spacing={1.1} sx={{ pt: 1 }}>
              <Typography variant="body2">Shop Name: {selectedShop.shopName || '--'}</Typography>
              <Typography variant="body2">Shop ID: {selectedShop.id || '--'}</Typography>
              <Typography variant="body2">Owner: {selectedShop.ownerName || '--'}</Typography>
              <Typography variant="body2">Phone: {selectedShop.phone || '--'}</Typography>
              <Typography variant="body2">Category: {selectedShop.categoryName || '--'}</Typography>
              <Typography variant="body2">Slug: {selectedShop.slug || '--'}</Typography>
              <Typography variant="body2">Status: {selectedShop.status || '--'}</Typography>
              <Typography variant="body2">Address: {selectedShop.addressLine1 || '--'}</Typography>
              <Typography variant="body2">Area: {selectedShop.area || '--'}</Typography>
              <Typography variant="body2">Pincode: {selectedShop.pincode || '--'}</Typography>
              <Typography variant="body2">Description: {selectedShop.description || '--'}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
                Revenue Summary
              </Typography>
              <Typography variant="body2">Total Orders: {Number(selectedShop.totalOrders || 0)}</Typography>
              <Typography variant="body2">Total Revenue: {currency.format(Number(selectedShop.totalEarnings || 0))}</Typography>
              <Typography variant="body2">
                Commission: {selectedShop.commission !== undefined ? currency.format(Number(selectedShop.commission)) : '--'}
              </Typography>
              <Typography variant="body2">
                Payable Amount: {selectedShop.payableAmount !== undefined ? currency.format(Number(selectedShop.payableAmount)) : '--'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedShopId(null)
              setSelectedShop(null)
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer
        anchor="right"
        open={Boolean(selectedUserId)}
        onClose={() => {
          setSelectedUserId(null)
          setSelectedUser(null)
        }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 440 }, p: 2.5 } }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
          User Details
        </Typography>

        {isLoadingDetail || !selectedUser ? (
          <Stack spacing={1}>
            <Skeleton variant="rounded" height={28} />
            <Skeleton variant="rounded" height={28} />
            <Skeleton variant="rounded" height={28} />
            <Skeleton variant="rounded" height={90} />
          </Stack>
        ) : (
          <Stack spacing={1.1}>
            <Typography variant="body2">Name: {selectedUser.name || '--'}</Typography>
            <Typography variant="body2">Phone: {selectedUser.phone}</Typography>
            <Typography variant="body2">Email: {selectedUser.email || '--'}</Typography>
            <Typography variant="body2">Verified: {selectedUser.isVerified ? 'Yes' : 'No'}</Typography>
            <Typography variant="body2">Role: {selectedUser.role === 'SHOPKEEPER' ? 'Shopkeeper' : 'User'}</Typography>
            <Typography variant="body2">Shop Name: {selectedUser.shopName || '--'}</Typography>
            <Typography variant="body2">City: {selectedUser.cityName || '--'}</Typography>
            <Typography variant="body2">Shopkeeper ID: {selectedUser.shopkeeperId || '--'}</Typography>
            <Typography variant="body2">Shop ID: {selectedUser.shopId || '--'}</Typography>
            <Typography variant="body2">Referral Code: {selectedUser.referralCode || '--'}</Typography>
            <Typography variant="body2">Referred By: {selectedUser.referredBy || '--'}</Typography>
            <Typography variant="body2">Total Orders: {selectedUser.orderStats.count}</Typography>
            <Typography variant="body2">Total Spent: {currency.format(selectedUser.orderStats.totalSpent)}</Typography>
            <Typography variant="body2">Last Order: {formatDateTime(selectedUser.orderStats.lastOrderAt)}</Typography>
            <Typography variant="body2">Joined: {formatDateTime(selectedUser.createdAt)}</Typography>
            <Typography variant="body2">
              Default Address:{' '}
              {selectedUser.addresses.find((address) => address.isDefault)
                ? `${selectedUser.addresses.find((address) => address.isDefault)?.addressLine1 || ''}, ${selectedUser
                    .addresses.find((address) => address.isDefault)
                    ?.area || ''}, ${selectedUser.addresses.find((address) => address.isDefault)?.city || ''}`
                : '--'}
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
              Recent Orders
            </Typography>
            {selectedUser.recentOrders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No orders yet.
              </Typography>
            ) : (
              selectedUser.recentOrders.map((order) => (
                <Typography key={order.id} variant="body2">
                  {order.orderId} | {order.status} | {currency.format(order.total)} | {formatDateTime(order.createdAt)}
                </Typography>
              ))
            )}

            <Typography variant="subtitle2" sx={{ mt: 1, fontWeight: 700 }}>
              Shop Registrations
            </Typography>
            {selectedUser.shopRegistrations.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No registrations yet.
              </Typography>
            ) : (
              selectedUser.shopRegistrations.map((registration) => (
                <Typography key={registration.id} variant="body2">
                  {registration.shopName} | {registration.status} | Submitted {formatDateTime(registration.submittedAt)}
                </Typography>
              ))
            )}
          </Stack>
        )}
      </Drawer>
    </>
  )
}

export default UsersPage
