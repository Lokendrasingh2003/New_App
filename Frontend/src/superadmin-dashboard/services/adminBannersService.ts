import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { Banner } from '../types/Banner'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type BannerApi = {
  _id?: string
  id?: string
  title?: string
  imageUrl?: string
  redirectUrl?: string | null
  description?: string | null
  position?: number
  isActive?: boolean
  bannerType?: string
  targetAudience?: string
  startDate?: string | null
  endDate?: string | null
  createdAt?: string
  updatedAt?: string
}

type BannerListPayload = {
  banners: BannerApi[]
  pagination: {
    total: number
    limit: number
    offset: number
    pages: number
  }
}

type BannerWritePayload = {
  banner?: BannerApi
}

type BannerInput = Omit<Banner, 'id' | 'createdAt' | 'updatedAt'>

const env = import.meta.env as Record<string, string | undefined>

const apiBaseUrl = env.VITE_API_BASE_URL || env.REACT_APP_API_BASE_URL || 'http://localhost:5000'

const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
})

const getAdminHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {}

  const internalKey = getAdminAccessKey()
  if (internalKey) {
    headers['x-internal-key'] = internalKey
  }

  return headers
}

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

const toBanner = (item: BannerApi): Banner => ({
  id: String(item._id || item.id || ''),
  title: String(item.title || ''),
  imageUrl: String(item.imageUrl || ''),
  redirectUrl: item.redirectUrl ? String(item.redirectUrl) : null,
  description: item.description ? String(item.description) : null,
  position: Number(item.position || 0),
  isActive: Boolean(item.isActive),
  bannerType: String(item.bannerType || 'GENERAL') as Banner['bannerType'],
  targetAudience: String(item.targetAudience || 'ALL') as Banner['targetAudience'],
  startDate: item.startDate ? String(item.startDate) : null,
  endDate: item.endDate ? String(item.endDate) : null,
  createdAt: String(item.createdAt || new Date().toISOString()),
  updatedAt: String(item.updatedAt || item.createdAt || new Date().toISOString()),
})

const toApiPayload = (input: BannerInput) => ({
  title: input.title,
  imageUrl: input.imageUrl,
  redirectUrl: input.redirectUrl && input.redirectUrl.trim() !== '' ? input.redirectUrl : null,
  description: input.description && input.description.trim() !== '' ? input.description : null,
  position: Number(input.position || 0),
  isActive: input.isActive,
  bannerType: input.bannerType || 'GENERAL',
  targetAudience: input.targetAudience || 'ALL',
  startDate: input.startDate ? new Date(input.startDate).toISOString() : null,
  endDate: input.endDate ? new Date(input.endDate).toISOString() : null,
})

type UploadResponse = {
  imageUrl: string
  filename: string
}

export const uploadBannerImage = async (file: File): Promise<string> => {
  try {
    const formData = new FormData()
    formData.append('image', file)

    console.log('Uploading file:', file.name, file.size)

    const response = await http.post<ApiEnvelope<UploadResponse>>('/api/admin/banners/upload', formData, {
      headers: getAdminHeaders(),
    })

    console.log('Full upload response:', response)
    console.log('Response status:', response.status)
    console.log('Response data structure:', response.data)

    // Try different ways to get the imageUrl
    let imageUrl = response.data?.data?.imageUrl
    
    if (!imageUrl && response.data?.data?.filename) {
      // Fallback: construct from filename if imageUrl missing
      imageUrl = `/uploads/banners/${response.data.data.filename}`
      console.log('Constructed imageUrl from filename:', imageUrl)
    }

    if (!imageUrl) {
      console.error('Missing imageUrl in response. Full response:', JSON.stringify(response.data, null, 2))
      throw new Error('Server did not return image URL or filename')
    }

    console.log('Image uploaded successfully:', imageUrl)
    return imageUrl
  } catch (error) {
    console.error('Image upload error:', error)
    throw new Error(getErrorMessage(error, 'Unable to upload image.'))
  }
}

export const listAdminBanners = async (): Promise<Banner[]> => {
  try {
    const { data } = await http.get<ApiEnvelope<BannerListPayload>>('/api/admin/banners', {
      params: { limit: 100, offset: 0, sortBy: 'position', sortOrder: 'asc' },
      headers: getAdminHeaders(),
    })

    return (data?.data?.banners || []).map(toBanner)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to load banners.'))
  }
}

export const createAdminBanner = async (input: BannerInput): Promise<void> => {
  try {
    await http.post<ApiEnvelope<BannerWritePayload>>('/api/admin/banners', toApiPayload(input), {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create banner.'))
  }
}

export const updateAdminBanner = async (bannerId: string, input: BannerInput): Promise<void> => {
  try {
    await http.put<ApiEnvelope<BannerWritePayload>>(`/api/admin/banners/${bannerId}`, toApiPayload(input), {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update banner.'))
  }
}

export const toggleAdminBannerActive = async (bannerId: string, isActive: boolean): Promise<void> => {
  try {
    await http.patch<ApiEnvelope<BannerWritePayload>>(
      `/api/admin/banners/${bannerId}/toggle-active`,
      { isActive },
      { headers: getAdminHeaders() },
    )
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update banner status.'))
  }
}

export const deleteAdminBanner = async (bannerId: string): Promise<void> => {
  try {
    await http.delete<ApiEnvelope<void>>(`/api/admin/banners/${bannerId}`, {
      headers: getAdminHeaders(),
    })
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to delete banner.'))
  }
}
