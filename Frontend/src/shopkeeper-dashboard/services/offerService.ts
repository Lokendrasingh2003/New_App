import api from '../../utils/axiosInstance'
import type { Offer, OfferScope, OfferType } from '../types/offer'

type ApiEnvelope<T> = {
  success: boolean
  message?: string
  data?: T
}

type OfferApiModel = {
  id?: string
  _id?: string
  name: string
  type: OfferType
  value: number
  scope: OfferScope
  categoryIds?: string[]
  productIds?: string[]
  validity?: {
    startsAt: string
    endsAt: string
  }
  enabled?: boolean
  createdAt?: string
  updatedAt?: string
}

type OffersListPayload = {
  offers: OfferApiModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

type OfferSinglePayload = {
  offer: OfferApiModel
}

type ProductsPayload = {
  products: Array<{
    _id: string
    name: string
    subcategoryName?: string | null
  }>
}

export type OfferQuery = {
  active?: boolean
  limit?: number
  offset?: number
}

export type OfferUpsertInput = {
  name: string
  type: OfferType
  value: number
  scope: OfferScope
  categoryIds?: string[]
  productIds?: string[]
  startsAt: string
  endsAt: string
  enabled?: boolean
}

export type OffersResponse = {
  offers: Offer[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export type OfferOption = {
  id: string
  name: string
}

const mapOffer = (offer: OfferApiModel): Offer => ({
  id: String(offer.id || offer._id || ''),
  name: String(offer.name || ''),
  type: offer.type,
  value: Number(offer.value || 0),
  scope: offer.scope,
  categoryIds: offer.categoryIds || [],
  productIds: offer.productIds || [],
  startsAt: String(offer.validity?.startsAt || offer.createdAt || new Date().toISOString()),
  endsAt: String(offer.validity?.endsAt || offer.updatedAt || new Date().toISOString()),
  enabled: typeof offer.enabled === 'boolean' ? offer.enabled : true,
  createdAt: String(offer.createdAt || new Date().toISOString()),
  updatedAt: String(offer.updatedAt || new Date().toISOString()),
})

const ensureOffer = (payload: OfferSinglePayload | undefined, fallbackMessage: string): Offer => {
  const offer = payload?.offer
  if (!offer) {
    throw new Error(fallbackMessage)
  }

  return mapOffer(offer)
}

export const getOffers = async (shopId: string, query: OfferQuery = {}): Promise<OffersResponse> => {
  const { data } = await api.get<ApiEnvelope<OffersListPayload>>(`/api/shops/${shopId}/offers`, {
    params: query,
  })

  const payload = data?.data
  if (!payload) {
    throw new Error(data?.message || 'Unable to load offers.')
  }

  return {
    offers: (payload.offers || []).map(mapOffer),
    pagination: payload.pagination,
  }
}

export const getOffer = async (shopId: string, offerId: string): Promise<Offer> => {
  const { data } = await api.get<ApiEnvelope<OfferSinglePayload>>(`/api/shops/${shopId}/offers/${offerId}`)
  return ensureOffer(data?.data, data?.message || 'Unable to load offer.')
}

export const createOffer = async (shopId: string, payload: OfferUpsertInput): Promise<Offer> => {
  const { data } = await api.post<ApiEnvelope<OfferSinglePayload>>(`/api/shops/${shopId}/offers`, payload)
  return ensureOffer(data?.data, data?.message || 'Unable to create offer.')
}

export const updateOffer = async (shopId: string, offerId: string, payload: OfferUpsertInput): Promise<Offer> => {
  const { data } = await api.put<ApiEnvelope<OfferSinglePayload>>(`/api/shops/${shopId}/offers/${offerId}`, payload)
  return ensureOffer(data?.data, data?.message || 'Unable to update offer.')
}

export const deleteOffer = async (shopId: string, offerId: string): Promise<void> => {
  const { data } = await api.delete<ApiEnvelope<Record<string, never>>>(`/api/shops/${shopId}/offers/${offerId}`)
  if (!data?.success) {
    throw new Error(data?.message || 'Unable to delete offer.')
  }
}

export const toggleOffer = async (shopId: string, offerId: string, enabled: boolean): Promise<Offer> => {
  const { data } = await api.patch<ApiEnvelope<OfferSinglePayload>>(`/api/shops/${shopId}/offers/${offerId}/toggle`, {
    enabled,
  })

  return ensureOffer(data?.data, data?.message || 'Unable to toggle offer.')
}

export const getOfferCategories = async (_shopId?: string): Promise<OfferOption[]> => {
  if (!_shopId) {
    return []
  }

  const { data } = await api.get<ApiEnvelope<ProductsPayload>>(`/api/shops/${_shopId}/products`, {
    params: {
      limit: 200,
      offset: 0,
    },
  })

  const uniqueSubcategories = Array.from(
    new Set(
      (data?.data?.products || [])
        .map((product) => String(product.subcategoryName || '').trim())
        .filter((name) => name.length > 0),
    ),
  )

  return uniqueSubcategories.map((name) => ({
    id: name,
    name,
  }))
}

export const getOfferProducts = async (shopId: string): Promise<OfferOption[]> => {
  const { data } = await api.get<ApiEnvelope<ProductsPayload>>(`/api/shops/${shopId}/products`, {
    params: {
      limit: 100,
      offset: 0,
    },
  })

  return (data?.data?.products || []).map((product) => ({
    id: product._id,
    name: product.name,
  }))
}
