const { isOpenNow } = require('./discovery');

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getRealTimeStock = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];

  if (variants.length === 0) {
    return {
      inStock: Boolean(product.inStock),
      stockQty: Math.max(0, toSafeNumber(product.stockQty, 0)),
      basePrice: toSafeNumber(product.basePrice, 0),
      baseMrp: toSafeNumber(product.baseMrp, 0),
    };
  }

  const stockQty = variants.reduce((sum, variant) => {
    const availableQty = Math.max(0, toSafeNumber(variant.stockQty, 0) - toSafeNumber(variant.lockedQty, 0));
    return sum + availableQty;
  }, 0);

  const inStock = variants.some((variant) => {
    const availableQty = Math.max(0, toSafeNumber(variant.stockQty, 0) - toSafeNumber(variant.lockedQty, 0));
    return Boolean(variant.inStock) && availableQty > 0;
  });

  const prices = variants.map((variant) => toSafeNumber(variant.price, 0));
  const mrps = variants.map((variant) => toSafeNumber(variant.mrp, 0));

  return {
    inStock,
    stockQty,
    basePrice: Math.min(...prices),
    baseMrp: Math.min(...mrps),
  };
};

const getDiscountInfo = (product, stockInfo) => {
  const discount = product.discount || {};
  const now = Date.now();
  const validTill = discount.validTill ? new Date(discount.validTill).getTime() : null;

  const isValid =
    discount.type &&
    Number(discount.value) > 0 &&
    (validTill === null || Number.isNaN(validTill) || validTill >= now);

  if (!isValid) {
    return null;
  }

  let percentage = 0;

  if (discount.type === 'PERCENT') {
    percentage = Math.max(0, Math.min(100, toSafeNumber(discount.value, 0)));
  } else if (discount.type === 'FLAT' && stockInfo.basePrice > 0) {
    percentage = Math.max(0, Math.min(100, (toSafeNumber(discount.value, 0) / stockInfo.basePrice) * 100));
  }

  return {
    type: discount.type,
    value: toSafeNumber(discount.value, 0),
    validTill: discount.validTill || null,
    percentage: Number(percentage.toFixed(2)),
  };
};

const toProductListItem = (product, shop) => {
  const stockInfo = getRealTimeStock(product);

  return {
    id: product._id,
    name: product.name,
    image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
    basePrice: stockInfo.basePrice,
    baseMrp: stockInfo.baseMrp,
    discount: getDiscountInfo(product, stockInfo),
    rating: toSafeNumber(product.rating, 0),
    reviewCount: toSafeNumber(product.reviewCount, 0),
    inStock: stockInfo.inStock,
    shopName: shop?.shopName || null,
  };
};

const toProductDetail = (product, reviews, relatedProducts, shop) => {
  const stockInfo = getRealTimeStock(product);

  return {
    id: product._id,
    name: product.name,
    description: product.description,
    images: product.images || [],
    category: product.categoryName,
    subcategory: product.subcategoryName,
    variants: (product.variants || []).map((variant) => ({
      id: variant.id,
      label: variant.label,
      price: toSafeNumber(variant.price, 0),
      mrp: toSafeNumber(variant.mrp, 0),
      inStock: Boolean(variant.inStock),
      stockQty: Math.max(0, toSafeNumber(variant.stockQty, 0)),
    })),
    discount: getDiscountInfo(product, stockInfo),
    rating: toSafeNumber(product.rating, 0),
    reviewCount: toSafeNumber(product.reviewCount, 0),
    inStock: stockInfo.inStock,
    stockQty: stockInfo.stockQty,
    shop: shop
      ? {
          id: shop._id,
          shopName: shop.shopName,
          area: shop.area,
          isOpen: isOpenNow(shop.businessHours),
        }
      : null,
    reviews,
    relatedProducts,
  };
};

module.exports = {
  getRealTimeStock,
  getDiscountInfo,
  toProductListItem,
  toProductDetail,
};
