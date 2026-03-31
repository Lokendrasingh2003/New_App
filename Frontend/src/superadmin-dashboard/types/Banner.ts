export type BannerType = 'PROMOTIONAL' | 'SEASONAL' | 'GENERAL' | 'FEATURED'
export type TargetAudience = 'ALL' | 'NEW_USERS' | 'RETURNING_USERS'

export type Banner = {
  id: string
  title: string
  imageUrl: string
  redirectUrl: string | null
  description: string | null
  position: number
  isActive: boolean
  bannerType: BannerType
  targetAudience: TargetAudience
  startDate: string | null
  endDate: string | null
  createdAt: string
  updatedAt: string
}
