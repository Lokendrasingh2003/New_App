import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { apiRequest } from '../api/httpClient';

export type MockSearchShop = {
  id: string;
  name: string;
  categoryId: string;
  rating: number;
  eta: string;
};

export type MockSearchProduct = {
  id: string;
  productId: string;
  name: string;
  price: number;
  mrp?: number;
  shopId: string;
  categoryId: string;
};

export type MockSearchCategory = {
  id: string;
  name: string;
};

export type SearchSuggestionType = 'Shop' | 'Product' | 'Category';

export type SearchSuggestion = {
  id: string;
  label: string;
  type: SearchSuggestionType;
};

export type SearchAllResult = {
  shops: MockSearchShop[];
  products: MockSearchProduct[];
  categories: MockSearchCategory[];
  suggestions: SearchSuggestion[];
};

type CityPayload = {
  city_id: string;
};

type ShopPayload = {
  shops?: Array<{
    id: string;
    shopName: string;
    category?: string;
    rating?: number;
    distance?: number;
  }>;
};

type ProductPayload = {
  products?: Array<{
    id: string;
    name: string;
    basePrice?: number;
    baseMrp?: number;
    shopId?: string;
    categoryName?: string;
  }>;
};

type CategoryPayload = {
  categories?: Array<{
    _id: string;
    name: string;
  }>;
};

const normalize = (value: string) => value.trim().toLowerCase();

const sortByBestMatch = <T extends { name: string }>(items: T[], query: string): T[] => {
  const normalizedQuery = normalize(query);

  return [...items].sort((left, right) => {
    const leftName = normalize(left.name);
    const rightName = normalize(right.name);

    const leftStarts = leftName.startsWith(normalizedQuery) ? 0 : 1;
    const rightStarts = rightName.startsWith(normalizedQuery) ? 0 : 1;

    if (leftStarts !== rightStarts) {
      return leftStarts - rightStarts;
    }

    const leftIndex = leftName.indexOf(normalizedQuery);
    const rightIndex = rightName.indexOf(normalizedQuery);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return leftName.localeCompare(rightName);
  });
};

const includesQuery = <T extends { name: string }>(items: T[], query: string): T[] => {
  const normalizedQuery = normalize(query);
  return items.filter((item) => normalize(item.name).includes(normalizedQuery));
};

const getCurrentCityId = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CITY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CityPayload;
    return parsed.city_id || null;
  } catch {
    return null;
  }
};

export const searchAll = async (query: string): Promise<SearchAllResult> => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      shops: [],
      products: [],
      categories: [],
      suggestions: [],
    };
  }

  const cityId = await getCurrentCityId();

  const [shopsResp, productsResp, categoriesResp] = await Promise.all([
    cityId
      ? apiRequest<ShopPayload>(`/api/cities/${cityId}/shops`, {
          method: 'GET',
          query: {
            limit: 50,
            offset: 0,
          },
        })
      : Promise.resolve({ shops: [] }),
    cityId
      ? apiRequest<ProductPayload>('/api/products/search', {
          method: 'GET',
          query: {
            q: trimmedQuery,
            cityId,
            limit: 50,
            offset: 0,
          },
        })
      : Promise.resolve({ products: [] }),
    apiRequest<CategoryPayload>('/api/categories', {
      method: 'GET',
      query: {
        limit: 50,
        offset: 0,
      },
    }),
  ]);

  const shopsData: MockSearchShop[] = (shopsResp.shops || []).map((shop) => ({
    id: String(shop.id),
    name: String(shop.shopName || 'Local Shop'),
    categoryId: String(shop.category || 'general'),
    rating: Number(shop.rating || 0),
    eta: `${Math.max(10, Math.round(Number(shop.distance || 0) * 8 + 12))} min`,
  }));

  const productsData: MockSearchProduct[] = (productsResp.products || []).map((product) => ({
    id: String(product.id),
    productId: String(product.id),
    name: String(product.name || 'Product'),
    price: Number(product.basePrice || 0),
    mrp: Number(product.baseMrp || product.basePrice || 0),
    shopId: String(product.shopId || ''),
    categoryId: String(product.categoryName || ''),
  }));

  const categoriesData: MockSearchCategory[] = (categoriesResp.categories || []).map((category) => ({
    id: String(category._id),
    name: String(category.name),
  }));

  const shops = sortByBestMatch(includesQuery(shopsData, trimmedQuery), trimmedQuery);
  const products = sortByBestMatch(includesQuery(productsData, trimmedQuery), trimmedQuery);
  const categories = sortByBestMatch(includesQuery(categoriesData, trimmedQuery), trimmedQuery);

  const suggestions: SearchSuggestion[] = [
    ...shops.slice(0, 2).map((shop) => ({
      id: `shop-${shop.id}`,
      label: shop.name,
      type: 'Shop' as const,
    })),
    ...products.slice(0, 2).map((product) => ({
      id: `product-${product.id}`,
      label: product.name,
      type: 'Product' as const,
    })),
    ...categories.slice(0, 2).map((category) => ({
      id: `category-${category.id}`,
      label: category.name,
      type: 'Category' as const,
    })),
  ].slice(0, 6);

  return {
    shops,
    products,
    categories,
    suggestions,
  };
};
