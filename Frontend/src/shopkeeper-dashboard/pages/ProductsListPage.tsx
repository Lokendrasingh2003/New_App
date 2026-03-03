import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConfirmDialog from '../components/ConfirmDialog'
import EmptyStateCard from '../components/EmptyStateCard'
import PageHeader from '../components/PageHeader'
import type { Product } from '../types/product'
import { getShopkeeperShopId } from '../shared/auth/authStore'
import { useAppFeedback } from '../shared/ui/AppFeedbackProvider'
import {
  deleteProduct as deleteProductApi,
  getProducts,
  updateProduct as updateProductApi,
  updateStock,
} from '../services/productService'

type StockFilter = 'ALL' | 'LOW' | 'OUT' | 'IN'
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'

const ProductsListPage = () => {
  const navigate = useNavigate()
  const shopId = getShopkeeperShopId()
  const { showMessage } = useAppFeedback()
  const [products, setProducts] = useState<Product[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL')
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL')
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 })
  const [actionProductId, setActionProductId] = useState<string | null>(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [viewProductId, setViewProductId] = useState<string | null>(null)

  useEffect(() => {
    if (!shopId) {
      setIsLoading(false)
      setPageError('Shop not found for current session.')
      return
    }

    const timer = window.setTimeout(() => {
      const loadProducts = async () => {
        try {
          setPageError('')
          setIsLoading(true)

          const response = await getProducts(shopId, {
            search: searchQuery.trim() || undefined,
            category: categoryFilter === 'ALL' ? undefined : categoryFilter,
            active:
              activeFilter === 'ALL'
                ? undefined
                : activeFilter === 'ACTIVE',
            limit: 100,
            offset: 0,
          })

          setProducts(response.products)
          setTotalProducts(response.pagination.total)
        } catch (error) {
          setPageError(error instanceof Error ? error.message : 'Unable to load products.')
        } finally {
          setIsLoading(false)
        }
      }

      void loadProducts()
    }, 320)

    return () => window.clearTimeout(timer)
  }, [activeFilter, categoryFilter, searchQuery, shopId])

  const categories = useMemo(
    () => Array.from(new Set(products.map((item) => item.category))).sort(),
    [products],
  )

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      const matchesCategory = categoryFilter === 'ALL' || product.category === categoryFilter
      const matchesStock =
        stockFilter === 'ALL' ||
        (stockFilter === 'LOW' && product.stockQty > 0 && product.stockQty <= 10) ||
        (stockFilter === 'OUT' && product.stockQty <= 0) ||
        (stockFilter === 'IN' && product.stockQty > 0)
      const matchesActive =
        activeFilter === 'ALL' ||
        (activeFilter === 'ACTIVE' && product.active) ||
        (activeFilter === 'INACTIVE' && !product.active)

      return matchesSearch && matchesCategory && matchesStock && matchesActive
    })
  }, [products, searchQuery, categoryFilter, stockFilter, activeFilter])

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }))
  }, [searchQuery, categoryFilter, stockFilter, activeFilter])

  const toUpsertPayload = (product: Product, activeOverride?: boolean) => {
    if (!product.categoryId) {
      throw new Error('Category ID missing for selected product.')
    }

    return {
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      categoryName: product.category,
      subcategoryName: product.subcategory,
      images: product.images,
      active: typeof activeOverride === 'boolean' ? activeOverride : product.active,
      variants: product.variants.map((variant) => {
        const stockQty = Math.max(0, Number(variant.stockQty || 0))
        return {
          id: variant.id,
          label: variant.label,
          price: Number(variant.price),
          mrp: Number(variant.mrp),
          inStock: Boolean(variant.inStock && stockQty > 0),
          stockQty,
        }
      }),
    }
  }

  const handleToggleInStock = async (product: Product, checked: boolean) => {
    if (!shopId) {
      showMessage('Shop not found for current session.')
      return
    }

    try {
      setActionProductId(product.id)

      const variantUpdates = product.variants.map((variant) => ({
        id: variant.id,
        stockQty: Math.max(0, Number(variant.stockQty || 0)),
        inStock: checked ? Boolean(variant.inStock) : false,
      }))

      if (checked && variantUpdates.every((variant) => variant.stockQty <= 0) && variantUpdates.length > 0) {
        variantUpdates[0] = {
          ...variantUpdates[0],
          stockQty: 1,
          inStock: true,
        }
      }

      const updatedProduct = await updateStock(shopId, product.id, variantUpdates)
      setProducts((prev) => prev.map((item) => (item.id === product.id ? updatedProduct : item)))
      showMessage(`Updated stock status for ${product.name}`)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to update stock.')
    } finally {
      setActionProductId(null)
    }
  }

  const handleActivateProduct = async (product: Product, nextActive: boolean) => {
    if (!shopId) {
      showMessage('Shop not found for current session.')
      return
    }

    try {
      setActionProductId(product.id)
      const updatedProduct = await updateProductApi(shopId, product.id, toUpsertPayload(product, nextActive))
      setProducts((prev) => prev.map((item) => (item.id === product.id ? updatedProduct : item)))
      showMessage(`${nextActive ? 'Activated' : 'Deactivated'} ${product.name}`)
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Unable to update product status.')
    } finally {
      setActionProductId(null)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Product',
      flex: 1.3,
      minWidth: 190,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1.2} alignItems="center" sx={{ py: 0.5 }}>
          <Box
            component="img"
            src={params.row.images[0] ? `/${params.row.images[0]}` : '/vite.svg'}
            alt={params.row.name}
            onError={(event: React.SyntheticEvent<HTMLImageElement>) => {
              event.currentTarget.src = '/vite.svg'
            }}
            sx={{
              width: 36,
              height: 36,
              objectFit: 'cover',
              borderRadius: 1,
              bgcolor: 'grey.100',
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {params.row.name}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'category',
      headerName: 'Category / Subcategory',
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Stack spacing={0.1}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.row.category}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.subcategory || '-'}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'price',
      headerName: 'Price / MRP',
      flex: 0.9,
      minWidth: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Stack spacing={0.1}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            From ₹{params.row.basePrice}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            MRP ₹{params.row.baseMrp}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'variants',
      headerName: 'Variants',
      flex: 0.6,
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      valueGetter: (_, row) => row.variants.length,
    },
    {
      field: 'stockQty',
      headerName: 'Stock Qty',
      flex: 0.7,
      minWidth: 90,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'inStock',
      headerName: 'In Stock',
      flex: 0.7,
      minWidth: 98,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Switch
          size="small"
          checked={Boolean(params.row.inStock)}
          inputProps={{ 'aria-label': `toggle in stock for ${params.row.name}` }}
          disabled={actionProductId === params.row.id}
          onChange={(_, checked) => {
            void handleToggleInStock(params.row as Product, checked)
          }}
        />
      ),
    },
    {
      field: 'active',
      headerName: 'Active',
      flex: 0.7,
      minWidth: 88,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Switch
          size="small"
          checked={Boolean(params.row.active)}
          inputProps={{ 'aria-label': `toggle active for ${params.row.name}` }}
          disabled={actionProductId === params.row.id}
          onChange={() => {
            if (params.row.active) {
              setConfirmDeactivate({ id: params.row.id, name: params.row.name })
              return
            }

            void handleActivateProduct(params.row as Product, true)
          }}
        />
      ),
    },
    {
      field: 'updatedAt',
      headerName: 'Updated At',
      flex: 0.95,
      minWidth: 140,
      valueFormatter: (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.95,
      minWidth: 140,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => setViewProductId(params.row.id)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => navigate(`/shop/products/${params.row.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setConfirmDelete({ id: params.row.id, name: params.row.name })}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ]

  const viewProduct = viewProductId ? filteredProducts.find((item) => item.id === viewProductId) : null
  const activeProductsCount = products.filter((item) => item.active).length
  const lowStockCount = products.filter((item) => item.stockQty > 0 && item.stockQty <= 10).length
  const outOfStockCount = products.filter((item) => item.stockQty <= 0).length

  return (
    <Container maxWidth="xl" sx={{ py: 2.5 }}>
      <Stack spacing={2.5}>
        <PageHeader
          title="Products"
          subtitle="Manage your product catalog"
          actions={[
            {
              label: 'Add Product',
              onClick: () => navigate('/shop/products/new'),
              variant: 'contained',
              color: 'primary',
            },
          ]}
        />

        {pageError ? <Alert severity="error">{pageError}</Alert> : null}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Total Products</Typography>
            <Typography variant="h6">{totalProducts}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Active</Typography>
            <Typography variant="h6">{activeProductsCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Low Stock</Typography>
            <Typography variant="h6">{lowStockCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, border: '1px solid rgba(15,23,42,0.08)', borderRadius: 2.5, p: 1.5, bgcolor: 'background.paper' }}>
            <Typography variant="caption" color="text.secondary">Out of Stock</Typography>
            <Typography variant="h6">{outOfStockCount}</Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            backgroundColor: 'background.paper',
            p: 2,
            borderRadius: 2.5,
            border: '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <Typography variant="subtitle2" sx={{ mb: 1.25, color: 'text.secondary', fontWeight: 700 }}>
            FILTERS
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'flex-end' }}>
            <TextField
              placeholder="Search by product name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />

            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <MenuItem value="ALL">All</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 170 }}>
              <InputLabel>Stock</InputLabel>
              <Select
                label="Stock"
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as StockFilter)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="LOW">Low stock</MenuItem>
                <MenuItem value="OUT">Out of stock</MenuItem>
                <MenuItem value="IN">In stock</MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Active</InputLabel>
              <Select
                label="Active"
                value={activeFilter}
                onChange={(event) => setActiveFilter(event.target.value as ActiveFilter)}
              >
                <MenuItem value="ALL">All</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ bgcolor: 'background.paper', borderRadius: 2.5, border: '1px solid rgba(15,23,42,0.08)', p: 2.5 }}>
            <Stack spacing={1.25}>
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
              <Skeleton variant="rounded" height={38} />
            </Stack>
          </Box>
        ) : filteredProducts.length === 0 ? (
          <EmptyStateCard
            title="No results found"
            description="Try changing filters or search."
            actionLabel="Add Product"
            onAction={() => navigate('/shop/products/new')}
          />
        ) : (
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
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={1}
              sx={{ px: 2.25, py: 1.8, borderBottom: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Box>
                <Typography variant="h6">Product Catalog</Typography>
                <Typography variant="body2" color="text.secondary">Track stock, availability and active listings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Showing {filteredProducts.length} products</Typography>
            </Stack>

            <Box sx={{ overflowX: 'auto', p: 1 }}>
              <DataGrid
                autoHeight
                rows={filteredProducts}
                columns={columns}
                disableRowSelectionOnClick
                density="compact"
                pagination
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50]}
                sx={{
                  border: 'none',
                  minWidth: 980,
                }}
              />
            </Box>
          </Box>
        )}
      </Stack>

      <ConfirmDialog
        open={Boolean(confirmDeactivate)}
        title="Deactivate product?"
        description={`This will hide ${confirmDeactivate?.name ?? 'this product'} from active listings.`}
        confirmText="Deactivate"
        confirmColor="error"
        onCancel={() => setConfirmDeactivate(null)}
        onConfirm={() => {
          if (!confirmDeactivate) {
            return
          }

          const product = products.find((item) => item.id === confirmDeactivate.id)
          if (!product) {
            setConfirmDeactivate(null)
            return
          }

          void handleActivateProduct(product, false)
          setConfirmDeactivate(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete product?"
        description={`This will permanently remove ${confirmDelete?.name ?? 'this product'} from the list.`}
        confirmText="Delete"
        confirmColor="error"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (!confirmDelete) {
            return
          }

          if (!shopId) {
            showMessage('Shop not found for current session.')
            setConfirmDelete(null)
            return
          }

          void (async () => {
            try {
              setActionProductId(confirmDelete.id)
              await deleteProductApi(shopId, confirmDelete.id)
              setProducts((prev) => prev.filter((item) => item.id !== confirmDelete.id))
              setTotalProducts((prev) => Math.max(0, prev - 1))
              showMessage(`Deleted ${confirmDelete.name}`)
              if (viewProductId === confirmDelete.id) {
                setViewProductId(null)
              }
            } catch (error) {
              showMessage(error instanceof Error ? error.message : 'Unable to delete product.')
            } finally {
              setActionProductId(null)
              setConfirmDelete(null)
            }
          })()
        }}
      />

      <Dialog open={Boolean(viewProduct)} onClose={() => setViewProductId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {viewProduct && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Typography variant="body2"><strong>Name:</strong> {viewProduct.name}</Typography>
              <Typography variant="body2"><strong>Category:</strong> {viewProduct.category} / {viewProduct.subcategory || '-'}</Typography>
              <Typography variant="body2"><strong>Price:</strong> ₹{viewProduct.basePrice} (MRP ₹{viewProduct.baseMrp})</Typography>
              <Typography variant="body2"><strong>Stock Qty:</strong> {viewProduct.stockQty}</Typography>
              <Typography variant="body2"><strong>Variants:</strong> {viewProduct.variants.length}</Typography>
              <Typography variant="body2"><strong>Status:</strong> {viewProduct.active ? 'Active' : 'Inactive'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewProductId(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ProductsListPage
