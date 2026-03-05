import { createContext, useContext, useMemo, useState } from 'react'
import { getServices } from '../../api/serviceRegistry'
import type { Category, Subcategory } from '../../types/category'
import type { Order } from '../../types/order'
import type { OrderStatus } from '../../types/order'
import type { Offer } from '../../types/offer'
import type { Product } from '../../types/product'
import type { Shop } from '../../types/shop'
import { PUBLISHED_CATEGORIES_KEY, type PublishedCategoryRecord } from '../../../shared/constants/categoryBridge'
import { useAppFeedback } from '../ui/AppFeedbackProvider'

const SHOPKEEPER_ORDERS_KEY = 'sk_orders_v1'
const SHOPKEEPER_PRODUCTS_KEY = 'sk_products_v1'
const SHOPKEEPER_OFFERS_KEY = 'sk_offers_v1'
const SHOPKEEPER_SHOP_KEY = 'sk_shop_v1'
const SHOPKEEPER_CUSTOM_SUBCATEGORIES_KEY = 'sk_custom_subcategories_v1'
const LOCAL_PERSIST_WARNING = 'Could not persist locally. Changes may reset on refresh.'

type CreateProductInput = Omit<Product, 'id' | 'updatedAt'>
type CreateOfferInput = Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>

type ShopkeeperStoreContextType = {
  categories: Category[]
  orders: Order[]
  products: Product[]
  offers: Offer[]
  shop: Shop
  addCustomSubcategory: (name: string) => void
  removeCustomSubcategory: (subcategoryId: string) => void
  getShopCategory: () => Category
  getAvailableSubcategories: () => Subcategory[]
  isUsingFallbackCategoryForShop: () => boolean
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  cancelOrder: (orderId: string, reason: string) => void
  getOrderById: (orderId: string) => Order | undefined
  createProduct: (product: CreateProductInput) => Product
  deleteProduct: (productId: string) => void
  updateProduct: (productId: string, updates: Partial<Omit<Product, 'id'>>) => void
  toggleProductActive: (productId: string) => void
  toggleProductInStock: (productId: string) => void
  updateStockQty: (productId: string, qty: number) => void
  getProductById: (productId: string) => Product | undefined
  createOffer: (offer: CreateOfferInput) => Offer
  deleteOffer: (offerId: string) => void
  updateOffer: (offerId: string, updates: Partial<Omit<Offer, 'id' | 'createdAt'>>) => void
  toggleOfferEnabled: (offerId: string) => void
  getOfferById: (offerId: string) => Offer | undefined
  updateShopSettings: (updates: Partial<Omit<Shop, 'id' | 'categoryId' | 'categoryName' | 'customSubcategories'>>) => void
  getPublicUrl: () => string
  resetAllData: () => void
}

const FALLBACK_CATEGORIES: Category[] = [
  {
    id: 'cat-uncategorized',
    name: 'Uncategorized',
    subcategories: [],
  },
]

