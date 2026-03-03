export type Product = {
  id: string;
  name: string;
  brand: string;
  image: string;
  unit: string;
  price: number;
  mrp: number;
  discountLabel: string;
};

export type Subcategory = {
  id: string;
  name: string;
  products: Product[];
};

export type Shop = {
  id: string;
  name: string;
  image: string;
  info: string;
  timing: string;
  address: string;
  banners: string[];
  subcategories: Subcategory[];
};

export type ShopCategory = {
  id: string;
  name: string;
  shops: Shop[];
};

const demoProducts = (prefix: string): Product[] => [
  {
    id: `${prefix}-prod-1`,
    name: 'Carrot - Orange',
    brand: 'Freshol',
    image: 'https://picsum.photos/id/300/400/320',
    unit: '500 g',
    price: 27,
    mrp: 35,
    discountLabel: '23% OFF',
  },
  {
    id: `${prefix}-prod-2`,
    name: 'Cauliflower',
    brand: 'Freshol',
    image: 'https://picsum.photos/id/301/400/320',
    unit: '1 pc',
    price: 20,
    mrp: 57,
    discountLabel: '65% OFF',
  },
  {
    id: `${prefix}-prod-3`,
    name: 'Premium Cookies',
    brand: 'Bake Day',
    image: 'https://picsum.photos/id/302/400/320',
    unit: '250 g',
    price: 89,
    mrp: 120,
    discountLabel: '26% OFF',
  },
];

const demoSubcategories = (prefix: string): Subcategory[] => [
  {
    id: `${prefix}-sub-1`,
    name: 'Household',
    products: demoProducts(`${prefix}-household`),
  },
  {
    id: `${prefix}-sub-2`,
    name: 'Bakery',
    products: demoProducts(`${prefix}-bakery`),
  },
  {
    id: `${prefix}-sub-3`,
    name: 'Snacks',
    products: demoProducts(`${prefix}-snacks`),
  },
];

const makeShop = (
  id: string,
  name: string,
  image: string,
  info: string,
  timing: string,
  address: string
): Shop => ({
  id,
  name,
  image,
  info,
  timing,
  address,
  banners: [
    'https://picsum.photos/id/220/1200/420',
    'https://picsum.photos/id/221/1200/420',
    'https://picsum.photos/id/222/1200/420',
  ],
  subcategories: demoSubcategories(id),
});

export const DEMO_CATEGORIES: ShopCategory[] = [
  {
    id: 'medical',
    name: 'Medical Shops',
    shops: [
      makeShop(
        'med-1',
        'City Care Pharmacy',
        'https://picsum.photos/id/101/500/300',
        'Open • 10 mins',
        '9:00 AM - 10:00 PM',
        'Bhind Road, Lashkar, Gwalior'
      ),
      makeShop(
        'med-2',
        'Health Plus Store',
        'https://picsum.photos/id/102/500/300',
        'Open • 15 mins',
        '8:30 AM - 11:00 PM',
        'Morar Market, Gwalior'
      ),
      makeShop(
        'med-3',
        'Apollo Generic Hub',
        'https://picsum.photos/id/103/500/300',
        'Open • 12 mins',
        '9:00 AM - 9:30 PM',
        'Thatipur, Gwalior'
      ),
    ],
  },
  {
    id: 'general',
    name: 'General Stores',
    shops: [
      makeShop(
        'gen-1',
        'Daily Needs Mart',
        'https://picsum.photos/id/104/500/300',
        'Open • 9 mins',
        '8:00 AM - 11:30 PM',
        'City Center, Gwalior'
      ),
      makeShop(
        'gen-2',
        'Neighborhood Kirana',
        'https://picsum.photos/id/105/500/300',
        'Open • 11 mins',
        '7:30 AM - 10:30 PM',
        'Phoolbagh, Gwalior'
      ),
      makeShop(
        'gen-3',
        'Family Super Store',
        'https://picsum.photos/id/106/500/300',
        'Open • 14 mins',
        '8:00 AM - 10:00 PM',
        'Jiwaji Ganj, Gwalior'
      ),
    ],
  },
  {
    id: 'clothes',
    name: 'Clothes Shops',
    shops: [
      makeShop(
        'clo-1',
        'Fashion Lane',
        'https://picsum.photos/id/107/500/300',
        'Open • 18 mins',
        '10:00 AM - 9:00 PM',
        'DD Mall Road, Gwalior'
      ),
      makeShop(
        'clo-2',
        'Urban Wear Point',
        'https://picsum.photos/id/108/500/300',
        'Open • 20 mins',
        '10:30 AM - 9:30 PM',
        'Patankar Bazar, Gwalior'
      ),
      makeShop(
        'clo-3',
        'Classic Outfit House',
        'https://picsum.photos/id/109/500/300',
        'Open • 16 mins',
        '10:00 AM - 8:30 PM',
        'Naya Bazar, Gwalior'
      ),
    ],
  },
];

export const DEMO_SHOPS = DEMO_CATEGORIES.flatMap((category) => category.shops);

export const getShopById = (shopId: string) => DEMO_SHOPS.find((shop) => shop.id === shopId);

export const getCategoryById = (categoryId: string) =>
  DEMO_CATEGORIES.find((category) => category.id === categoryId);

export const getShopSubcategoryById = (shopId: string, subcategoryId: string) => {
  const shop = getShopById(shopId);
  if (!shop) {
    return null;
  }

  const subcategory = shop.subcategories.find((item) => item.id === subcategoryId);
  if (!subcategory) {
    return null;
  }

  return {
    shop,
    subcategory,
  };
};
