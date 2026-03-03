export type City = {
  id: string
  name: string
  slug: string
  isActive: boolean
  deliveryEnabled: boolean
  commissionOverridePercentage?: number | null
  createdAt: string
  updatedAt: string
}
