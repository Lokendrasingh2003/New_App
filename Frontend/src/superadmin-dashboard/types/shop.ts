export type ShopStatus = 'pending_approval' | 'approved' | 'rejected' | 'suspended' | 'reactivated'

export type Shop = {
  id: string
  shopName: string
  ownerName: string
  phone: string
  cityId: string
  categoryName: string
  slug: string
  status: ShopStatus
  isPublic: boolean
  rejectReason?: string
  createdAt: string
  updatedAt: string
}
