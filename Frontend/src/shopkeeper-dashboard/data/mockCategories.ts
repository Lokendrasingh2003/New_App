import type { Category } from '../types/category'

export const mockCategories: Category[] = [
  {
    id: 'cat-general-store',
    name: 'General Store',
    subcategories: [
      { id: 'sub-household', name: 'Household', source: 'ADMIN' },
      { id: 'sub-bakery', name: 'Bakery', source: 'ADMIN' },
      { id: 'sub-snacks', name: 'Snacks', source: 'ADMIN' },
      { id: 'sub-beverages', name: 'Beverages', source: 'ADMIN' },
      { id: 'sub-personal-care', name: 'Personal Care', source: 'ADMIN' },
      { id: 'sub-stationery', name: 'Stationery', source: 'ADMIN' },
    ],
  },
  {
    id: 'cat-medical',
    name: 'Medical',
    subcategories: [
      { id: 'sub-otc-medicines', name: 'OTC Medicines', source: 'ADMIN' },
      { id: 'sub-prescription', name: 'Prescription Medicines', source: 'ADMIN' },
      { id: 'sub-health-devices', name: 'Health Devices', source: 'ADMIN' },
      { id: 'sub-first-aid', name: 'First Aid', source: 'ADMIN' },
      { id: 'sub-vitamins', name: 'Vitamins & Supplements', source: 'ADMIN' },
    ],
  },
  {
    id: 'cat-grocery',
    name: 'Grocery',
    subcategories: [
      { id: 'sub-rice-pulses', name: 'Rice & Pulses', source: 'ADMIN' },
      { id: 'sub-flour-grains', name: 'Flour & Grains', source: 'ADMIN' },
      { id: 'sub-edible-oils', name: 'Edible Oils', source: 'ADMIN' },
      { id: 'sub-spices-masala', name: 'Spices & Masala', source: 'ADMIN' },
      { id: 'sub-dry-fruits', name: 'Dry Fruits', source: 'ADMIN' },
      { id: 'sub-packaged-food', name: 'Packaged Food', source: 'ADMIN' },
    ],
  },
  {
    id: 'cat-bakery',
    name: 'Bakery',
    subcategories: [
      { id: 'sub-breads', name: 'Breads', source: 'ADMIN' },
      { id: 'sub-cakes', name: 'Cakes', source: 'ADMIN' },
      { id: 'sub-pastries', name: 'Pastries', source: 'ADMIN' },
      { id: 'sub-cookies', name: 'Cookies', source: 'ADMIN' },
      { id: 'sub-biscuits', name: 'Biscuits', source: 'ADMIN' },
    ],
  },
  {
    id: 'cat-electronics',
    name: 'Electronics',
    subcategories: [
      { id: 'sub-mobile-accessories', name: 'Mobile Accessories', source: 'ADMIN' },
      { id: 'sub-audio-devices', name: 'Audio Devices', source: 'ADMIN' },
      { id: 'sub-kitchen-appliances', name: 'Kitchen Appliances', source: 'ADMIN' },
      { id: 'sub-power-backup', name: 'Power Backup', source: 'ADMIN' },
      { id: 'sub-smart-gadgets', name: 'Smart Gadgets', source: 'ADMIN' },
    ],
  },
]
