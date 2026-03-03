import { HttpOffersService, HttpOrdersService, HttpProductsService, HttpShopService } from './adapters/http'
import { MockOffersService, MockOrdersService, MockProductsService, MockShopService } from './adapters/mock'
import type { OffersService, OrdersService, ProductsService, ShopService } from './services'

export type ServiceRegistry = {
  ordersService: OrdersService
  productsService: ProductsService
  offersService: OffersService
  shopService: ShopService
}

export const getServices = (): ServiceRegistry => {
  const source = (import.meta.env.VITE_DATA_SOURCE as 'mock' | 'http' | undefined) ?? 'mock'

  if (source === 'http') {
    return {
      ordersService: new HttpOrdersService(),
      productsService: new HttpProductsService(),
      offersService: new HttpOffersService(),
      shopService: new HttpShopService(),
    }
  }

  return {
    ordersService: new MockOrdersService(),
    productsService: new MockProductsService(),
    offersService: new MockOffersService(),
    shopService: new MockShopService(),
  }
}
