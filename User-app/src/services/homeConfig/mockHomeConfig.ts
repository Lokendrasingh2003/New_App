import { HomeConfigResponse } from '../../types/homeConfig';
import { DEMO_CATEGORIES } from '../../constants/demoShops';

const FALLBACK_ETA = '15 mins';

const getEtaFromInfo = (info: string): string => {
  const match = info.match(/(\d+\s*mins)/i);
  if (!match) {
    return FALLBACK_ETA;
  }

  return match[1].replace(/\s+/g, ' ');
};

const featuredShopBlocks = DEMO_CATEGORIES.map((category) => ({
  id: `block-featured-shops-${category.id}`,
  type: 'featured_shops' as const,
  title: category.name,
  categoryId: category.id,
  data: category.shops.map((shop, index) => ({
    id: shop.id,
    name: shop.name,
    rating: Number((4.1 + (index % 3) * 0.2).toFixed(1)),
    eta: getEtaFromInfo(shop.info),
    imageUrl: shop.image,
    timing: shop.timing,
  })),
}));

const couponHighlights = DEMO_CATEGORIES.slice(0, 3).map((category, index) => ({
  id: `coupon-${index + 1}`,
  code: `${category.id.toUpperCase()}${(index + 1) * 10}`,
  description: `Save up to ${(index + 1) * 10}% on ${category.name.toLowerCase()} from ${category.shops.length}+ shops`,
}));

export const mockHomeConfig: HomeConfigResponse = {
  version: 2,
  updated_at: '2026-03-01T10:00:00.000Z',
  blocks: [
    {
      id: 'block-banner-1',
      type: 'banner_carousel',
      data: [
        { id: 'banner-1', imageUrl: 'https://picsum.photos/id/401/1200/420' },
        { id: 'banner-2', imageUrl: 'https://picsum.photos/id/402/1200/420' },
        { id: 'banner-3', imageUrl: 'https://picsum.photos/id/403/1200/420' },
      ],
    },
    {
      id: 'block-space-1',
      type: 'spacer',
      data: { height: 10 },
    },
    ...featuredShopBlocks,
    {
      id: 'block-coupons-1',
      type: 'coupon_highlights',
      title: 'Coupon Highlights',
      data: couponHighlights,
    },
    {
      id: 'block-space-2',
      type: 'spacer',
      data: { height: 8 },
    },
  ],
};
