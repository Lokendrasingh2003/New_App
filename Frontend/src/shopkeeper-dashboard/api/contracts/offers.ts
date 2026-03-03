export type OfferDTO = {
  id: string
  shopId: string
  name: string
  type: string
  value: number
  scope: string
  categoryNames?: string[]
  productNames?: string[]
  startsAt: string
  endsAt: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export type CreateOfferRequest = {
  shopId: string
  name: string
  type: string
  value: number
  scope: string
  categoryNames?: string[]
  productNames?: string[]
  startsAt: string
  endsAt: string
  enabled: boolean
}

export type UpdateOfferRequest = Partial<CreateOfferRequest>
