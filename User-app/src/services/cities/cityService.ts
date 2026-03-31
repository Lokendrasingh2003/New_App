import { apiRequest } from '../api/httpClient';

export type ApiCity = {
  _id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
};

type CitiesPayload = {
  cities?: ApiCity[];
};

export const getCities = async (): Promise<ApiCity[]> => {
  const data = await apiRequest<CitiesPayload>('/api/cities', {
    method: 'GET',
    query: {
      limit: 100,
      offset: 0,
    },
  });

  return data.cities || [];
};
