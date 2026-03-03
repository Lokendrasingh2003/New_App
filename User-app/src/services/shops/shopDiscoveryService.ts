import { DiscoveryShop, mockShops } from './mockShops';
import { getNearbyPrefs } from '../location/nearbyService';

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
  let shops = [...mockShops];
  const hasExplicitDistanceFilter = typeof filters.maxDistanceKm === 'number';
  const nearbyPrefs = await getNearbyPrefs();
  const effectiveMaxDistanceKm = hasExplicitDistanceFilter
    ? filters.maxDistanceKm
    : nearbyPrefs.enabled
      ? nearbyPrefs.radiusKm
      : undefined;

  if (categoryId) {
    shops = shops.filter((shop) => shop.categoryId === categoryId);
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
