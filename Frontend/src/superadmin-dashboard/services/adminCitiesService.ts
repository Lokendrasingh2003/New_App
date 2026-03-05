import axios from 'axios'
import { getAdminAccessKey } from '../auth/adminAccess'
import type { CityUpsertInput } from '../store/types'
import type { City } from '../types/City'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type BackendCity = {
  _id: string
  name: string
  slug: string
  isActive: boolean
  deliveryAvailable: boolean
  createdAt: string
  updatedAt: string
  state?: string
  latitude?: number
  longitude?: number
  populationEstimate?: number | null
}

type CityListPayload = {
  cities: BackendCity[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type CityPayload = {
  city: BackendCity
}

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

const toFrontendCity = (city: BackendCity): City => ({
  id: String(city._id),
  name: String(city.name || ''),
  slug: String(city.slug || ''),
  isActive: Boolean(city.isActive),
  deliveryEnabled: Boolean(city.deliveryAvailable),
  commissionOverridePercentage: null,
  createdAt: String(city.createdAt || new Date().toISOString()),
  updatedAt: String(city.updatedAt || new Date().toISOString()),
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

const mapToBackendPayload = (
  input: CityUpsertInput,
  existing?: Pick<BackendCity, 'state' | 'latitude' | 'longitude' | 'populationEstimate'>,
) => {
  const normalizedName = String(input.name || '').trim()
  const populationEstimate =
    existing?.populationEstimate === undefined || existing?.populationEstimate === null
      ? undefined
      : Number(existing.populationEstimate)

  return {
    name: normalizedName,
    slug: String(input.slug || '').trim().toLowerCase(),
    state: existing?.state || normalizedName,
    latitude: Number.isFinite(existing?.latitude) ? Number(existing?.latitude) : 0,
    longitude: Number.isFinite(existing?.longitude) ? Number(existing?.longitude) : 0,
    isActive: Boolean(input.isActive),
    deliveryAvailable: Boolean(input.deliveryEnabled),
    ...(populationEstimate !== undefined ? { populationEstimate } : {}),
  }
}

export const listAdminCities = async (): Promise<City[]> => {
  const { data } = await http.get<ApiEnvelope<CityListPayload>>('/api/admin/cities', {
    params: { limit: 100, offset: 0 },
    headers: getAdminHeaders(),
  })

  return (data?.data?.cities || []).map(toFrontendCity)
}

export const createAdminCity = async (input: CityUpsertInput): Promise<City> => {
  try {
    const payload = mapToBackendPayload(input)

    const { data } = await http.post<ApiEnvelope<CityPayload>>('/api/admin/cities', payload, {
      headers: getAdminHeaders(),
    })

    const city = data?.data?.city
    if (!city) {
      throw new Error(data?.message || 'City create failed.')
    }

    return toFrontendCity(city)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to create city.'))
  }
}

export const getAdminCityById = async (cityId: string): Promise<BackendCity> => {
  const { data } = await http.get<ApiEnvelope<CityPayload>>(`/api/admin/cities/${cityId}`, {
    headers: getAdminHeaders(),
  })

  const city = data?.data?.city
  if (!city) {
    throw new Error(data?.message || 'City not found.')
  }

  return city
}

export const updateAdminCity = async (cityId: string, input: CityUpsertInput): Promise<City> => {
  try {
    const existing = await getAdminCityById(cityId)
    const payload = mapToBackendPayload(input, existing)

    const { data } = await http.put<ApiEnvelope<CityPayload>>(`/api/admin/cities/${cityId}`, payload, {
      headers: getAdminHeaders(),
    })

    const city = data?.data?.city
    if (!city) {
      throw new Error(data?.message || 'City update failed.')
    }

    return toFrontendCity(city)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update city.'))
  }
}

export const toggleAdminCityActive = async (cityId: string, isActive: boolean): Promise<City> => {
  try {
    const { data } = await http.patch<ApiEnvelope<CityPayload>>(
      `/api/admin/cities/${cityId}/toggle-active`,
      { isActive },
      { headers: getAdminHeaders() },
    )

    const city = data?.data?.city
    if (!city) {
      throw new Error(data?.message || 'City status update failed.')
    }

    return toFrontendCity(city)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update city status.'))
  }
}

export const toggleAdminCityDelivery = async (cityId: string, deliveryAvailable: boolean): Promise<City> => {
  try {
    const { data } = await http.patch<ApiEnvelope<CityPayload>>(
      `/api/admin/cities/${cityId}/toggle-delivery`,
      { deliveryAvailable },
      { headers: getAdminHeaders() },
    )

    const city = data?.data?.city
    if (!city) {
      throw new Error(data?.message || 'City delivery update failed.')
    }

    return toFrontendCity(city)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Unable to update city delivery status.'))
  }
}
