export type ProductDTO = {
  id: string
  shopId: string
  name: string
  description: string
  categoryName: string
  subcategoryName: string
  images: string[]
  active: boolean
  inStock: boolean
  stockQty: number
  variants: Array<{
    label: string
    price: number
    mrp: number
    inStock: boolean
  }>
  updatedAt: string
}

export type CreateProductRequest = {
  shopId: string
  name: string
  description: string
  categoryName: string
  subcategoryName: string
  images: string[]
  active: boolean
  inStock: boolean
  stockQty: number
  variants: Array<{
    label: string
    price: number
    mrp: number
    inStock: boolean
  }>
}

export type UpdateProductRequest = Partial<CreateProductRequest>
