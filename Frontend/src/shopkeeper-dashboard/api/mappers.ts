import type { OfferDTO } from './contracts/offers'
import type { ProductDTO } from './contracts/products'
import type { OrderDTO } from './contracts/orders'
import type { ShopDTO } from './contracts/shop'
import type { Offer } from '../types/offer'
import type { Product } from '../types/product'
import type { Order, OrderStatus } from '../types/order'
import type { Shop } from '../types/shop'

export const orderToDTO = (order: Order, shopId: string, shop: Shop): OrderDTO => {
  const qty = order.itemsCount > 0 ? order.itemsCount : 1
  const itemPrice = Math.round(order.total / qty)

  return {
    id: order.id,
    shopId,
    shortId: order.shortId,
    status: order.status,
    paymentMode: order.paymentMode,
    total: order.total,
    createdAt: order.createdAt,
    customer: {
      name: order.customerName,
      phone: order.customerPhone,
    },
    address: {
      line1: shop.addressLine1,
      area: shop.area,
      city: shop.city,
      pincode: shop.pincode,
    },
    items: [
      {
        productName: 'Order item',
        variantLabel: 'Default',
        qty,
        price: itemPrice,
      },
    ],
    cancelReason: order.cancelReason,
  }
}

export const orderFromDTO = (dto: OrderDTO): Order => ({
  id: dto.id,
  shortId: dto.shortId,
  customerName: dto.customer.name,
  customerPhone: dto.customer.phone,
  total: dto.total,
  paymentMode: (dto.paymentMode as 'COD' | 'ONLINE') ?? 'COD',
  status: dto.status as OrderStatus,
  createdAt: dto.createdAt,
  itemsCount: dto.items.reduce((sum, item) => sum + item.qty, 0),
  cancelReason: dto.cancelReason,
})

export const productToDTO = (product: Product, shopId: string): ProductDTO => ({
  id: product.id,
  shopId,
  name: product.name,
  description: product.description,
  categoryName: product.category,
  subcategoryName: product.subcategory,
  images: product.images,
  active: product.active,
  inStock: product.inStock,
  stockQty: product.stockQty,
  variants: product.variants.map((variant) => ({
    label: variant.label,
    price: variant.price,
    mrp: variant.mrp,
    inStock: variant.inStock,
  })),
  updatedAt: product.updatedAt,
})

export const productFromDTO = (dto: ProductDTO): Product => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  category: dto.categoryName,
  subcategory: dto.subcategoryName,
  images: dto.images,
  basePrice: dto.variants[0]?.price ?? 0,
  baseMrp: dto.variants[0]?.mrp ?? 0,
  stockQty: dto.stockQty,
  inStock: dto.inStock,
  active: dto.active,
  variants: dto.variants.map((variant, index) => ({
    id: `var-${dto.id}-${index}`,
    label: variant.label,
    price: variant.price,
    mrp: variant.mrp,
    inStock: variant.inStock,
  })),
  updatedAt: dto.updatedAt,
})

export const offerToDTO = (offer: Offer, shopId: string): OfferDTO => ({
  id: offer.id,
  shopId,
  name: offer.name,
  type: offer.type,
  value: offer.value,
  scope: offer.scope,
  categoryNames: offer.categoryIds,
  productNames: offer.productIds,
  startsAt: offer.startsAt,
  endsAt: offer.endsAt,
  enabled: offer.enabled,
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
})

export const offerFromDTO = (dto: OfferDTO): Offer => ({
  id: dto.id,
  name: dto.name,
  type: dto.type as 'PERCENT' | 'FLAT',
  value: dto.value,
  scope: dto.scope as 'SHOP' | 'CATEGORIES' | 'PRODUCTS',
  categoryIds: dto.categoryNames,
  productIds: dto.productNames,
  startsAt: dto.startsAt,
  endsAt: dto.endsAt,
  enabled: dto.enabled,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
})

export const shopToDTO = (shop: Shop): ShopDTO => ({
  id: shop.id,
  shopName: shop.shopName,
  categoryName: shop.categoryName,
  customSubcategories: shop.customSubcategories.map((item) => item.name),
  publicUrl: shop.publicUrl,
  slug: shop.slug,
  phone: shop.phone,
  city: shop.city,
  addressLine1: shop.addressLine1,
  area: shop.area,
  pincode: shop.pincode,
  delivery: shop.delivery,
  businessHours: shop.businessHours,
  updatedAt: shop.updatedAt,
})

export const shopFromDTO = (dto: ShopDTO, source: Shop): Shop => ({
  ...source,
  shopName: dto.shopName,
  categoryName: dto.categoryName,
  customSubcategories: dto.customSubcategories.map((name, index) => ({
    id: source.customSubcategories[index]?.id ?? `shop-sub-${index + 1}`,
    name,
    source: 'SHOP',
  })),
  publicUrl: dto.publicUrl,
  slug: dto.slug,
  phone: dto.phone,
  city: dto.city,
  addressLine1: dto.addressLine1,
  area: dto.area,
  pincode: dto.pincode,
  delivery: dto.delivery,
  businessHours: dto.businessHours,
  updatedAt: dto.updatedAt,
})
