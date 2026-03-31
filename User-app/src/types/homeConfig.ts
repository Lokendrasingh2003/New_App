export type BannerCarouselItem = {
  id: string;
  imageUrl: string;
};

export type CategoryGridItem = {
  id: string;
  name: string;
  imageUrl: string;
};

export type FeaturedShopItem = {
  id: string;
  name: string;
  rating: number;
  eta: string;
  imageUrl: string;
  info?: string;
  timing?: string;
};

export type RecommendedProductItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  mrp?: number;
  imageUrl: string;
  shopId?: string;
};

export type CouponHighlightItem = {
  id: string;
  code: string;
  description: string;
};

type HomeBlockBase<TType extends string, TData> = {
  id: string;
  type: TType;
  title?: string;
  data: TData;
};

export type BannerCarouselBlock = HomeBlockBase<'banner_carousel', BannerCarouselItem[]>;

export type CategoryGridBlock = HomeBlockBase<'category_grid', CategoryGridItem[]>;

export type FeaturedShopsBlock = HomeBlockBase<'featured_shops', FeaturedShopItem[]> & {
  categoryId?: string;
};

export type RecommendedProductsBlock = HomeBlockBase<
  'recommended_products',
  RecommendedProductItem[]
>;

export type CouponHighlightsBlock = HomeBlockBase<'coupon_highlights', CouponHighlightItem[]>;

export type SpacerBlock = HomeBlockBase<'spacer', { height: number }>;

export type HomeBlock =
  | BannerCarouselBlock
  | CategoryGridBlock
  | FeaturedShopsBlock
  | RecommendedProductsBlock
  | CouponHighlightsBlock
  | SpacerBlock;

export type HomeConfigResponse = {
  version: number;
  updated_at: string;
  blocks: HomeBlock[];
};
