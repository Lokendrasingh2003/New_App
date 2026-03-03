export type CommissionOverride = {
  percentage: number
  updatedAt: string
}

export type CityCommissionOverride = CommissionOverride & {
  cityId: string
}

export type CategoryCommissionOverride = CommissionOverride & {
  categoryId: string
}

export type ShopCommissionOverride = CommissionOverride & {
  shopId: string
}

export type CommissionConfig = {
  defaultPercentage: number
  cityOverrides: CityCommissionOverride[]
  categoryOverrides: CategoryCommissionOverride[]
  shopOverrides: ShopCommissionOverride[]
  updatedAt: string
}

export type CommissionScope = {
  cityId?: string
  categoryId?: string
  shopId?: string
}
