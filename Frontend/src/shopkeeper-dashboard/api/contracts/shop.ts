export type ShopDTO = {
  id: string
  shopName: string
  categoryName: string
  customSubcategories: string[]
  publicUrl: string
  slug: string
  phone: string
  city: string
  addressLine1: string
  area: string
  pincode: string
  delivery: {
    payer: 'CUSTOMER' | 'SHOP'
    chargeAmount: number
    serviceRadiusKm: number
  }
  businessHours: {
    open: string
    close: string
  }
  updatedAt: string
}

export type UpdateShopRequest = Partial<
  Omit<ShopDTO, 'id' | 'categoryName' | 'customSubcategories' | 'publicUrl' | 'slug'> & {
    customSubcategories: string[]
  }
>
