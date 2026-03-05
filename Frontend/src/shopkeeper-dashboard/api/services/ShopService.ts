import type { ShopDTO, UpdateShopRequest } from '../contracts/shop'

export interface ShopService {
  get: () => Promise<ShopDTO>
  update: (req: UpdateShopRequest) => Promise<ShopDTO>
  addCustomSubcategory: (name: string) => Promise<ShopDTO>
  removeCustomSubcategory: (name: string) => Promise<ShopDTO>
}
