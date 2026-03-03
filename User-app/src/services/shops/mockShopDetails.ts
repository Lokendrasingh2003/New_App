import { mockShops } from './mockShops';

export type ShopSubcategory = {
  id: string;
  name: string;
};

export type ShopDetails = {
  id: string;
  name: string;
  rating: number;
  distanceKm: number;
  etaMinutes: number;
  isOpenNow: boolean;
  isVerified: boolean;
  isPremium: boolean;
  subcategories: ShopSubcategory[];
};

const SUBCATEGORY_BY_CATEGORY: Record<string, ShopSubcategory[]> = {
  medical: [
    { id: 'essentials', name: 'Essentials' },
    { id: 'medicine', name: 'Medicines' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'baby-care', name: 'Baby Care' },
    { id: 'devices', name: 'Devices' },
  ],
  general: [
    { id: 'daily-needs', name: 'Daily Needs' },
    { id: 'beverages', name: 'Beverages' },
    { id: 'snacks', name: 'Snacks' },
    { id: 'household', name: 'Household' },
    { id: 'personal-care', name: 'Personal Care' },
  ],
  clothes: [
    { id: 'mens', name: 'Mens Wear' },
    { id: 'womens', name: 'Womens Wear' },
    { id: 'kids', name: 'Kids Wear' },
    { id: 'accessories', name: 'Accessories' },
    { id: 'footwear', name: 'Footwear' },
  ],
  bakery: [
    { id: 'breads', name: 'Breads' },
    { id: 'cakes', name: 'Cakes' },
    { id: 'cookies', name: 'Cookies' },
    { id: 'snacks', name: 'Snacks' },
  ],
  fruits: [
    { id: 'seasonal', name: 'Seasonal' },
    { id: 'exotic', name: 'Exotic' },
    { id: 'cut-fruits', name: 'Cut Fruits' },
    { id: 'juices', name: 'Juices' },
  ],
  vegetables: [
    { id: 'leafy', name: 'Leafy' },
    { id: 'roots', name: 'Roots' },
    { id: 'daily', name: 'Daily Veggies' },
    { id: 'organic', name: 'Organic' },
  ],
  dairy: [
    { id: 'milk', name: 'Milk' },
    { id: 'curd', name: 'Curd & Paneer' },
    { id: 'cheese', name: 'Cheese & Butter' },
    { id: 'beverages', name: 'Dairy Beverages' },
  ],
};

const FALLBACK_SUBCATEGORIES: ShopSubcategory[] = [
  { id: 'popular', name: 'Popular' },
  { id: 'recommended', name: 'Recommended' },
  { id: 'daily', name: 'Daily Use' },
  { id: 'top-deals', name: 'Top Deals' },
];

export function getMockShopById(shopId: string): ShopDetails {
  const found = mockShops.find((shop) => shop.id === shopId);

  if (!found) {
    return {
      id: shopId,
      name: 'Local Store',
      rating: 4.2,
      distanceKm: 2.4,
      etaMinutes: 28,
      isOpenNow: true,
      isVerified: true,
      isPremium: false,
      subcategories: FALLBACK_SUBCATEGORIES,
    };
  }

  return {
    id: found.id,
    name: found.name,
    rating: found.rating,
    distanceKm: found.distanceKm,
    etaMinutes: found.etaMinutes,
    isOpenNow: found.isOpenNow,
    isVerified: found.isVerified,
    isPremium: found.isPremium,
    subcategories: SUBCATEGORY_BY_CATEGORY[found.categoryId] ?? FALLBACK_SUBCATEGORIES,
  };
}
