export type Product = {
  id: string;
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
  subcategoryId: string;
};

const NAME_TOKENS = [
  'Fresh',
  'Premium',
  'Classic',
  'Daily',
  'Organic',
  'Smart',
  'Quick',
  'Pure',
  'Select',
  'Value',
  'Gold',
  'Lite',
];

const PRODUCT_NOUNS = [
  'Sunflower Oil',
  'Wheat Flour',
  'Atta',
  'Rice',
  'Sugar',
  'Besan',
  'Toor Dal',
  'Tea',
  'Cookies',
  'Detergent',
  'Poha',
  'Dry Fruits',
];

const FLUID_VARIANTS = ['500 ml', '1 L', '2 L'];
const DRY_VARIANTS = ['200 g', '500 g', '1 kg'];
const BULK_VARIANTS = ['500 g', '1 kg', '2 kg'];

const getVariantLabels = (productName: string): string[] => {
  const normalized = productName.toLowerCase();

  if (normalized.includes('oil')) {
    return FLUID_VARIANTS;
  }

  if (normalized.includes('flour') || normalized.includes('atta') || normalized.includes('rice')) {
    return BULK_VARIANTS;
  }

  return DRY_VARIANTS;
};

const getVariants = (productId: string, productName: string, basePrice: number, seed: number) => {
  const labels = getVariantLabels(productName);
  const multipliers = [0.48, 1, 1.86];

  return labels.map((label, index) => {
    const price = Math.max(18, Math.round(basePrice * multipliers[index]));
    const discountPercent = 7 + ((seed + index * 9) % 26);
    const mrp = Math.round((price * 100) / (100 - discountPercent));

    return {
      id: `${productId}-variant-${index + 1}`,
      label,
      price,
      mrp,
      discountLabel: `${discountPercent}% OFF`,
      inStock: (seed + index * 2) % 6 !== 0,
    };
  });
};

const hashCode = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const titleCase = (value: string) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export function getMockProducts({ shopId, subcategoryId }: GetMockProductsParams): Product[] {
  const seed = hashCode(`${shopId}-${subcategoryId}`);
  const readableSubcategory = titleCase(subcategoryId);

  return Array.from({ length: 12 }).map((_, index) => {
    const tokenIndex = (seed + index * 3) % NAME_TOKENS.length;
    const nounIndex = (seed + index * 5) % PRODUCT_NOUNS.length;

    const basePrice = 45 + ((seed + index * 17) % 280);
    const name = `${NAME_TOKENS[tokenIndex]} ${readableSubcategory} ${PRODUCT_NOUNS[nounIndex]}`;
    const id = `${shopId}-${subcategoryId}-prod-${index + 1}`;
    const variants = getVariants(id, name, basePrice, seed + index);
    const defaultVariant = variants[1] ?? variants[0];

    return {
      id,
      shopId,
      subcategoryId,
      name,
      description: `Best choice in ${readableSubcategory.toLowerCase()} from your nearby shop.`,
      imageUrl: `https://picsum.photos/seed/${shopId}-${subcategoryId}-${index + 1}/280/280`,
      price: defaultVariant.price,
      mrp: defaultVariant.mrp,
      inStock: variants.some((variant) => variant.inStock),
      variants,
    };
  });
}
