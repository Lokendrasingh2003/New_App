import { apiRequest } from '../api/httpClient';
import { Product } from './mockProducts';
import { resolveMediaUrl } from '../../utils/mediaUrl';

type DiscountInfo = {
  type: 'PERCENT' | 'FLAT';
  value: number;
  percentage: number;
  validTill: string | null;
};

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
    discount?: DiscountInfo | null;
  };
};

const toSubcategoryId = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'uncategorized';

const toDiscountLabel = (price: number, mrp: number, productDiscount?: DiscountInfo | null) => {
  // If product has an active offer/discount, show that instead
  if (productDiscount && productDiscount.percentage && productDiscount.percentage > 0) {
    return `${Math.round(productDiscount.percentage)}% OFF`;
  }

  if (!mrp || mrp <= price) {
    return '0% OFF';
  }

  return `${Math.max(0, Math.round(((mrp - price) * 100) / mrp))}% OFF`;
};

const calculateOfferPrice = (price: number, discount?: DiscountInfo | null): number => {
  if (!discount) {
    return price;
  }

  // Ensure percentage is a valid number
  const percentage = Number(discount.percentage) || 0;
  if (percentage <= 0) {
    return price;
  }

  if (discount.type === 'PERCENT') {
    const discountAmount = Math.round((price * percentage) / 100);
    return Math.max(0, price - discountAmount);
  } else if (discount.type === 'FLAT') {
    const flatAmount = Number(discount.value) || 0;
    return Math.max(0, price - flatAmount);
  }

  return price;
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
    price: calculateOfferPrice(Number(variant.price || 0), detail.discount),
    mrp: Number(variant.mrp || variant.price || 0),
    discountLabel: toDiscountLabel(Number(variant.price || 0), Number(variant.mrp || variant.price || 0), detail.discount),
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
