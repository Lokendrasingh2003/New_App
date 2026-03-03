import { mockOffers } from '../../../data/mockOffers'
import { mockOrders } from '../../../data/mockOrders'
import { mockProducts } from '../../../data/mockProducts'
import { mockShop } from '../../../data/mockShop'
import type { Offer } from '../../../types/offer'
import type { Order } from '../../../types/order'
import type { Product } from '../../../types/product'
import type { Shop } from '../../../types/shop'
import { STORAGE_KEYS } from './constants'

const getStorage = () => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

const safeGet = (key: string) => {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key: string, value: string) => {
  const storage = getStorage()
  if (!storage) {
    return false
  }

  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

const parseJson = (raw: string | null): unknown | null => {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isOrder = (value: unknown): value is Order =>
  isObject(value) && typeof value.id === 'string' && typeof value.shortId === 'string'

const isProduct = (value: unknown): value is Product =>
  isObject(value) && typeof value.id === 'string' && typeof value.name === 'string'

const isOffer = (value: unknown): value is Offer =>
  isObject(value) && typeof value.id === 'string' && typeof value.name === 'string'

const isShop = (value: unknown): value is Shop =>
  isObject(value) && typeof value.id === 'string' && typeof value.shopName === 'string' && Array.isArray(value.customSubcategories)

const readArray = <T,>(key: string, fallback: T[], guard: (value: unknown) => value is T): T[] => {
  const parsed = parseJson(safeGet(key))
  if (!Array.isArray(parsed) || (parsed.length > 0 && !parsed.every(guard))) {
    return fallback
  }

  return parsed
}

export const readOrders = () => readArray(STORAGE_KEYS.orders, mockOrders, isOrder)
export const writeOrders = (orders: Order[]) => safeSet(STORAGE_KEYS.orders, JSON.stringify(orders))

export const readProducts = () => readArray(STORAGE_KEYS.products, mockProducts, isProduct)
export const writeProducts = (products: Product[]) => safeSet(STORAGE_KEYS.products, JSON.stringify(products))

export const readOffers = () => readArray(STORAGE_KEYS.offers, mockOffers, isOffer)
export const writeOffers = (offers: Offer[]) => safeSet(STORAGE_KEYS.offers, JSON.stringify(offers))

export const readShop = () => {
  const parsed = parseJson(safeGet(STORAGE_KEYS.shop))
  if (!parsed || !isShop(parsed)) {
    return mockShop
  }
  return parsed
}

export const writeShop = (shop: Shop) => {
  const baseSaved = safeSet(STORAGE_KEYS.shop, JSON.stringify(shop))
  const subcategoriesSaved = safeSet(
    STORAGE_KEYS.customSubcategories,
    JSON.stringify(shop.customSubcategories),
  )
  return baseSaved && subcategoriesSaved
}

export const clearDemoStorage = () => {
  const storage = getStorage()
  if (!storage) {
    return
  }

  ;[
    STORAGE_KEYS.orders,
    STORAGE_KEYS.products,
    STORAGE_KEYS.offers,
    STORAGE_KEYS.shop,
    STORAGE_KEYS.customSubcategories,
    'shopkeeper_orders_v1',
    'shopkeeper_products_v1',
    'shopkeeper_offers_v1',
    'shopkeeper_shop_v1',
  ].forEach((key) => {
    try {
      storage.removeItem(key)
    } catch {
      // noop for mock adapter scaffold
    }
  })
}
