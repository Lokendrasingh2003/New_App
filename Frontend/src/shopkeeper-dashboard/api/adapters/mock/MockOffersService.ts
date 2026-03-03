import type { CreateOfferRequest, OfferDTO, UpdateOfferRequest } from '../../contracts/offers'
import type { OffersService } from '../../services/OffersService'
import { offerToDTO } from '../../mappers'
import { readOffers, readShop, writeOffers } from './storage'
import { sleep } from './sleep'

export class MockOffersService implements OffersService {
  async list(): Promise<OfferDTO[]> {
    await sleep()
    const shop = readShop()
    return readOffers().map((offer) => offerToDTO(offer, shop.id))
  }

  async getById(id: string): Promise<OfferDTO> {
    await sleep()
    const shop = readShop()
    const offer = readOffers().find((item) => item.id === id)
    if (!offer) {
      throw new Error('Offer not found')
    }

    return offerToDTO(offer, shop.id)
  }

  async create(req: CreateOfferRequest): Promise<OfferDTO> {
    await sleep()
    const shop = readShop()
    const offers = readOffers()

    const nowIso = new Date().toISOString()
    const created = {
      id: `off-${Date.now()}`,
      name: req.name,
      type: req.type as 'PERCENT' | 'FLAT',
      value: req.value,
      scope: req.scope as 'SHOP' | 'CATEGORIES' | 'PRODUCTS',
      categoryIds: req.categoryNames,
      productIds: req.productNames,
      startsAt: req.startsAt,
      endsAt: req.endsAt,
      enabled: req.enabled,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    writeOffers([created, ...offers])
    return offerToDTO(created, shop.id)
  }

  async update(id: string, req: UpdateOfferRequest): Promise<OfferDTO> {
    await sleep()
    const shop = readShop()
    const offers = readOffers()
    const index = offers.findIndex((item) => item.id === id)
    if (index < 0) {
      throw new Error('Offer not found')
    }

    const current = offers[index]
    const updated = {
      ...current,
      name: req.name ?? current.name,
      type: (req.type as 'PERCENT' | 'FLAT') ?? current.type,
      value: req.value ?? current.value,
      scope: (req.scope as 'SHOP' | 'CATEGORIES' | 'PRODUCTS') ?? current.scope,
      categoryIds: req.categoryNames ?? current.categoryIds,
      productIds: req.productNames ?? current.productIds,
      startsAt: req.startsAt ?? current.startsAt,
      endsAt: req.endsAt ?? current.endsAt,
      enabled: req.enabled ?? current.enabled,
      updatedAt: new Date().toISOString(),
    }

    offers[index] = updated
    writeOffers(offers)
    return offerToDTO(updated, shop.id)
  }

  async toggleEnabled(id: string): Promise<OfferDTO> {
    await sleep()
    const offer = await this.getById(id)
    return this.update(id, { enabled: !offer.enabled })
  }
}
