export type Category = {
  id: string
  name: string
  slug: string
  isActive: boolean
  subcategories: string[]
  status?: 'DRAFT' | 'PUBLISHED'
  description?: string | null
  image?: string | null
  icon?: string | null
  displayOrder?: number
  createdAt: string
  updatedAt: string
}
