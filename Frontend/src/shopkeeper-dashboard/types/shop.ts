export type DeliveryPayer = 'CUSTOMER' | 'SHOP'

import type { Subcategory } from './category'

export interface Shop {
  id: string
  shopName: string
  imageUrl?: string
  categoryId: string
  categoryName: string
  customSubcategories: Subcategory[]
  ownerName?: string
  phone: string
  city: string
  addressLine1: string
  area: string
  pincode: string
  slug: string
  publicUrl: string
  delivery: {
    payer: DeliveryPayer
    chargeAmount: number
    serviceRadiusKm: number
  }
  businessHours: {
    open: string
    close: string
  }
  updatedAt: string
}
