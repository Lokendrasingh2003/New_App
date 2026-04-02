const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const Shop = require('../models/Shop');
const Offer = require('../models/Offer');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const { toProductListItem, toProductDetail } = require('../utils/productView');

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getShopEligibilityFilter = () => ({
  publicVisible: true,
  isActive: true,
  'subscription.isActive': true,
  'verification.status': 'APPROVED',
});

const buildProductSort = (sort, withTextScore = false) => {
  if (sort === 'price') {
    return { basePrice: 1, createdAt: -1 };
  }

  if (sort === 'price_desc') {
    return { basePrice: -1, createdAt: -1 };
  }

  if (sort === 'rating') {
    return { rating: -1, reviewCount: -1, createdAt: -1 };
  }

  if (sort === 'new') {
    return { createdAt: -1 };
  }

  if (sort === 'relevance' && withTextScore) {
    return { score: { $meta: 'textScore' } };
  }

  return { createdAt: -1 };
};

const createProductFilter = (query, { category, subcategory, inStock, minPrice, maxPrice, search }) => {
  const filter = {
    ...query,
    active: true,
    isDeleted: false,
  };

  if (category) {
    if (mongoose.isValidObjectId(category)) {
      filter.categoryId = new mongoose.Types.ObjectId(category);
    } else {
      filter.categoryName = { $regex: `^${category}$`, $options: 'i' };
    }
  }

  if (subcategory) {
    filter.subcategoryName = { $regex: `^${subcategory}$`, $options: 'i' };
  }

  if (inStock !== undefined) {
    filter.inStock = inStock;
  }

  if (minPrice !== null || maxPrice !== null) {
    filter.basePrice = {};
    if (minPrice !== null) {
      filter.basePrice.$gte = minPrice;
    }
    if (maxPrice !== null) {
      filter.basePrice.$lte = maxPrice;
    }
  }

  if (search) {
    filter.$text = { $search: search };
  }

  return filter;
};

const getActiveOffersForShop = async (shopId) => {
  const now = new Date();
  console.log(`[getActiveOffersForShop] Fetching offers for shop: ${shopId}, now: ${now}`);
  
  const offers = await Offer.find({
    shopId: shopId,
    enabled: true,
    'validity.startsAt': { $lte: now },
    'validity.endsAt': { $gte: now },
  }).lean();

  console.log(`[getActiveOffersForShop] Found ${offers.length} active offers for shop ${shopId}`);
  if (offers.length > 0) {
    console.log('[getActiveOffersForShop] First offer:', JSON.stringify(offers[0], null, 2));
  }

  return offers;
};

const applyOffersToProducts = (products, offers) => {
  if (!Array.isArray(products) || !Array.isArray(offers)) {
    return products;
  }

  // Build a map of productId -> offers
  const productOfferMap = new Map();
  
  offers.forEach((offer) => {
    if (offer.scope === 'PRODUCTS' && Array.isArray(offer.productIds)) {
      offer.productIds.forEach((productId) => {
        const key = String(productId);
        if (!productOfferMap.has(key)) {
          productOfferMap.set(key, []);
        }
        productOfferMap.get(key).push(offer);
      });
    }
  });

  // Apply offers to products (use highest discount)
  return products.map((product) => {
    const productKey = String(product._id);
    const applicableOffers = productOfferMap.get(productKey) || [];
    
    if (applicableOffers.length === 0) {
      return product;
    }

    // Find the best (highest discount) offer
    const bestOffer = applicableOffers.reduce((best, current) => {
      const bestDiscount = best.type === 'PERCENT' ? best.value : 0;
      const currentDiscount = current.type === 'PERCENT' ? current.value : 0;
      return currentDiscount > bestDiscount ? current : best;
    });

    return {
      ...product,
      discount: {
        type: bestOffer.type,
        value: bestOffer.value,
        validTill: bestOffer.validity?.endsAt || null,
      },
    };
  });
};

