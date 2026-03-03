import type { CreateProductRequest, ProductDTO, UpdateProductRequest } from '../contracts/products'

export interface ProductsService {
  list: () => Promise<ProductDTO[]>
  getById: (id: string) => Promise<ProductDTO>
  create: (req: CreateProductRequest) => Promise<ProductDTO>
  update: (id: string, req: UpdateProductRequest) => Promise<ProductDTO>
  toggleActive: (id: string) => Promise<ProductDTO>
  toggleInStock: (id: string) => Promise<ProductDTO>
}
