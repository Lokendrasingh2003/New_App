import { mockOffers } from '../../../data/mockOffers'
import { mockOrders } from '../../../data/mockOrders'
import { mockProducts } from '../../../data/mockProducts'
import { mockShop } from '../../../data/mockShop'
import type { Shop } from '../../../types/shop'
import type { ShopDTO, UpdateShopRequest } from '../../contracts/shop'
import type { ShopService } from '../../services/ShopService'
import { shopToDTO } from '../../mappers'
import { clearDemoStorage, readShop, writeOffers, writeOrders, writeProducts, writeShop } from './storage'
import { sleep } from './sleep'

const normalize = (value: string) => value.trim().toLowerCase()

export class MockShopService implements ShopService {
  async get(): Promise<ShopDTO> {
    await sleep()
    return shopToDTO(readShop())
  }

  async update(req: UpdateShopRequest): Promise<ShopDTO> {
    await sleep()
    const current = readShop()
    const nextCustomSubcategories = req.customSubcategories
      ? req.customSubcategories.map((name, index) => ({
          id: current.customSubcategories[index]?.id ?? `shop-sub-${Date.now()}-${index}`,
          name,
          source: 'SHOP' as const,
        }))
      : current.customSubcategories

    const next: Shop = {
      ...current,
      ...req,
      customSubcategories: nextCustomSubcategories,
      delivery: {
        ...current.delivery,
        ...(req.delivery ?? {}),
      },
      businessHours: {
        ...current.businessHours,
        ...(req.businessHours ?? {}),
      },
      updatedAt: new Date().toISOString(),
    }

    writeShop(next)
    return shopToDTO(next)
  }

  async resetDemo(): Promise<void> {
    await sleep()
    clearDemoStorage()
    writeOrders(mockOrders)
    writeProducts(mockProducts)
    writeOffers(mockOffers)
    writeShop(mockShop)
  }

  async addCustomSubcategory(name: string): Promise<ShopDTO> {
    await sleep()
    const current = readShop()
    const trimmed = name.trim()

    if (!trimmed) {
      throw new Error('Subcategory name is required')
    }

    const exists = current.customSubcategories.some((item) => normalize(item.name) === normalize(trimmed))
    if (exists) {
      throw new Error('Subcategory already exists')
    }

    if (current.customSubcategories.length >= 3) {
      throw new Error('You can add up to 3 custom subcategories only')
    }

    const next = {
      ...current,
      customSubcategories: [
        ...current.customSubcategories,
        {
          id: `shop-sub-${Date.now()}`,
          name: trimmed,
          source: 'SHOP' as const,
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    writeShop(next)
    return shopToDTO(next)
  }

  async removeCustomSubcategory(name: string): Promise<ShopDTO> {
    await sleep()
    const current = readShop()
    const next = {
      ...current,
      customSubcategories: current.customSubcategories.filter(
        (item) => normalize(item.name) !== normalize(name),
      ),
      updatedAt: new Date().toISOString(),
    }

    writeShop(next)
    return shopToDTO(next)
  }
}
