import type { Shop } from '../types/shop'

export const mockShop: Shop = {
  id: 'shop-001',
  shopName: 'Gupta Medical & General Store',
  categoryId: 'cat-general-store',
  categoryName: 'General Store',
  customSubcategories: [],
  ownerName: 'Rakesh Gupta',
  phone: '9876543210',
  city: 'Bhopal',
  addressLine1: '42, Main Market Road',
  area: 'Arera Colony',
  pincode: '462016',
  slug: 'gupta-medical',
  publicUrl: 'https://shop.example.com/gupta-medical',
  delivery: {
    payer: 'CUSTOMER',
    chargeAmount: 25,
    serviceRadiusKm: 6,
  },
  businessHours: {
    open: '09:00',
    close: '22:00',
  },
  updatedAt: '2026-03-02T09:00:00.000Z',
}
