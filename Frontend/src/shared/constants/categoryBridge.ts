export const PUBLISHED_CATEGORIES_KEY = 'cc_published_categories_v1'
export const PUBLISHED_CATEGORIES_META_KEY = 'cc_published_categories_meta_v1'

export type PublishedCategoryRecord = {
  name: string
  subcategories: string[]
  active: boolean
  updatedAt: string
}

export type PublishedCategoriesMeta = {
  publishedAt: string
}
