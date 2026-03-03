import type { CommissionConfig } from '../../types/CommissionConfig'

export const commissionSeed: CommissionConfig = {
  defaultPercentage: 3,
  cityOverrides: [
    {
      cityId: 'city_delhi',
      percentage: 3.5,
      updatedAt: '2026-02-10T09:00:00.000Z',
    },
    {
      cityId: 'city_mumbai',
      percentage: 4,
      updatedAt: '2026-02-10T09:00:00.000Z',
    },
  ],
  categoryOverrides: [
    {
      categoryId: 'cat_medical',
      percentage: 2.5,
      updatedAt: '2026-02-10T09:00:00.000Z',
    },
  ],
  shopOverrides: [
    {
      shopId: 'shop_001',
      percentage: 2,
      updatedAt: '2026-02-10T09:00:00.000Z',
    },
  ],
  updatedAt: '2026-02-10T09:00:00.000Z',
}
