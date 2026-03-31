import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { HomeConfigResponse } from '../../types/homeConfig';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { apiRequest } from '../api/httpClient';
import { getCities } from '../cities/cityService';

type GetHomeConfigOptions = {
  forceRefresh?: boolean;
};

type CategoriesPayload = {
  categories?: Array<{
    _id: string;
    name: string;
    image?: string | null;
  }>;
};

type CityShopsPayload = {
  shops?: Array<{
    id: string;
    shopName: string;
    rating?: number;
    imageUrl?: string | null;
    category?: string;
  }>;
};

type PublicCouponsPayload = {
  coupons?: Array<{
    id: string;
    code: string;
    description?: string;
    discountType?: 'PERCENT' | 'FLAT';
    discountValue?: number;
    maxDiscount?: number | null;
    minOrderValue?: number;
    expiryDate?: string;
  }>;
};

type BannersPayload = {
  banners?: Array<{
    id: string;
    imageUrl: string;
    redirectUrl?: string | null;
    title?: string;
    description?: string;
  }>;
};

const parseHomeConfig = (rawValue: string): HomeConfigResponse | null => {
  try {
    const parsed = JSON.parse(rawValue) as HomeConfigResponse;
    if (parsed && typeof parsed.version === 'number' && Array.isArray(parsed.blocks)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const pickCityId = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CITY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { city_id?: string; name?: string };
      if (parsed?.city_id) {
        return parsed.city_id;
      }
    } catch {
      // Ignore parse errors and fallback to API city list.
    }
  }

  const cities = await getCities();
  return cities[0]?._id || null;
};

