export type SubcategorySource = 'ADMIN' | 'SHOP'

export interface Subcategory {
  id: string
  name: string
  source: SubcategorySource
}

export interface Category {
  id: string
  name: string
  subcategories: Subcategory[]
}
