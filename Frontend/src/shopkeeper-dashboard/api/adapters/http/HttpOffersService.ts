import type { CreateOfferRequest, OfferDTO, UpdateOfferRequest } from '../../contracts/offers'
import type { OffersService } from '../../services/OffersService'
import { httpClient } from './httpClient'

export class HttpOffersService implements OffersService {
  async list(): Promise<OfferDTO[]> {
    // TODO: connect backend endpoint
    return httpClient<OfferDTO[]>('/api/shopkeeper/offers')
  }

  async getById(id: string): Promise<OfferDTO> {
    // TODO: connect backend endpoint
    return httpClient<OfferDTO>(`/api/shopkeeper/offers/${id}`)
  }

  async create(req: CreateOfferRequest): Promise<OfferDTO> {
    // TODO: connect backend endpoint
    return httpClient<OfferDTO>('/api/shopkeeper/offers', {
      method: 'POST',
      body: req,
    })
  }

  async update(id: string, req: UpdateOfferRequest): Promise<OfferDTO> {
    // TODO: connect backend endpoint
    return httpClient<OfferDTO>(`/api/shopkeeper/offers/${id}`, {
      method: 'PATCH',
      body: req,
    })
  }

  async toggleEnabled(id: string): Promise<OfferDTO> {
    // TODO: connect backend endpoint
    return httpClient<OfferDTO>(`/api/shopkeeper/offers/${id}/toggle-enabled`, {
      method: 'PATCH',
    })
  }
}