export const getHomeConfig = async (
  options: GetHomeConfigOptions = {},
): Promise<HomeConfigResponse> => {
  const { forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.HOME_CONFIG_CACHE);
    if (cached) {
      try {
        const parsed = parseHomeConfig(cached);
        if (parsed && parsed.blocks && parsed.blocks.length > 0) {
          // Verify cached data has banners, otherwise force refresh
          const hasBannerBlock = parsed.blocks.some((block) => block.type === 'banner_carousel');
          if (hasBannerBlock) {
            console.log('[HomeConfig] Using cached config with banners');
            return parsed;
          }
          console.log('[HomeConfig] Cache missing banner block, forcing refresh');
        }
      } catch (error) {
        console.error('[HomeConfig] Error parsing cache:', error);
      }
    }
  }

  try {
    console.log('[HomeConfig] Fetching city ID...');
    const cityId = await pickCityId();
    console.log('[HomeConfig] City ID:', cityId);

    console.log('[HomeConfig] Fetching categories, shops, coupons, and banners...');
    const [categoriesResp, shopsResp, couponsResp, bannersResp] = await Promise.all([
      apiRequest<CategoriesPayload>('/api/categories', {
        method: 'GET',
        query: { limit: 20, offset: 0 },
      }).catch((err) => {
        console.error('[HomeConfig] Categories API error:', err.message);
        throw err;
      }),
      cityId
        ? apiRequest<CityShopsPayload>(`/api/cities/${cityId}/shops`, {
            method: 'GET',
            query: { limit: 100, offset: 0 },
          }).catch((err) => {
            console.error('[HomeConfig] Shops API error:', err.message);
            throw err;
          })
        : Promise.resolve({ shops: [] }),
      apiRequest<PublicCouponsPayload>('/api/coupons/public', {
        method: 'GET',
        query: {
          limit: 20,
          offset: 0,
          cityId: cityId || undefined,
        },
      }).catch((err) => {
        console.warn('[HomeConfig] Coupons API warning (non-blocking):', err.message);
        return { coupons: [] };
      }),
      apiRequest<BannersPayload>('/api/banners', {
        method: 'GET',
      }).catch((err) => {
        console.warn('[HomeConfig] Banners API warning (non-blocking):', err.message);
        return { banners: [] };
      }),
    ]);
    console.log('[HomeConfig] API requests completed successfully');

  const categories = categoriesResp.categories || [];
  const shops = shopsResp.shops || [];
  const coupons = couponsResp.coupons || [];
  const banners = bannersResp.banners || [];

  console.log('[HomeConfig] bannersResp full object:', JSON.stringify(bannersResp, null, 2));
  console.log('[HomeConfig] bannersResp.banners:', JSON.stringify(bannersResp.banners, null, 2));
  console.log('[HomeConfig] Banners from API:', JSON.stringify(banners, null, 2));
  console.log('[HomeConfig] Banners count:', banners.length);

  const normalize = (value: string) => String(value || '').trim().toLowerCase();
  const toCategoryId = (value: string) =>
    normalize(value)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const categoryShopBlocks = categories
    .map((category) => {
      const categoryName = String(category.name || '').trim();
      const categoryId = toCategoryId(categoryName);
      const matchedShops = shops
        .filter((shop) => normalize(shop.category || '') === normalize(categoryName))
        .slice(0, 10)
        .map((shop) => ({
          id: String(shop.id),
          name: String(shop.shopName),
          rating: Number(shop.rating || 0),
          eta: '20 mins',
          imageUrl: resolveMediaUrl(shop.imageUrl) || `https://picsum.photos/seed/shop-${shop.id}/420/240`,
          timing: 'Open daily',
        }));

      if (matchedShops.length === 0) {
        return null;
      }

      return {
        id: `block-category-shops-${categoryId}`,
        type: 'featured_shops' as const,
        title: categoryName,
        categoryId,
        data: matchedShops,
      };
    })
    .filter((block): block is NonNullable<typeof block> => Boolean(block));

  console.log('[HomeConfig] Building home config with', banners.length, 'banners');
  
  const hasBannersToShow = banners && Array.isArray(banners) && banners.length > 0;
  console.log('[HomeConfig] hasBannersToShow:', hasBannersToShow);

  const homeConfig: HomeConfigResponse = {
    version: Date.now(),
    updated_at: new Date().toISOString(),
    blocks: [
      hasBannersToShow
        ? {
            id: 'block-banner-carousel',
            type: 'banner_carousel' as const,
            data: banners.map((banner) => ({
              id: String(banner.id),
              imageUrl: resolveMediaUrl(banner.imageUrl) || banner.imageUrl,
              redirectUrl: banner.redirectUrl,
              title: banner.title,
              description: banner.description,
            })),
          }
        : {
            id: 'block-banner-1',
            type: 'banner_carousel' as const,
            data: [
              { id: 'banner-1', imageUrl: 'https://picsum.photos/id/401/1200/420' },
              { id: 'banner-2', imageUrl: 'https://picsum.photos/id/402/1200/420' },
              { id: 'banner-3', imageUrl: 'https://picsum.photos/id/403/1200/420' },
            ],
          },
      {
        id: 'block-space-1',
        type: 'spacer' as const,
        data: { height: 10 },
      },
      ...categoryShopBlocks,
      {
        id: 'block-coupon-highlights',
        type: 'coupon_highlights',
        title: 'Coupons For You',
        data: coupons.slice(0, 8).map((coupon) => {
          const discountText =
            coupon.discountType === 'PERCENT'
              ? `${Number(coupon.discountValue || 0)}% OFF`
              : `Rs ${Number(coupon.discountValue || 0)} OFF`;

          const baseDesc = String(coupon.description || '').trim();
          const minOrder = Number(coupon.minOrderValue || 0);
          const composedDescription = [
            baseDesc || discountText,
            minOrder > 0 ? `Min order Rs ${minOrder}` : null,
          ]
            .filter(Boolean)
            .join(' | ');

          return {
            id: String(coupon.id),
            code: String(coupon.code),
            description: composedDescription,
          };
        }),
      },
      {
        id: 'block-space-2',
        type: 'spacer',
        data: { height: 8 },
      },
    ],
  };

  await AsyncStorage.setItem(STORAGE_KEYS.HOME_CONFIG_CACHE, JSON.stringify(homeConfig));
  console.log('[HomeConfig] Home config generated and cached successfully');
  return homeConfig;
  } catch (error) {
    console.error('[HomeConfig] Error fetching home config:', error instanceof Error ? error.message : String(error));
    throw error;
  }
};

export const clearHomeConfigCache = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HOME_CONFIG_CACHE);
    console.log('[HomeConfig] Cache cleared successfully');
  } catch (error) {
    console.error('[HomeConfig] Error clearing cache:', error);
  }
};
