import AsyncStorage from '@react-native-async-storage/async-storage';

import { getNearbyPrefs } from '../location/nearbyService';
import { STORAGE_KEYS } from '../../constants/storage';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { apiRequest } from '../api/httpClient';

export type DiscoveryShop = {
  id: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
  rating: number;
  distanceKm: number;
  etaMinutes: number;
  isOpenNow: boolean;
  isVerified: boolean;
  isTrending: boolean;
  createdAt: string;
  isPremium: boolean;
};

export type SortOption = 'nearest' | 'highest_rated' | 'fastest' | 'trending' | 'newest';

export type Filters = {
  openNow?: boolean;
  verified?: boolean;
  minRating?: number;
  maxEta?: number;
  maxDistanceKm?: number;
};

type DiscoverParams = {
  categoryId?: string;
  sort: SortOption;
  filters: Filters;
};

type CityPayload = {
  city_id: string;
  name: string;
};

type CityShopsPayload = {
  shops?: Array<{
    id: string;
    shopName: string;
    category?: string;
    rating?: number;
    imageUrl?: string | null;
    distance?: number;
    isOpen?: boolean;
  }>;
};

const normalizeCategory = (value: string) => String(value || '').trim().toLowerCase();

const toCategoryId = (value: string) =>
  normalizeCategory(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapApiShop = (shop: NonNullable<CityShopsPayload['shops']>[number]): DiscoveryShop => {
  const distance = Number(shop.distance || 0);
  const eta = Math.max(10, Math.round(distance * 8 + 12));

  return {
    id: String(shop.id),
    name: String(shop.shopName || 'Local Shop'),
    imageUrl: resolveMediaUrl(shop.imageUrl) || undefined,
    categoryId: toCategoryId(shop.category || 'general'),
    rating: Number(shop.rating || 0),
    distanceKm: Number(distance.toFixed(2)),
    etaMinutes: eta,
    isOpenNow: Boolean(shop.isOpen),
    isVerified: true,
    isTrending: Number(shop.rating || 0) >= 4.4,
    createdAt: new Date().toISOString(),
    isPremium: Number(shop.rating || 0) >= 4.6,
  };
};

const getCurrentCityId = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CITY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CityPayload;
    return parsed?.city_id || null;
  } catch {
    return null;
  }
};

const byNearest = (left: DiscoveryShop, right: DiscoveryShop) => left.distanceKm - right.distanceKm;

const byHighestRated = (left: DiscoveryShop, right: DiscoveryShop) => {
  if (right.rating !== left.rating) {
    return right.rating - left.rating;
  }
  return left.distanceKm - right.distanceKm;
};

const byFastest = (left: DiscoveryShop, right: DiscoveryShop) => {
  if (left.etaMinutes !== right.etaMinutes) {
    return left.etaMinutes - right.etaMinutes;
  }
  return left.distanceKm - right.distanceKm;
};

const byTrending = (left: DiscoveryShop, right: DiscoveryShop) => {
  if (left.isTrending !== right.isTrending) {
    return left.isTrending ? -1 : 1;
  }
  if (right.rating !== left.rating) {
    return right.rating - left.rating;
  }
  return left.distanceKm - right.distanceKm;
};

const byNewest = (left: DiscoveryShop, right: DiscoveryShop) => {
  const leftDate = new Date(left.createdAt).getTime();
  const rightDate = new Date(right.createdAt).getTime();
  return rightDate - leftDate;
};

const sortMap: Record<SortOption, (left: DiscoveryShop, right: DiscoveryShop) => number> = {
  nearest: byNearest,
  highest_rated: byHighestRated,
  fastest: byFastest,
  trending: byTrending,
  newest: byNewest,
};

export const discoverShops = async ({
  categoryId,
  sort,
  filters,
}: DiscoverParams): Promise<DiscoveryShop[]> => {
  const cityId = await getCurrentCityId();
  if (!cityId) {
    return [];
  }

  const response = await apiRequest<CityShopsPayload>(`/api/cities/${cityId}/shops`, {
    method: 'GET',
    query: {
      limit: 100,
      offset: 0,
    },
  });

  let shops = (response.shops || []).map(mapApiShop);

  const hasExplicitDistanceFilter = typeof filters.maxDistanceKm === 'number';
  const nearbyPrefs = await getNearbyPrefs();
  const effectiveMaxDistanceKm = hasExplicitDistanceFilter
    ? filters.maxDistanceKm
    : nearbyPrefs.enabled
      ? nearbyPrefs.radiusKm
      : undefined;

  if (categoryId) {
    const expected = toCategoryId(categoryId);
    shops = shops.filter((shop) => shop.categoryId === expected);
  }

  if (filters.openNow) {
    shops = shops.filter((shop) => shop.isOpenNow);
  }

  if (filters.verified) {
    shops = shops.filter((shop) => shop.isVerified);
  }

  if (typeof filters.minRating === 'number') {
    const minRating = filters.minRating;
    shops = shops.filter((shop) => shop.rating >= minRating);
  }

  if (typeof filters.maxEta === 'number') {
    const maxEta = filters.maxEta;
    shops = shops.filter((shop) => shop.etaMinutes <= maxEta);
  }

  if (typeof effectiveMaxDistanceKm === 'number') {
    const maxDistanceKm = effectiveMaxDistanceKm;
    shops = shops.filter((shop) => shop.distanceKm <= maxDistanceKm);
  }

  return shops.sort(sortMap[sort]);
};
