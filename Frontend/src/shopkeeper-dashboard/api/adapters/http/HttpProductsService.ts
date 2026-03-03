import type { CreateProductRequest, ProductDTO, UpdateProductRequest } from '../../contracts/products'
import type { ProductsService } from '../../services/ProductsService'
import { httpClient } from './httpClient'

export class HttpProductsService implements ProductsService {
  async list(): Promise<ProductDTO[]> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO[]>('/api/shopkeeper/products')
  }

  async getById(id: string): Promise<ProductDTO> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO>(`/api/shopkeeper/products/${id}`)
  }

  async create(req: CreateProductRequest): Promise<ProductDTO> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO>('/api/shopkeeper/products', {
      method: 'POST',
      body: req,
    })
  }

  async update(id: string, req: UpdateProductRequest): Promise<ProductDTO> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO>(`/api/shopkeeper/products/${id}`, {
      method: 'PATCH',
      body: req,
    })
  }

  async toggleActive(id: string): Promise<ProductDTO> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO>(`/api/shopkeeper/products/${id}/toggle-active`, {
      method: 'PATCH',
    })
  }

  async toggleInStock(id: string): Promise<ProductDTO> {
    // TODO: connect backend endpoint
    return httpClient<ProductDTO>(`/api/shopkeeper/products/${id}/toggle-stock`, {
      method: 'PATCH',
    })
  }
}
