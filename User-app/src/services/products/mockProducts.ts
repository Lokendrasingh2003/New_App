import { apiRequest } from '../api/httpClient';
import { resolveMediaUrl } from '../../utils/mediaUrl';

export type Product = {
  id: string;
  productId?: string;
  shopId: string;
  subcategoryId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  price: number;
  mrp?: number;
  inStock: boolean;
  variants: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  label: string;
  price: number;
  mrp: number;
  discountLabel: string;
  inStock: boolean;
};

type GetMockProductsParams = {
  shopId: string;
  subcategoryId?: string;
};

type ShopProductsPayload = {
  products?: Array<{
    id: string;
    name: string;
    image?: string | null;
    basePrice?: number;
    baseMrp?: number;
    inStock?: boolean;
  }>;
};

type ProductDetailPayload = {
  product?: {
    id: string;
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    images?: string[];
    variants?: Array<{
      id: string;
      label: string;
      price: number;
      mrp: number;
      inStock: boolean;
    }>;
  };
};

const toSubcategoryId = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';

const toDiscountLabel = (price: number, mrp: number) => {
  if (!mrp || mrp <= price) {
    return '0% OFF';
  }

  const value = Math.round(((mrp - price) * 100) / mrp);
  return `${Math.max(0, value)}% OFF`;
};

export const getShopProducts = async ({ shopId, subcategoryId }: GetMockProductsParams): Promise<Product[]> => {
  const data = await apiRequest<ShopProductsPayload>(`/api/products/shops/${shopId}`, {
    method: 'GET',
    query: {
      limit: 100,
      offset: 0,
    },
  });

  const candidates = data.products || [];

  const filtered = candidates.filter((item) => {
    if (!subcategoryId) {
      return true;
    }

    // We resolve exact subcategory from product detail below.
    return Boolean(item.id);
  });

  const details = await Promise.all(
    filtered.map(async (item) => {
      try {
        const detailResp = await apiRequest<ProductDetailPayload>(`/api/products/${item.id}`, {
          method: 'GET',
        });

        const detail = detailResp.product;
        if (!detail) {
          return null;
        }

        // Determine the product's subcategoryId from detail (most accurate)
        // or fall back to list-level subcategory (now returned by backend)
        const rawSubcategory = detail.subcategory || (item as { subcategory?: string }).subcategory || '';
        const detailSubcategoryId = rawSubcategory
          ? toSubcategoryId(rawSubcategory)
          : 'all-products';

        const resolvedSubcategoryId = detailSubcategoryId || 'uncategorized';

        // 'all-products' is a catch-all section: include everything in it.
        // For named sections, only include matching subcategory.
        if (subcategoryId && subcategoryId !== 'all-products' && resolvedSubcategoryId !== subcategoryId) {
          return null;
        }

        const variants = (detail.variants || []).map((variant) => ({
          id: String(variant.id),
          label: String(variant.label),
          price: Number(variant.price || 0),
          mrp: Number(variant.mrp || variant.price || 0),
          discountLabel: toDiscountLabel(Number(variant.price || 0), Number(variant.mrp || variant.price || 0)),
          inStock: Boolean(variant.inStock),
        }));

        const firstVariant = variants[0];

        return {
          id: String(detail.id),
          productId: String(detail.id),
          shopId,
          subcategoryId: resolvedSubcategoryId,
          name: String(detail.name),
          description: detail.description,
          imageUrl: resolveMediaUrl(detail.images?.[0] || item.image),
          price: Number(firstVariant?.price || item.basePrice || 0),
          mrp: Number(firstVariant?.mrp || item.baseMrp || item.basePrice || 0),
          inStock: Boolean(firstVariant?.inStock ?? item.inStock),
          variants,
        } as Product;
      } catch {
        return null;
      }
    }),
  );

  return details.filter((item): item is Product => Boolean(item));
};

export const getMockProducts = getShopProducts;
