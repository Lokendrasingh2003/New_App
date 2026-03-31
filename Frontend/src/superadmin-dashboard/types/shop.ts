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
  description?: string
  addressLine1?: string
  area?: string
  pincode?: string
  openingTime?: string
  closingTime?: string
  imageUrl?: string
  gstNumber?: string
  businessProofUrl?: string
  identityProofUrl?: string
  bankAccountHolderName?: string
  bankIfscCode?: string
  bankAccountNumberMasked?: string
  registrationReviewStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null
  createdAt: string
  updatedAt: string
}
