import { apiRequest } from '../api/httpClient';

export type ApiCategory = {
  _id: string;
  name: string;
  slug?: string;
};

type CategoriesPayload = {
  categories?: ApiCategory[];
};

export const getCategories = async (): Promise<ApiCategory[]> => {
  const data = await apiRequest<CategoriesPayload>('/api/categories', {
    method: 'GET',
    query: {
      limit: 100,
      offset: 0,
    },
  });

  return data.categories || [];
};
