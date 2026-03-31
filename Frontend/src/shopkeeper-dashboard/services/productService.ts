import api from '../../utils/axiosInstance'
import type { Product, ProductVariant } from '../types/product'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type ProductApiModel = {
  _id: string
  name: string
  description?: string | null
  categoryId: string
  categoryName: string
  subcategoryName?: string | null
  images?: string[]
  basePrice?: number
  baseMrp?: number
  stockQty?: number
  inStock?: boolean
  active?: boolean
  variants?: Array<{
    id?: string
    label: string
    price: number
    mrp: number
    inStock?: boolean
    stockQty?: number
  }>
  updatedAt?: string
}

type ProductApiVariant = NonNullable<ProductApiModel['variants']>[number]

type ProductsListPayload = {
  products: ProductApiModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type ProductSinglePayload = {
  product: ProductApiModel
}

export type ProductListQuery = {
  search?: string
  category?: string
  active?: boolean
  limit?: number
  offset?: number
}

export type ProductListResponse = {
  products: Product[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type CategoriesListPayload = {
  categories: Array<{
    _id: string
    name: string
    subcategories?: Array<{
      name: string
    }>
  }>
}

export type CategoryMeta = {
  id: string
  name: string
  subcategories: string[]
}

export type ProductUpsertInput = {
  name: string
  description?: string
  categoryId: string
  categoryName: string
  subcategoryName?: string
  images: string[]
  active: boolean
  variants: Array<{
    id?: string
    label: string
    price: number
    mrp: number
    inStock: boolean
    stockQty: number
  }>
}

const mapVariant = (variant: ProductApiVariant, index: number): ProductVariant => ({
  id: String(variant.id || `var-${index + 1}`),
  label: String(variant.label || `Variant ${index + 1}`),
  price: Number(variant.price || 0),
  mrp: Number(variant.mrp || 0),
  inStock: Boolean(variant.inStock),
  stockQty: Number(variant.stockQty || 0),
})

const mapProduct = (product: ProductApiModel): Product => {
  const mappedVariants = (product.variants || []).map(mapVariant)
  const derivedStockQty = mappedVariants.reduce((total, variant) => total + Number(variant.stockQty || 0), 0)
  const derivedInStock = mappedVariants.some((variant) => Boolean(variant.inStock) && Number(variant.stockQty || 0) > 0)

  return {
    id: String(product._id),
    name: String(product.name || ''),
    description: String(product.description || ''),
    categoryId: String(product.categoryId || ''),
    category: String(product.categoryName || ''),
    subcategory: String(product.subcategoryName || ''),
    images: Array.isArray(product.images) ? product.images : [],
    basePrice: Number(product.basePrice ?? (mappedVariants[0]?.price || 0)),
    baseMrp: Number(product.baseMrp ?? (mappedVariants[0]?.mrp || 0)),
    stockQty: Number(product.stockQty ?? derivedStockQty),
    inStock: typeof product.inStock === 'boolean' ? product.inStock : derivedInStock,
    active: typeof product.active === 'boolean' ? product.active : true,
    variants: mappedVariants,
    updatedAt: String(product.updatedAt || new Date().toISOString()),
  }
}

const ensureProduct = (payload: ProductSinglePayload | undefined, fallbackMessage: string): Product => {
  const product = payload?.product
  if (!product) {
    throw new Error(fallbackMessage)
  }

  return mapProduct(product)
}

export const getProducts = async (shopId: string, query: ProductListQuery = {}): Promise<ProductListResponse> => {
  const { data } = await api.get<ApiEnvelope<ProductsListPayload>>(`/api/shops/${shopId}/products`, {
    params: query,
  })

  const payload = data?.data
  if (!payload) {
    throw new Error(data?.message || 'Unable to load products.')
  }

  return {
    products: (payload.products || []).map(mapProduct),
    pagination: payload.pagination,
  }
}

export const getProduct = async (shopId: string, productId: string): Promise<Product> => {
  const { data } = await api.get<ApiEnvelope<ProductSinglePayload>>(`/api/shops/${shopId}/products/${productId}`)
  return ensureProduct(data?.data, data?.message || 'Unable to load product.')
}

export const createProduct = async (shopId: string, payload: ProductUpsertInput): Promise<Product> => {
  const { data } = await api.post<ApiEnvelope<ProductSinglePayload>>(`/api/shops/${shopId}/products`, payload)
  return ensureProduct(data?.data, data?.message || 'Unable to create product.')
}

export const updateProduct = async (shopId: string, productId: string, payload: ProductUpsertInput): Promise<Product> => {
  const { data } = await api.put<ApiEnvelope<ProductSinglePayload>>(`/api/shops/${shopId}/products/${productId}`, payload)
  return ensureProduct(data?.data, data?.message || 'Unable to update product.')
}

export const deleteProduct = async (shopId: string, productId: string): Promise<void> => {
  const { data } = await api.delete<ApiEnvelope<Record<string, never>>>(`/api/shops/${shopId}/products/${productId}`)
  if (!data?.success) {
    throw new Error(data?.message || 'Unable to delete product.')
  }
}

export const updateStock = async (
  shopId: string,
  productId: string,
  variants: Array<{ id: string; stockQty: number; inStock: boolean }>
): Promise<Product> => {
  const { data } = await api.patch<ApiEnvelope<ProductSinglePayload>>(`/api/shops/${shopId}/products/${productId}/stock`, {
    variants,
  })

  return ensureProduct(data?.data, data?.message || 'Unable to update stock.')
}

export const uploadProductImage = async (shopId: string, file: File): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await api.post<ApiEnvelope<{ id: string; imageUrl: string }>>(`/api/shops/${shopId}/products/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const imageUrl = data?.data?.imageUrl
  if (!imageUrl) {
    throw new Error(data?.message || 'Unable to upload image.')
  }

  return imageUrl
}

export const getCategoryIdByName = async (categoryName: string): Promise<string | null> => {
  const category = await getCategoryMetaByName(categoryName)
  return category?.id || null
}

export const getCategoryMetaByName = async (categoryName: string): Promise<CategoryMeta | null> => {
  const { data } = await api.get<ApiEnvelope<CategoriesListPayload>>('/api/categories', {
    params: { limit: 100, offset: 0 },
  })

  const categories = data?.data?.categories || []
  const matched = categories.find(
    (category) => String(category.name || '').trim().toLowerCase() === String(categoryName || '').trim().toLowerCase()
  )

  if (!matched?._id) {
    return null
  }

  return {
    id: String(matched._id),
    name: String(matched.name || ''),
    subcategories: Array.isArray(matched.subcategories)
      ? matched.subcategories
          .map((item) => String(item?.name || '').trim())
          .filter((name) => Boolean(name))
      : [],
  }
}
