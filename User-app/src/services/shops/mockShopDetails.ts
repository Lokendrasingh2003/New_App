import { apiRequest } from '../api/httpClient';

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

const FALLBACK_SUBCATEGORIES: ShopSubcategory[] = [
  { id: 'all-products', name: 'All Products' },
];

type ShopDetailPayload = {
  shop?: {
    id: string;
    shopName: string;
    rating?: number;
    isOpen?: boolean;
    category?: string;
  };
};

type ShopProductsPayload = {
  products?: Array<{
    id: string;
    subcategory?: string;
  }>;
};

type CategoriesPayload = {
  categories?: Array<{
    _id?: string;
    name?: string;
    subcategories?: Array<{
      id?: string;
      name?: string;
      isActive?: boolean;
    }>;
  }>;
};

const toSubcategoryId = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';

const normalize = (value: string) => String(value || '').trim().toLowerCase();

const getCategorySubcategories = async (categoryName: string): Promise<ShopSubcategory[]> => {
  const cleanedCategoryName = String(categoryName || '').trim();
  if (!cleanedCategoryName) {
    return [];
  }

  try {
    const data = await apiRequest<CategoriesPayload>('/api/categories', {
      method: 'GET',
      query: {
        limit: 100,
        offset: 0,
      },
    });

    const categories = data.categories || [];
    const matched = categories.find(
      (item) => normalize(String(item.name || '')) === normalize(cleanedCategoryName),
    );

    if (!matched) {
      return [];
    }

    return (matched.subcategories || [])
      .filter((item) => item.isActive !== false && String(item.name || '').trim().length > 0)
      .map((item) => {
        const name = String(item.name || '').trim();
        return {
          // Keep id format aligned with product-side resolver (slug from name).
          id: toSubcategoryId(name),
          name,
        };
      });
  } catch {
    return [];
  }
};

const getShopSubcategories = async (shopId: string, categoryName: string): Promise<ShopSubcategory[]> => {
  const categorySubcategories = await getCategorySubcategories(categoryName);

  try {
    const data = await apiRequest<ShopProductsPayload>(`/api/products/shops/${shopId}`, {
      method: 'GET',
      query: {
        limit: 100,
        offset: 0,
      },
    });

    const unique = new Map<string, ShopSubcategory>();
    let allHaveSubcategory = true;

    (data.products || []).forEach((item) => {
      const raw = String((item as { subcategory?: string }).subcategory || '').trim();

      if (!raw) {
        // This product has no subcategory info in the list response.
        // We'll fall back to 'all-products' section for the whole shop.
        allHaveSubcategory = false;
        return;
      }

      const id = toSubcategoryId(raw);
      if (!unique.has(id)) {
        unique.set(id, { id, name: raw });
      }
    });

    // If no products had subcategory info (old backend), fall back to 'all-products' catch-all
    if (unique.size === 0 || !allHaveSubcategory) {
      if (!unique.has('all-products') && unique.size === 0) {
        unique.set('all-products', { id: 'all-products', name: 'All Products' });
      }
    }

    const combined = new Map<string, ShopSubcategory>();

    categorySubcategories.forEach((subcategory) => {
      combined.set(normalize(subcategory.name), subcategory);
    });

    unique.forEach((subcategory) => {
      if (!combined.has(normalize(subcategory.name))) {
        combined.set(normalize(subcategory.name), subcategory);
      }
    });

    const values = [...combined.values()];
    return values.length > 0 ? values : FALLBACK_SUBCATEGORIES;
  } catch {
    return categorySubcategories.length > 0 ? categorySubcategories : FALLBACK_SUBCATEGORIES;
  }
};

export async function getMockShopById(shopId: string): Promise<ShopDetails | null> {
  const data = await apiRequest<ShopDetailPayload>(`/api/shops/${shopId}`, {
    method: 'GET',
  });

  if (!data.shop) {
    return null;
  }

  const subcategories = await getShopSubcategories(shopId, String(data.shop.category || ''));

  return {
    id: String(data.shop.id),
    name: String(data.shop.shopName || 'Local Shop'),
    rating: Number(data.shop.rating || 0),
    distanceKm: 0,
    etaMinutes: 20,
    isOpenNow: Boolean(data.shop.isOpen),
    isVerified: true,
    isPremium: false,
    subcategories,
  };
}
