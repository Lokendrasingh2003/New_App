import { HttpOffersService, HttpOrdersService, HttpProductsService, HttpShopService } from './adapters/http'
import type { OffersService, OrdersService, ProductsService, ShopService } from './services'

export type ServiceRegistry = {
  ordersService: OrdersService
  productsService: ProductsService
  offersService: OffersService
  shopService: ShopService
}

export const getServices = (): ServiceRegistry => {
  return {
    ordersService: new HttpOrdersService(),
    productsService: new HttpProductsService(),
    offersService: new HttpOffersService(),
    shopService: new HttpShopService(),
  }
}
