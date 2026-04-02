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
    discount?: DiscountInfo | null;
    subcategory?: string;
  }>;
};

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

  // Otherwise calculate from price and MRP
  if (!mrp || mrp <= price) {
    return '0% OFF';
  }

  const value = Math.round(((mrp - price) * 100) / mrp);
  return `${Math.max(0, value)}% OFF`;
};

const calculateOfferPrice = (price: number, discount?: DiscountInfo | null): number => {
  if (!discount) {
    return price;
  }

  try {
    // Ensure percentage is a valid positive number
    const percentage = Number(discount.percentage);
    if (!Number.isFinite(percentage) || percentage <= 0) {
      return price;
    }

    if (discount.type === 'PERCENT') {
      const discountAmount = Math.round((price * percentage) / 100);
      const result = Math.max(0, price - discountAmount);
      return result;
    } else if (discount.type === 'FLAT') {
      const flatAmount = Number(discount.value) || 0;
      const result = Math.max(0, price - flatAmount);
      return result;
    }
  } catch (error) {
    console.error('Error in calculateOfferPrice:', error, { price, discount });
  }

  return price;
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
  
  console.log(`[getShopProducts] Fetched ${candidates.length} products from shop`);
  console.log(`[getShopProducts] Sample product:`, candidates[0]);

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

        // Extract discount info - check both responses
        const listDiscount = (item as any)?.discount;
        const detailDiscount = (detail as any)?.discount;
        
        // Log raw discount data for debugging
        if (listDiscount) {
          console.log(`[ListDiscount Raw] ${detail.id}:`, listDiscount);
        }
        if (detailDiscount) {
          console.log(`[DetailDiscount Raw] ${detail.id}:`, detailDiscount);
        }

        // Safely handle discount object
        const productDiscount: DiscountInfo | null = (() => {
          const discount = detailDiscount || listDiscount;
          if (!discount) return null;
          
          // Handle different possible discount structures
          return {
            type: (discount as any)?.type || 'PERCENT',
            value: Number((discount as any)?.value || 0),
            percentage: Number((discount as any)?.percentage || 0),
            validTill: (discount as any)?.validTill || null,
          };
        })();

        // Determine the product's subcategoryId from detail (most accurate)
        const rawSubcategory = detail.subcategory || (item as { subcategory?: string }).subcategory || '';
        const detailSubcategoryId = rawSubcategory
          ? toSubcategoryId(rawSubcategory)
          : 'all-products';

        const resolvedSubcategoryId = detailSubcategoryId || 'uncategorized';

        if (subcategoryId && subcategoryId !== 'all-products' && resolvedSubcategoryId !== subcategoryId) {
          return null;
        }

        // Use the basePrice and baseMrp from list for pricing
        const basePrice = Number(item.basePrice || 0);
        const baseMrp = Number(item.baseMrp || basePrice || 0);
        
        // Apply discount to basePrice from list response
        const discountedBasePrice = calculateOfferPrice(basePrice, productDiscount);
        
        console.log(`[PriceCalc] ${detail.name}: basePrice=${basePrice}, baseMrp=${baseMrp}, discount=${productDiscount?.percentage}%, result=${discountedBasePrice}`);

        const variants = (detail.variants || []).map((variant) => {
          // For individual variants, also apply the discount
          const vPrice = Number(variant.price || 0);
          const vMrp = Number(variant.mrp || vPrice);
          const discountedVPrice = productDiscount ? calculateOfferPrice(vPrice, productDiscount) : vPrice;

          return {
            id: String(variant.id),
            label: String(variant.label),
            price: discountedVPrice,
            mrp: vMrp,
            discountLabel: toDiscountLabel(vPrice, vMrp, productDiscount),
            inStock: Boolean(variant.inStock),
          };
        });

        const firstVariant = variants[0];

        const finalProduct = {
          id: String(detail.id),
          productId: String(detail.id),
          shopId,
          subcategoryId: resolvedSubcategoryId,
          name: String(detail.name),
          description: detail.description,
          imageUrl: resolveMediaUrl(detail.images?.[0] || item.image),
          price: discountedBasePrice,
          mrp: baseMrp,
          inStock: Boolean(firstVariant?.inStock ?? item.inStock),
          variants,
        } as Product;

        if (productDiscount && productDiscount.percentage > 0) {
          console.log(`✓ [DISCOUNT APPLIED] ${detail.name}: ${basePrice} -> ${discountedBasePrice} (${productDiscount.percentage}%)`);
        }

        return finalProduct;
      } catch (error) {
        console.error(`Error fetching product ${item.id}:`, error);
        return null;
      }
    }),
  );

  return details.filter((item): item is Product => Boolean(item));
};

export const getMockProducts = getShopProducts;