const getShopProducts = async (req, res) => {
  const { shopId } = req.params;

  if (!mongoose.isValidObjectId(shopId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const shop = await Shop.findOne({ _id: shopId, ...getShopEligibilityFilter() }).lean();

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const category = (req.query.category || '').toString().trim();
  const subcategory = (req.query.subcategory || '').toString().trim();
  const search = (req.query.search || '').toString().trim();
  const sort = (req.query.sort || 'new').toString();
  const inStock = req.query.inStock !== undefined ? String(req.query.inStock).toLowerCase() === 'true' : undefined;
  const minPrice = req.query.minPrice !== undefined ? toNumber(req.query.minPrice, null) : null;
  const maxPrice = req.query.maxPrice !== undefined ? toNumber(req.query.maxPrice, null) : null;

  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const filter = createProductFilter(
    { shopId: shop._id },
    {
      category,
      subcategory,
      inStock,
      minPrice,
      maxPrice,
      search: search || null,
    }
  );

  const projection = search ? { score: { $meta: 'textScore' } } : undefined;

  const [products, total] = await Promise.all([
    Product.find(filter, projection)
      .sort(buildProductSort(search ? 'relevance' : sort, Boolean(search)))
      .skip(offset)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  // Fetch active offers and apply to products
  const offers = await getActiveOffersForShop(shop._id);
  console.log(`[getShopProducts] Shop: ${shop._id}, Offers found: ${offers.length}`);
  if (offers.length > 0) {
    console.log('[getShopProducts] Offers:', JSON.stringify(offers, null, 2));
  }
  
  const productsWithOffers = applyOffersToProducts(products, offers);
  console.log(`[getShopProducts] After applying offers, first product:`, JSON.stringify(productsWithOffers[0], null, 2));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Products fetched successfully.',
    data: {
      products: productsWithOffers.map((product) => toProductListItem(product, shop)),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getProductById = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const product = await Product.findOne({ _id: productId, active: true, isDeleted: false }).lean();

  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const shop = await Shop.findOne({ _id: product.shopId, ...getShopEligibilityFilter() }).lean();

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const [reviews, relatedProducts] = await Promise.all([
    ProductReview.find({ productId: product._id, isPublished: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Product.find({
      shopId: product.shopId,
      _id: { $ne: product._id },
      active: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const related = relatedProducts.map((item) => toProductListItem(item, shop));

  // Fetch active offers and apply to product and related products
  const offers = await getActiveOffersForShop(shop._id);
  const productWithOffer = applyOffersToProducts([product], offers)[0];
  const relatedWithOffers = applyOffersToProducts(relatedProducts, offers);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product details fetched successfully.',
    data: {
      product: toProductDetail(
        productWithOffer,
        reviews.map((review) => ({
          id: review._id,
          userName: review.userName,
          rating: review.rating,
          title: review.title,
          comment: review.reviewText,
          verified: Boolean(review.verified),
          helpful: {
            upCount: Number(review.helpful?.upCount || 0),
            downCount: Number(review.helpful?.downCount || 0),
          },
          images: review.images || [],
          date: review.createdAt,
        })),
        relatedWithOffers.map((item) => toProductListItem(item, shop)),
        shop
      ),
    },
  });
};

const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const productExists = await Product.exists({ _id: productId, active: true, isDeleted: false });

  if (!productExists) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const [reviews, total] = await Promise.all([
    ProductReview.find({ productId, isPublished: true })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    ProductReview.countDocuments({ productId, isPublished: true }),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product reviews fetched successfully.',
    data: {
      reviews: reviews.map((review) => ({
        id: review._id,
        user: {
          id: review.userId,
          name: review.userName,
        },
        rating: review.rating,
        text: review.reviewText,
        date: review.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const searchProducts = async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  const cityId = (req.query.cityId || '').toString().trim();
  const shopId = (req.query.shopId || '').toString().trim();

  if (!q) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Search query q is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (!mongoose.isValidObjectId(cityId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Valid cityId is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (shopId && !mongoose.isValidObjectId(shopId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid shopId.', ERROR_CODES.VALIDATION_ERROR);
  }

  const sort = (req.query.sort || 'relevance').toString();
  const category = (req.query.category || '').toString().trim();
  const subcategory = (req.query.subcategory || '').toString().trim();
  const inStock = req.query.inStock !== undefined ? String(req.query.inStock).toLowerCase() === 'true' : undefined;
  const minPrice = req.query.minPrice !== undefined ? toNumber(req.query.minPrice, null) : null;
  const maxPrice = req.query.maxPrice !== undefined ? toNumber(req.query.maxPrice, null) : null;

  const limit = Math.min(toInteger(req.query.limit, 20), 100);
  const offset = toInteger(req.query.offset, 0);

  const shopFilter = {
    cityId,
    ...getShopEligibilityFilter(),
  };

  if (shopId) {
    shopFilter._id = shopId;
  }

  const shops = await Shop.find(shopFilter).lean();
  const shopMap = new Map(shops.map((shop) => [String(shop._id), shop]));

  const eligibleShopIds = shops.map((shop) => shop._id);

  if (eligibleShopIds.length === 0) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Products search completed.',
      data: {
        products: [],
        pagination: {
          total: 0,
          limit,
          offset,
        },
      },
    });
  }

  const filter = createProductFilter(
    {
      shopId: { $in: eligibleShopIds },
    },
    {
      category,
      subcategory,
      inStock,
      minPrice,
      maxPrice,
      search: q,
    }
  );

  const projection = { score: { $meta: 'textScore' } };

  const [products, total] = await Promise.all([
    Product.find(filter, projection)
      .sort(buildProductSort(sort, true))
      .skip(offset)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  // Fetch offers for each shop and apply them
  const offersByShop = new Map();
  await Promise.all(
    Array.from(shopMap.entries()).map(async ([shopIdStr, shop]) => {
      const offers = await getActiveOffersForShop(shop._id);
      offersByShop.set(shopIdStr, offers);
    })
  );

  // Group products by shop and apply offers
  const productsByShop = new Map();
  products.forEach((product) => {
    const shopIdStr = String(product.shopId);
    if (!productsByShop.has(shopIdStr)) {
      productsByShop.set(shopIdStr, []);
    }
    productsByShop.get(shopIdStr).push(product);
  });

  const productsWithOffers = [];
  productsByShop.forEach((shopProducts, shopIdStr) => {
    const offers = offersByShop.get(shopIdStr) || [];
    const productsWithShopOffers = applyOffersToProducts(shopProducts, offers);
    productsWithOffers.push(...productsWithShopOffers);
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Products search completed.',
    data: {
      products: productsWithOffers.map((product) => toProductListItem(product, shopMap.get(String(product.shopId)))),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

module.exports = {
  getShopProducts,
  getProductById,
  getProductReviews,
  searchProducts,
};
