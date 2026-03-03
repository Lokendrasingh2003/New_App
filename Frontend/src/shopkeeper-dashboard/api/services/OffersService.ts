import type { CreateOfferRequest, OfferDTO, UpdateOfferRequest } from '../contracts/offers'

export interface OffersService {
  list: () => Promise<OfferDTO[]>
  getById: (id: string) => Promise<OfferDTO>
  create: (req: CreateOfferRequest) => Promise<OfferDTO>
  update: (id: string, req: UpdateOfferRequest) => Promise<OfferDTO>
  toggleEnabled: (id: string) => Promise<OfferDTO>
}
