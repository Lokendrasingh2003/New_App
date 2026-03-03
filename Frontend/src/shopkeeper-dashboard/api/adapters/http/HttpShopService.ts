import type { ShopDTO, UpdateShopRequest } from '../../contracts/shop'
import type { ShopService } from '../../services/ShopService'
import { httpClient } from './httpClient'

export class HttpShopService implements ShopService {
  async get(): Promise<ShopDTO> {
    // TODO: connect backend endpoint
    return httpClient<ShopDTO>('/api/shopkeeper/shop')
  }

  async update(req: UpdateShopRequest): Promise<ShopDTO> {
    // TODO: connect backend endpoint
    return httpClient<ShopDTO>('/api/shopkeeper/shop', {
      method: 'PATCH',
      body: req,
    })
  }

  async resetDemo(): Promise<void> {
    // TODO: connect backend endpoint
    await httpClient<void>('/api/shopkeeper/shop/reset-demo', {
      method: 'POST',
    })
  }

  async addCustomSubcategory(name: string): Promise<ShopDTO> {
    // TODO: connect backend endpoint
    return httpClient<ShopDTO>('/api/shopkeeper/shop/custom-subcategories', {
      method: 'POST',
      body: { name },
    })
  }

  async removeCustomSubcategory(name: string): Promise<ShopDTO> {
    // TODO: connect backend endpoint
    return httpClient<ShopDTO>('/api/shopkeeper/shop/custom-subcategories', {
      method: 'DELETE',
      body: { name },
    })
  }
}
