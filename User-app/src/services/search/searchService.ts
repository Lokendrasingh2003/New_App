import {
  MockSearchCategory,
  MockSearchProduct,
  MockSearchShop,
  mockCategories,
  mockProducts,
  mockShops,
} from './mockSearchData';

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

export const searchAll = (query: string): SearchAllResult => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return {
      shops: [],
      products: [],
      categories: [],
      suggestions: [],
    };
  }

  const shops = sortByBestMatch(includesQuery(mockShops, trimmedQuery), trimmedQuery);
  const products = sortByBestMatch(includesQuery(mockProducts, trimmedQuery), trimmedQuery);
  const categories = sortByBestMatch(includesQuery(mockCategories, trimmedQuery), trimmedQuery);

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
