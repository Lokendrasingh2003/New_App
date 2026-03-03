export type OfferType = 'PERCENT' | 'FLAT'

export type OfferScope = 'SHOP' | 'CATEGORIES' | 'PRODUCTS'

export type OfferStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED'

export interface Offer {
  id: string
  name: string
  type: OfferType
  value: number
  scope: OfferScope
  categoryIds?: string[]
  productIds?: string[]
  startsAt: string
  endsAt: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export const deriveOfferStatus = (offer: Offer, now = new Date()): OfferStatus => {
  if (!offer.enabled) {
    return 'DISABLED'
  }

  const startsAtDate = new Date(offer.startsAt)
  const endsAtDate = new Date(offer.endsAt)

  if (now < startsAtDate) {
    return 'SCHEDULED'
  }

  if (now >= startsAtDate && now <= endsAtDate) {
    return 'ACTIVE'
  }

  return 'EXPIRED'
}