const DEFAULT_SHOP: Shop = {
  id: 'shop-unset',
  shopName: 'My Shop',
  categoryId: FALLBACK_CATEGORIES[0].id,
  categoryName: FALLBACK_CATEGORIES[0].name,
  customSubcategories: [],
  ownerName: '',
  phone: '',
  city: '',
  addressLine1: '',
  area: '',
  pincode: '',
  slug: '',
  publicUrl: '',
  delivery: {
    payer: 'CUSTOMER',
    chargeAmount: 0,
    serviceRadiusKm: 5,
  },
  businessHours: {
    open: '09:00',
    close: '21:00',
  },
  updatedAt: new Date().toISOString(),
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isValidOrder = (value: unknown): value is Order =>
  isObject(value) && typeof value.id === 'string' && typeof value.shortId === 'string' && typeof value.status === 'string'

const isValidOffer = (value: unknown): value is Offer =>
  isObject(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.scope === 'string'

const isValidShop = (value: unknown): value is Shop =>
  isObject(value) &&
  typeof value.id === 'string' &&
  typeof value.shopName === 'string' &&
  typeof value.publicUrl === 'string' &&
  isObject(value.delivery) &&
  isObject(value.businessHours)

const normalizeKey = (value: string) => value.trim().toLowerCase()

const getCategoryById = (categoryId: string): Category =>
  FALLBACK_CATEGORIES.find((category) => category.id === categoryId) ?? FALLBACK_CATEGORIES[0]

const getFallbackCategoryByShop = (shop: Pick<Shop, 'categoryId' | 'categoryName'>): Category =>
  FALLBACK_CATEGORIES.find((category) => normalizeKey(category.name) === normalizeKey(shop.categoryName)) ??
  getCategoryById(shop.categoryId)

const isPublishedCategoryRecord = (value: unknown): value is PublishedCategoryRecord =>
  isObject(value) &&
  typeof value.name === 'string' &&
  Array.isArray(value.subcategories) &&
  value.subcategories.every((item) => typeof item === 'string') &&
  typeof value.active === 'boolean' &&
  typeof value.updatedAt === 'string'

const toCategoryId = (name: string) =>
  `cat-${name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`

const toSubcategoryId = (categoryName: string, subcategoryName: string, index: number) => {
  const base = `${categoryName}-${subcategoryName}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return `sub-${base || index + 1}`
}

const parseCustomSubcategories = (raw: unknown, category: Category): Subcategory[] => {
  if (!Array.isArray(raw)) {
    return []
  }

  const adminNames = new Set(category.subcategories.map((subcategory) => normalizeKey(subcategory.name)))
  const seen = new Set<string>()
  const items: Subcategory[] = []

  raw.forEach((entry, index) => {
    if (!isObject(entry) || typeof entry.name !== 'string') {
      return
    }

    const name = entry.name.trim()
    if (!name) {
      return
    }

    const key = normalizeKey(name)
    if (adminNames.has(key) || seen.has(key)) {
      return
    }

    seen.add(key)
    items.push({
      id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : `shop-sub-${index + 1}`,
      name,
      source: 'SHOP',
    })
  })

  return items.slice(0, 3)
}

const normalizeShop = (value: unknown): Shop => {
  const raw = isObject(value) ? value : {}
  const rawCategoryId = typeof raw.categoryId === 'string' ? raw.categoryId : DEFAULT_SHOP.categoryId
  const category = getCategoryById(rawCategoryId)

  return {
    ...DEFAULT_SHOP,
    ...raw,
    categoryId: category.id,
    categoryName: category.name,
    customSubcategories: parseCustomSubcategories(raw.customSubcategories, category),
    delivery: {
      ...DEFAULT_SHOP.delivery,
      ...(isObject(raw.delivery) ? raw.delivery : {}),
    },
    businessHours: {
      ...DEFAULT_SHOP.businessHours,
      ...(isObject(raw.businessHours) ? raw.businessHours : {}),
    },
  }
}

const normalizeVariants = (rawVariants: unknown, basePrice: number, baseMrp: number, inStock: boolean) => {
  if (!Array.isArray(rawVariants)) {
    return [{ id: `var-${Date.now()}`, label: 'Default', price: basePrice, mrp: baseMrp, inStock }]
  }

  const variants = rawVariants
    .filter((variant): variant is Record<string, unknown> => isObject(variant))
    .map((variant, index) => ({
      id: typeof variant.id === 'string' ? variant.id : `var-${Date.now()}-${index}`,
      label: typeof variant.label === 'string' ? variant.label : `Variant ${index + 1}`,
      price: typeof variant.price === 'number' ? variant.price : basePrice,
      mrp: typeof variant.mrp === 'number' ? variant.mrp : baseMrp,
      inStock: typeof variant.inStock === 'boolean' ? variant.inStock : inStock,
    }))

  if (variants.length > 0) {
    return variants
  }

  return [{ id: `var-${Date.now()}`, label: 'Default', price: basePrice, mrp: baseMrp, inStock }]
}

const normalizeProductEntry = (value: unknown, index: number, shop: Shop): Product => {
  const raw = isObject(value) ? value : {}
  const category = getCategoryById(shop.categoryId)
  const adminSubcategories = category.subcategories
  const fallbackSubcategory = adminSubcategories[0]
  const rawSubcategoryName = typeof raw.subcategory === 'string' ? raw.subcategory.trim() : ''
  const rawSubcategoryId = typeof raw.subcategoryId === 'string' ? raw.subcategoryId : ''

  const selectedSubcategoryById = adminSubcategories.find((item) => item.id === rawSubcategoryId)
  const selectedSubcategoryByName = adminSubcategories.find(
    (item) => normalizeKey(item.name) === normalizeKey(rawSubcategoryName),
  )
  const selectedSubcategory = selectedSubcategoryById ?? selectedSubcategoryByName ?? fallbackSubcategory

  const basePrice = typeof raw.basePrice === 'number' ? raw.basePrice : 0
  const baseMrp = typeof raw.baseMrp === 'number' ? raw.baseMrp : 0
  const stockQty = typeof raw.stockQty === 'number' ? Math.max(0, raw.stockQty) : 0
  const inStock = typeof raw.inStock === 'boolean' ? raw.inStock : stockQty > 0

  return {
    id: typeof raw.id === 'string' ? raw.id : `prd-migrated-${Date.now()}-${index}`,
    name: typeof raw.name === 'string' ? raw.name : `Product ${index + 1}`,
    description: typeof raw.description === 'string' ? raw.description : '',
    categoryId: category.id,
    category: category.name,
    subcategoryId: selectedSubcategory?.id,
    subcategory: selectedSubcategory?.name ?? '',
    images: Array.isArray(raw.images) ? raw.images.filter((item): item is string => typeof item === 'string') : [],
    basePrice,
    baseMrp,
    stockQty,
    inStock: stockQty > 0 ? inStock : false,
    active: typeof raw.active === 'boolean' ? raw.active : true,
    variants: normalizeVariants(raw.variants, basePrice, baseMrp, inStock),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  }
}

const normalizeProductsList = (rawProducts: unknown[], shop: Shop): Product[] =>
  rawProducts.map((item, index) => normalizeProductEntry(item, index, shop))

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

const safeGetItem = (key: string): string | null => {
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

const safeSetItem = (key: string, value: string) => {
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

const parseJsonFromStorage = (key: string): unknown | null => {
  const raw = safeGetItem(key)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

const loadPublishedCategories = (): Category[] | null => {
  const parsed = parseJsonFromStorage(PUBLISHED_CATEGORIES_KEY)
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isPublishedCategoryRecord)) {
    return null
  }

  const mapped = parsed
    .filter((item) => item.active)
    .map((item) => {
      const uniqueNames = Array.from(
        new Set(item.subcategories.map((name) => name.trim()).filter((name) => name.length > 0)),
      )

      return {
        id: toCategoryId(item.name),
        name: item.name.trim(),
        subcategories: uniqueNames.map((subcategoryName, index) => ({
          id: toSubcategoryId(item.name, subcategoryName, index),
          name: subcategoryName,
          source: 'ADMIN' as const,
        })),
      }
    })
    .filter((item) => item.name.length > 0 && item.subcategories.length > 0)

  return mapped.length > 0 ? mapped : null
}

const parseArrayStorage = <T,>(
  storageKey: string,
  fallback: T[],
  validator: (value: unknown) => value is T,
): T[] => {
  const parsed = parseJsonFromStorage(storageKey)
  if (!Array.isArray(parsed) || (parsed.length > 0 && !parsed.every(validator))) {
    return fallback
  }

  return parsed
}

const loadOrders = (): Order[] => parseArrayStorage(SHOPKEEPER_ORDERS_KEY, [], isValidOrder)

const loadProducts = (shop: Shop): Product[] => {
  const parsed = parseJsonFromStorage(SHOPKEEPER_PRODUCTS_KEY)
  const source = Array.isArray(parsed) ? parsed : []
  return normalizeProductsList(source, shop)
}

const loadOffers = (): Offer[] => parseArrayStorage(SHOPKEEPER_OFFERS_KEY, [], isValidOffer)

const loadShop = (): Shop => {
  const parsed = parseJsonFromStorage(SHOPKEEPER_SHOP_KEY)
  const normalizedShop = isValidShop(parsed) ? normalizeShop(parsed) : normalizeShop(DEFAULT_SHOP)
  const customSubcategoriesRaw = parseJsonFromStorage(SHOPKEEPER_CUSTOM_SUBCATEGORIES_KEY)

  if (!Array.isArray(customSubcategoriesRaw)) {
    return normalizedShop
  }

  return {
    ...normalizedShop,
    customSubcategories: parseCustomSubcategories(customSubcategoriesRaw, getCategoryById(normalizedShop.categoryId)),
  }
}

const ShopkeeperStoreContext = createContext<ShopkeeperStoreContextType | null>(null)

export const ShopkeeperStoreProvider = ({ children }: { children: React.ReactNode }) => {
  const { showMessage } = useAppFeedback()
  const services = useMemo(() => getServices(), [])
  const [publishedCategories] = useState<Category[] | null>(() => loadPublishedCategories())
  const [shop, setShop] = useState<Shop>(() => loadShop())
  const [orders, setOrders] = useState<Order[]>(() => loadOrders())
  const [products, setProducts] = useState<Product[]>(() => loadProducts(shop))
  const [offers, setOffers] = useState<Offer[]>(() => loadOffers())

  const notifyPersistFailure = () => {
    showMessage(LOCAL_PERSIST_WARNING)
  }

  const syncWithService = (promise: Promise<unknown>) => {
    void promise.catch(() => {
      showMessage('Could not sync data source. Local changes are kept.')
    })
  }

  const persistJson = (storageKey: string, value: unknown) => {
    const isPersisted = safeSetItem(storageKey, JSON.stringify(value))
    if (!isPersisted) {
      notifyPersistFailure()
    }
  }

  const persistOrders = (nextOrders: Order[]) => {
    setOrders(nextOrders)
    persistJson(SHOPKEEPER_ORDERS_KEY, nextOrders)
  }

  const persistProducts = (nextProducts: Product[]) => {
    setProducts(nextProducts)
    persistJson(SHOPKEEPER_PRODUCTS_KEY, nextProducts)
  }

  const persistOffers = (nextOffers: Offer[]) => {
    setOffers(nextOffers)
    persistJson(SHOPKEEPER_OFFERS_KEY, nextOffers)
  }

  const persistShop = (nextShop: Shop) => {
    setShop(nextShop)
    persistJson(SHOPKEEPER_SHOP_KEY, nextShop)
    persistJson(SHOPKEEPER_CUSTOM_SUBCATEGORIES_KEY, nextShop.customSubcategories)
  }

  const resolveShopCategory = () => {
    const fallbackCategory = getFallbackCategoryByShop(shop)

    if (!publishedCategories || publishedCategories.length === 0) {
      return { category: fallbackCategory, fromPublished: false }
    }

    const publishedMatch = publishedCategories.find(
      (category) => normalizeKey(category.name) === normalizeKey(shop.categoryName),
    )

    if (!publishedMatch) {
      return { category: fallbackCategory, fromPublished: false }
    }

    return { category: publishedMatch, fromPublished: true }
  }

  const getShopCategory = (): Category => resolveShopCategory().category

  const getAvailableSubcategories = (): Subcategory[] => {
    const category = getShopCategory()
    return [...category.subcategories, ...shop.customSubcategories]
  }

  const isUsingFallbackCategoryForShop = () => {
    if (!publishedCategories || publishedCategories.length === 0) {
      return false
    }

    return !resolveShopCategory().fromPublished
  }

  const addCustomSubcategory = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('Subcategory name is required')
    }

    if (shop.customSubcategories.length >= 3) {
      throw new Error('You can add up to 3 custom subcategories only')
    }

    const existingNames = new Set(getAvailableSubcategories().map((item) => normalizeKey(item.name)))
    if (existingNames.has(normalizeKey(trimmedName))) {
      throw new Error('Subcategory already exists')
    }

    const nextShop: Shop = {
      ...shop,
      customSubcategories: [
        ...shop.customSubcategories,
        {
          id: `shop-sub-${Date.now()}`,
          name: trimmedName,
          source: 'SHOP',
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    persistShop(nextShop)
    syncWithService(services.shopService.addCustomSubcategory(trimmedName))
  }

  const removeCustomSubcategory = (subcategoryId: string) => {
    const selected = shop.customSubcategories.find((item) => item.id === subcategoryId)
    const nextShop: Shop = {
      ...shop,
      customSubcategories: shop.customSubcategories.filter((item) => item.id !== subcategoryId),
      updatedAt: new Date().toISOString(),
    }

    persistShop(nextShop)
    if (selected) {
      syncWithService(services.shopService.removeCustomSubcategory(selected.name))
    }
  }

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    const nextOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status,
          }
        : order,
    )
    persistOrders(nextOrders)
    syncWithService(services.ordersService.updateStatus(orderId, { status }))
  }

  const cancelOrder = (orderId: string, reason: string) => {
    const cleanedReason = reason.trim()
    const nextOrders = orders.map((order) =>
      order.id === orderId
        ? {
            ...order,
            status: 'CANCELLED' as OrderStatus,
            cancelReason: cleanedReason,
          }
        : order,
    )
    persistOrders(nextOrders)
    syncWithService(services.ordersService.cancel(orderId, { reason: cleanedReason }))
  }

  const getOrderById = (orderId: string) => orders.find((order) => order.id === orderId)

  const createProduct = (product: CreateProductInput) => {
    const shopCategory = getShopCategory()
    const availableSubcategories = getAvailableSubcategories()
    const selectedSubcategoryById = availableSubcategories.find((item) => item.id === product.subcategoryId)
    const selectedSubcategoryByName = availableSubcategories.find(
      (item) => normalizeKey(item.name) === normalizeKey(product.subcategory),
    )
    const selectedSubcategory =
      selectedSubcategoryById ?? selectedSubcategoryByName ?? availableSubcategories[0] ?? shopCategory.subcategories[0]

    const newProduct: Product = {
      ...product,
      id: `prd-${Date.now()}`,
      categoryId: shopCategory.id,
      category: shopCategory.name,
      subcategoryId: selectedSubcategory?.id,
      subcategory: selectedSubcategory?.name ?? '',
      updatedAt: new Date().toISOString(),
    }

    persistProducts([newProduct, ...products])
    syncWithService(
      services.productsService.create({
        shopId: shop.id,
        name: newProduct.name,
        description: newProduct.description,
        categoryName: newProduct.category,
        subcategoryName: newProduct.subcategory,
        images: newProduct.images,
        active: newProduct.active,
        inStock: newProduct.inStock,
        stockQty: newProduct.stockQty,
        variants: newProduct.variants.map((variant) => ({
          label: variant.label,
          price: variant.price,
          mrp: variant.mrp,
          inStock: variant.inStock,
        })),
      }),
    )
    return newProduct
  }

  const deleteProduct = (productId: string) => {
    const nextProducts = products.filter((product) => product.id !== productId)
    persistProducts(nextProducts)
  }

  const updateProduct = (productId: string, updates: Partial<Omit<Product, 'id'>>) => {
    const shopCategory = getShopCategory()
    const availableSubcategories = getAvailableSubcategories()

    const nextProducts = products.map((product) =>
      product.id === productId
        ? (() => {
            const selectedSubcategoryById = availableSubcategories.find(
              (item) => item.id === (updates.subcategoryId ?? product.subcategoryId),
            )
            const selectedSubcategoryByName = availableSubcategories.find(
              (item) => normalizeKey(item.name) === normalizeKey(updates.subcategory ?? product.subcategory),
            )
            const selectedSubcategory =
              selectedSubcategoryById ?? selectedSubcategoryByName ?? availableSubcategories[0] ?? shopCategory.subcategories[0]
            const mergedStockQty =
              typeof updates.stockQty === 'number' ? Math.max(0, updates.stockQty) : Math.max(0, product.stockQty)

            return {
              ...product,
              ...updates,
              categoryId: shopCategory.id,
              category: shopCategory.name,
              stockQty: mergedStockQty,
              inStock: mergedStockQty > 0 ? (updates.inStock ?? product.inStock) : false,
              subcategoryId: selectedSubcategory?.id,
              subcategory: selectedSubcategory?.name ?? product.subcategory,
              updatedAt: new Date().toISOString(),
            }
          })()
        : product,
    )

    persistProducts(nextProducts)

    const updated = nextProducts.find((item) => item.id === productId)
    if (updated) {
      syncWithService(
        services.productsService.update(productId, {
          shopId: shop.id,
          name: updated.name,
          description: updated.description,
          categoryName: updated.category,
          subcategoryName: updated.subcategory,
          images: updated.images,
          active: updated.active,
          inStock: updated.inStock,
          stockQty: updated.stockQty,
          variants: updated.variants.map((variant) => ({
            label: variant.label,
            price: variant.price,
            mrp: variant.mrp,
            inStock: variant.inStock,
          })),
        }),
      )
    }
  }

  const toggleProductActive = (productId: string) => {
    const target = products.find((item) => item.id === productId)
    if (!target) {
      return
    }

    updateProduct(productId, { active: !target.active })
  }

  const toggleProductInStock = (productId: string) => {
    const target = products.find((item) => item.id === productId)
    if (!target) {
      return
    }

    updateProduct(productId, { inStock: !target.inStock })
  }

  const updateStockQty = (productId: string, qty: number) => {
    const safeQty = Math.max(0, qty)
    updateProduct(productId, {
      stockQty: safeQty,
      inStock: safeQty > 0,
    })
  }

  const getProductById = (productId: string) => products.find((item) => item.id === productId)

  const createOffer = (offer: CreateOfferInput) => {
    const nowIso = new Date().toISOString()
    const newOffer: Offer = {
      ...offer,
      id: `off-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    persistOffers([newOffer, ...offers])
    syncWithService(
      services.offersService.create({
        shopId: shop.id,
        name: newOffer.name,
        type: newOffer.type,
        value: newOffer.value,
        scope: newOffer.scope,
        categoryNames: newOffer.categoryIds,
        productNames: newOffer.productIds,
        startsAt: newOffer.startsAt,
        endsAt: newOffer.endsAt,
        enabled: newOffer.enabled,
      }),
    )
    return newOffer
  }

  const deleteOffer = (offerId: string) => {
    const nextOffers = offers.filter((offer) => offer.id !== offerId)
    persistOffers(nextOffers)

    const updated = nextOffers.find((item) => item.id === offerId)
    if (updated) {
      syncWithService(
        services.offersService.update(offerId, {
          shopId: shop.id,
          name: updated.name,
          type: updated.type,
          value: updated.value,
          scope: updated.scope,
          categoryNames: updated.categoryIds,
          productNames: updated.productIds,
          startsAt: updated.startsAt,
          endsAt: updated.endsAt,
          enabled: updated.enabled,
        }),
      )
    }
  }

  const updateOffer = (offerId: string, updates: Partial<Omit<Offer, 'id' | 'createdAt'>>) => {
    const nextOffers = offers.map((offer) =>
      offer.id === offerId
        ? {
            ...offer,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : offer,
    )

    persistOffers(nextOffers)
  }

  const toggleOfferEnabled = (offerId: string) => {
    const target = offers.find((offer) => offer.id === offerId)
    if (!target) {
      return
    }

    updateOffer(offerId, { enabled: !target.enabled })
  }

  const getOfferById = (offerId: string) => offers.find((offer) => offer.id === offerId)

  const updateShopSettings = (
    updates: Partial<Omit<Shop, 'id' | 'categoryId' | 'categoryName' | 'customSubcategories'>>,
  ) => {
    const nextShop: Shop = {
      ...shop,
      ...updates,
      categoryId: shop.categoryId,
      categoryName: shop.categoryName,
      customSubcategories: shop.customSubcategories,
      delivery: {
        ...shop.delivery,
        ...(updates.delivery ?? {}),
      },
      businessHours: {
        ...shop.businessHours,
        ...(updates.businessHours ?? {}),
      },
      updatedAt: new Date().toISOString(),
    }

    persistShop(nextShop)
    syncWithService(
      services.shopService.update({
        shopName: nextShop.shopName,
        phone: nextShop.phone,
        city: nextShop.city,
        addressLine1: nextShop.addressLine1,
        area: nextShop.area,
        pincode: nextShop.pincode,
        delivery: nextShop.delivery,
        businessHours: nextShop.businessHours,
        updatedAt: nextShop.updatedAt,
      }),
    )
  }

  const getPublicUrl = () => shop.publicUrl

  const resetAllData = () => {
    const initialShop = normalizeShop(DEFAULT_SHOP)
    setOrders([])
    setProducts([])
    setOffers([])
    setShop(initialShop)
    showMessage('Local store reset')
  }

  const value = useMemo(
    () => ({
      orders,
      products,
      offers,
      shop,
      categories: publishedCategories && publishedCategories.length > 0 ? publishedCategories : FALLBACK_CATEGORIES,
      addCustomSubcategory,
      removeCustomSubcategory,
      getShopCategory,
      getAvailableSubcategories,
      isUsingFallbackCategoryForShop,
      updateOrderStatus,
      cancelOrder,
      getOrderById,
      createProduct,
      deleteProduct,
      updateProduct,
      toggleProductActive,
      toggleProductInStock,
      updateStockQty,
      getProductById,
      createOffer,
      deleteOffer,
      updateOffer,
      toggleOfferEnabled,
      getOfferById,
      updateShopSettings,
      getPublicUrl,
      resetAllData,
    }),
    [orders, products, offers, shop, services, showMessage, publishedCategories],
  )

  return <ShopkeeperStoreContext.Provider value={value}>{children}</ShopkeeperStoreContext.Provider>
}

export const useShopkeeperStore = () => {
  const context = useContext(ShopkeeperStoreContext)

  if (!context) {
    throw new Error('useShopkeeperStore must be used within ShopkeeperStoreProvider')
  }

  return context
}
