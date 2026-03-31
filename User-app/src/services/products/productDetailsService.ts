import { apiRequest } from '../api/httpClient';
import { Product } from './mockProducts';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type ProductDetailPayload = {
  product?: {
    id: string;
    name: string;
    description?: string;
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

  return `${Math.max(0, Math.round(((mrp - price) * 100) / mrp))}% OFF`;
};

export async function getProductById(shopId: string, productId: string): Promise<Product | null> {
  const data = await apiRequest<ProductDetailPayload>(`/api/products/${productId}`, {
    method: 'GET',
  });

  const detail = data.product;
  if (!detail) {
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

  const first = variants[0];

  return {
    id: String(detail.id),
    productId: String(detail.id),
    shopId,
    subcategoryId: toSubcategoryId(detail.subcategory || 'uncategorized'),
    name: String(detail.name),
    description: detail.description,
    imageUrl: resolveMediaUrl(detail.images?.[0]),
    price: Number(first?.price || 0),
    mrp: Number(first?.mrp || first?.price || 0),
    inStock: Boolean(first?.inStock),
    variants,
  };
}
