import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Category } from '../types/Category'

const env = import.meta.env as Record<string, string | undefined>

const apiBaseUrl = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type BackendSubcategory = {
  id: string
  name: string
  slug: string
  isActive: boolean
}

type BackendCategory = {
  _id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  subcategories: BackendSubcategory[]
  isActive: boolean
  status: 'DRAFT' | 'PUBLISHED'
  publishedAt: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

type CategoryListPayload = {
  categories: BackendCategory[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type CategoryPayload = {
  category: BackendCategory
}

type SubcategoryPayload = {
  subcategory: BackendSubcategory
}

const getAdminHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}

  const internalKey = getAdminAccessKey()
  if (internalKey) {
    headers['x-internal-key'] = internalKey
  }

  return headers
}

const slugify = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const toFrontendCategory = (category: BackendCategory): Category => ({
  id: String(category._id),
  name: String(category.name || ''),
  slug: String(category.slug || ''),
  isActive: Boolean(category.isActive),
  subcategories: Array.isArray(category.subcategories)
    ? category.subcategories.map((item) => String(item.name || '').trim()).filter((item) => item.length > 0)
    : [],
  status: category.status,
  description: category.description ?? null,
  image: category.image ?? null,
  icon: category.icon ?? null,
  displayOrder: Number(category.displayOrder || 0),
  createdAt: String(category.createdAt || new Date().toISOString()),
  updatedAt: String(category.updatedAt || new Date().toISOString()),
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) {
    return fallback
  }

  const message =
    (error.response?.data as { error?: { message?: string }; message?: string } | undefined)?.error?.message ||
    (error.response?.data as { message?: string } | undefined)?.message

  if (message) {
    return message
  }

  if (error.response?.status === 403) {
    return 'Admin access denied. Set VITE_INTERNAL_ADMIN_KEY in frontend env.'
  }

  return fallback
}

const buildCategoryPayload = (name: string, options?: { existing?: Category; subcategories?: string[] }) => {
  const normalizedName = name.trim().replace(/\s+/g, ' ')
  const slug = slugify(normalizedName)
  const subcategories = options?.subcategories || options?.existing?.subcategories || []

  return {
    name: normalizedName,
    slug,
    description:
      options?.existing?.description ?? `Products and items under ${normalizedName} category.`,
    image: options?.existing?.image ?? 'https://placehold.co/600x400/png',
    icon: options?.existing?.icon ?? 'https://placehold.co/64x64/png',
    displayOrder: options?.existing?.displayOrder ?? 0,
    subcategories: subcategories.map((subcategoryName, index) => ({
      id: `subcat-${Date.now()}-${index + 1}`,
      name: subcategoryName,
      slug: slugify(subcategoryName),
      isActive: true,
    })),
  }
}

export const listAdminCategories = async (): Promise<Category[]> => {
  const { data } = await http.get<ApiEnvelope<CategoryListPayload>>('/api/admin/categories', {
    params: { limit: 100, offset: 0 },
    headers: getAdminHeaders(),
  })

  return (data?.data?.categories || []).map(toFrontendCategory)
}

export const createAdminCategory = async (name: string): Promise<Category> => {
  try {
    const payload = buildCategoryPayload(name)

    const { data } = await http.post<ApiEnvelope<CategoryPayload>>('/api/admin/categories', payload, {
      headers: getAdminHeaders(),
    })

    const category = data?.data?.category
    if (!category) {
      throw new Error(data?.message || 'Category create failed.')
    }

    return toFrontendCategory(category)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create category.'))
  }
}

export const getAdminCategoryById = async (categoryId: string): Promise<BackendCategory> => {
  const { data } = await http.get<ApiEnvelope<CategoryPayload>>(`/api/admin/categories/${categoryId}`, {
    headers: getAdminHeaders(),
  })

  const category = data?.data?.category
  if (!category) {
    throw new Error(data?.message || 'Category not found.')
  }

  return category
}

export const updateAdminCategory = async (
  categoryId: string,
  patch: { name: string; isActive: boolean },
  existingCategory: Category,
): Promise<Category> => {
  try {
    const payload = buildCategoryPayload(patch.name, {
      existing: existingCategory,
      subcategories: existingCategory.subcategories,
    })

    const { data } = await http.put<ApiEnvelope<CategoryPayload>>(`/api/admin/categories/${categoryId}`, payload, {
      headers: getAdminHeaders(),
    })

    const updated = data?.data?.category
    if (!updated) {
      throw new Error(data?.message || 'Category update failed.')
    }

    if (Boolean(updated.isActive) !== Boolean(patch.isActive)) {
      const toggled = await toggleAdminCategoryActive(categoryId, patch.isActive)
      return toggled
    }

    return toFrontendCategory(updated)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update category.'))
  }
}

export const toggleAdminCategoryActive = async (categoryId: string, isActive: boolean): Promise<Category> => {
  try {
    const { data } = await http.patch<ApiEnvelope<CategoryPayload>>(
      `/api/admin/categories/${categoryId}/toggle-active`,
      { isActive },
      { headers: getAdminHeaders() },
    )

    const updated = data?.data?.category
    if (!updated) {
      throw new Error(data?.message || 'Category status update failed.')
    }

    return toFrontendCategory(updated)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update category status.'))
  }
}

export const addAdminSubcategory = async (categoryId: string, subcategoryName: string): Promise<Category> => {
  try {
    await http.post<ApiEnvelope<SubcategoryPayload>>(
      `/api/admin/categories/${categoryId}/subcategories`,
      { name: subcategoryName },
      { headers: getAdminHeaders() },
    )

    const refreshed = await getAdminCategoryById(categoryId)
    return toFrontendCategory(refreshed)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to add subcategory.'))
  }
}

export const removeAdminSubcategory = async (categoryId: string, subcategoryName: string): Promise<Category> => {
  try {
    const current = await getAdminCategoryById(categoryId)
    const target = (current.subcategories || []).find(
      (item) => String(item.name || '').trim().toLowerCase() === subcategoryName.trim().toLowerCase(),
    )

    if (!target) {
      throw new Error('Subcategory not found.')
    }

    await http.delete<ApiEnvelope<Record<string, never>>>(
      `/api/admin/categories/${categoryId}/subcategories/${target.id}`,
      { headers: getAdminHeaders() },
    )

    const refreshed = await getAdminCategoryById(categoryId)
    return toFrontendCategory(refreshed)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to remove subcategory.'))
  }
}

export const publishAdminCategory = async (categoryId: string): Promise<Category> => {
  try {
    const { data } = await http.post<ApiEnvelope<CategoryPayload>>(
      `/api/admin/categories/${categoryId}/publish`,
      {},
      { headers: getAdminHeaders() },
    )

    const category = data?.data?.category
    if (!category) {
      throw new Error(data?.message || 'Category publish failed.')
    }

    return toFrontendCategory(category)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to publish category.'))
  }
}
