import type { CreateProductRequest, ProductDTO, UpdateProductRequest } from '../../contracts/products'
import type { ProductsService } from '../../services/ProductsService'
import { productToDTO } from '../../mappers'
import { readProducts, readShop, writeProducts } from './storage'
import { sleep } from './sleep'

export class MockProductsService implements ProductsService {
  async list(): Promise<ProductDTO[]> {
    await sleep()
    const shop = readShop()
    return readProducts().map((product) => productToDTO(product, shop.id))
  }

  async getById(id: string): Promise<ProductDTO> {
    await sleep()
    const shop = readShop()
    const product = readProducts().find((item) => item.id === id)
    if (!product) {
      throw new Error('Product not found')
    }

    return productToDTO(product, shop.id)
  }

  async create(req: CreateProductRequest): Promise<ProductDTO> {
    await sleep()
    const shop = readShop()
    const products = readProducts()

    const created = {
      id: `prd-${Date.now()}`,
      name: req.name,
      description: req.description,
      category: req.categoryName,
      subcategory: req.subcategoryName,
      images: req.images,
      basePrice: req.variants[0]?.price ?? 0,
      baseMrp: req.variants[0]?.mrp ?? 0,
      stockQty: req.stockQty,
      inStock: req.inStock,
      active: req.active,
      variants: req.variants.map((variant, index) => ({
        id: `var-${Date.now()}-${index}`,
        label: variant.label,
        price: variant.price,
        mrp: variant.mrp,
        inStock: variant.inStock,
      })),
      updatedAt: new Date().toISOString(),
    }

    writeProducts([created, ...products])
    return productToDTO(created, shop.id)
  }

  async update(id: string, req: UpdateProductRequest): Promise<ProductDTO> {
    await sleep()
    const shop = readShop()
    const products = readProducts()
    const index = products.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Product not found')
    }

    const current = products[index]
    const updated = {
      ...current,
      name: req.name ?? current.name,
      description: req.description ?? current.description,
      category: req.categoryName ?? current.category,
      subcategory: req.subcategoryName ?? current.subcategory,
      images: req.images ?? current.images,
      active: req.active ?? current.active,
      inStock: req.inStock ?? current.inStock,
      stockQty: req.stockQty ?? current.stockQty,
      variants:
        req.variants?.map((variant, variantIndex) => ({
          id: current.variants[variantIndex]?.id ?? `var-${Date.now()}-${variantIndex}`,
          label: variant.label,
          price: variant.price,
          mrp: variant.mrp,
          inStock: variant.inStock,
        })) ?? current.variants,
      updatedAt: new Date().toISOString(),
    }

    products[index] = updated
    writeProducts(products)
    return productToDTO(updated, shop.id)
  }

  async toggleActive(id: string): Promise<ProductDTO> {
    await sleep()
    const product = await this.getById(id)
    return this.update(id, { active: !product.active })
  }

  async toggleInStock(id: string): Promise<ProductDTO> {
    await sleep()
    const product = await this.getById(id)
    return this.update(id, { inStock: !product.inStock })
  }
}
