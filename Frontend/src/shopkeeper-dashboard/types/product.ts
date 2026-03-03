export interface ProductVariant {
  id: string
  label: string
  price: number
  mrp: number
  inStock: boolean
  stockQty?: number
}

export interface Product {
  id: string
  name: string
  description: string
  categoryId?: string
  category: string
  subcategoryId?: string
  subcategory: string
  images: string[]
  basePrice: number
  baseMrp: number
  stockQty: number
  inStock: boolean
  active: boolean
  variants: ProductVariant[]
  updatedAt: string
}
