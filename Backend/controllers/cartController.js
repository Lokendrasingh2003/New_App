const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { recalculateCartTotals } = require('../utils/cartCalc');
const { getBestApplicableOffer } = require('../services/offerService');
const {
  HTTP_STATUS,
  ERROR_CODES,
  CART_MAX_ITEMS,
  CART_EXPIRY_DAYS,
  FREE_DELIVERY_MIN_ORDER,
} = require('../config/constants');

const isCouponLive = (coupon) => {
  if (!coupon || !coupon.isActive) {
    return false;
  }

  const now = Date.now();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validTo = new Date(coupon.validTill).getTime();

  return validFrom <= now && validTo >= now;
};

const cartExpiryDate = () => new Date(Date.now() + CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const formatCartResponse = (cart) => {
  if (!cart) {
    return {
      id: null,
      shopId: null,
      items: [],
      subtotal: 0,
      discount: 0,
      deliveryCharge: 0,
      tax: 0,
      total: 0,
      appliedOffer: null,
      appliedCoupon: null,
      expiresAt: null,
      updatedAt: null,
    };
  }

  return {
    id: cart._id,
    shopId: cart.shopId,
    items: cart.items,
    subtotal: cart.subtotal,
    discount: cart.discount,
    deliveryCharge: cart.deliveryCharge,
    tax: cart.tax,
    total: cart.total,
    appliedOffer: cart.appliedOffer?.offerId ? cart.appliedOffer : null,
    appliedCoupon: cart.appliedCoupon?.code ? cart.appliedCoupon : null,
    expiresAt: cart.expiresAt,
    updatedAt: cart.updatedAt,
  };
};

const getValidCart = async (userId) => {
  const cart = await Cart.findOne({ userId }).sort({ updatedAt: -1 });

  if (!cart) {
    return null;
  }

  if (cart.expiresAt && new Date(cart.expiresAt).getTime() < Date.now()) {
    await Cart.deleteOne({ _id: cart._id });
    return null;
  }

  return cart;
};

const ensureActiveShop = async (shopId) => {
  if (!mongoose.isValidObjectId(shopId)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid shopId.', ERROR_CODES.VALIDATION_ERROR);
  }

  const shop = await Shop.findOne({ _id: shopId, isActive: true, publicVisible: true });

  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  return shop;
};

const getProductVariant = (product, variantId) => {
  const variant = (product.variants || []).find((item) => String(item.id) === String(variantId));

  if (!variant) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Variant not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return variant;
};

const ensureQuantityInStock = (variant, quantity) => {
  const availableQty = Math.max(0, Number(variant.stockQty || 0) - Number(variant.lockedQty || 0));

  if (!variant.inStock || availableQty < quantity) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Quantity exceeds stock quantity.',
      ERROR_CODES.CART_QUANTITY_EXCEEDS_STOCK
    );
  }
};

const getActiveCouponForCart = async (cart) => {
  if (!cart?.appliedCoupon?.code) {
    return null;
  }

  const coupon = await Coupon.findOne({ code: cart.appliedCoupon.code.toUpperCase() });
  if (!isCouponLive(coupon)) {
    return null;
  }

  return coupon;
};

const ensureCouponApplicableForCart = async ({ coupon, cart, userId }) => {
  const subtotal = (cart.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

  if (subtotal < Number(coupon.minOrderValue || 0)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Minimum order value not met for coupon.',
      ERROR_CODES.COUPON_MIN_ORDER_NOT_MET
    );
  }

  if (coupon.applicableCity && String(coupon.applicableCity) !== String(cart.cityId || '')) {
    const shop = await Shop.findById(cart.shopId).select('cityId').lean();
    if (!shop || String(shop.cityId) !== String(coupon.applicableCity)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon is not applicable in this city.', ERROR_CODES.COUPON_INVALID);
    }
  }

  if (Array.isArray(coupon.applicableShops) && coupon.applicableShops.length > 0) {
    const allowedShops = coupon.applicableShops.map((id) => String(id));
    if (!allowedShops.includes(String(cart.shopId))) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon is not applicable for this shop.', ERROR_CODES.COUPON_INVALID);
    }
  }

  if (Array.isArray(coupon.applicableCategories) && coupon.applicableCategories.length > 0) {
    const cartProductIds = (cart.items || []).map((item) => item.productId);
    const products = await Product.find({ _id: { $in: cartProductIds } }, { categoryId: 1 }).lean();
    const cartCategoryIds = [...new Set(products.map((product) => String(product.categoryId)))];
    const allowedCategories = coupon.applicableCategories.map((id) => String(id));

    const hasAtLeastOneApplicable = cartCategoryIds.some((id) => allowedCategories.includes(id));
    if (!hasAtLeastOneApplicable) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon is not applicable for cart categories.', ERROR_CODES.COUPON_INVALID);
    }
  }

  const totalUsed = Number(coupon.usageStats?.totalUsed || 0);
  if (totalUsed >= Number(coupon.maxUsageLimit || 0)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon usage limit reached.', ERROR_CODES.COUPON_INVALID);
  }

  const userUsed = await Order.countDocuments({
    userId,
    'appliedCoupon.code': coupon.code,
    status: { $ne: 'CANCELLED' },
  });
  if (userUsed >= Number(coupon.maxUsagePerUser || 0)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon usage limit reached for user.', ERROR_CODES.COUPON_INVALID);
  }
};

const getCartScope = async (cart) => {
  const items = Array.isArray(cart?.items) ? cart.items : [];
  const productIds = items.map((item) => String(item.productId));

  if (productIds.length === 0) {
    return { productIds: [], categoryIds: [] };
  }

  const products = await Product.find(
    { _id: { $in: productIds } },
    { _id: 1, subcategoryName: 1 }
  ).lean();

  const subcategoryNames = [
    ...new Set(
      products
        .map((product) => String(product.subcategoryName || '').trim())
        .filter((name) => name.length > 0)
    ),
  ];

  return {
    productIds: products.map((product) => String(product._id)),
    categoryIds: subcategoryNames,
  };
};

const refreshAppliedOffer = async (cart) => {
  const subtotal = (cart.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const scope = await getCartScope(cart);

  const offer = await getBestApplicableOffer({
    shopId: cart.shopId,
    cartTotal: subtotal,
    categoryIds: scope.categoryIds,
    productIds: scope.productIds,
    timestamp: new Date(),
  });

  if (!offer) {
    cart.appliedOffer = {
      offerId: null,
      name: null,
      type: null,
      value: 0,
      discountAmount: 0,
    };
    return null;
  }

  cart.appliedOffer = {
    offerId: String(offer._id),
    name: offer.name,
    type: offer.type,
    value: Number(offer.value || 0),
    maxDiscount: offer.conditions?.maxDiscount ?? null,
    discountAmount: Number(offer.estimatedDiscount || 0),
  };

  return offer;
};

const normalizeCartAfterRecalc = async (cart) => {
  const shop = await ensureActiveShop(cart.shopId);
  const coupon = await getActiveCouponForCart(cart);

  if (!coupon && cart.appliedCoupon?.code) {
    cart.appliedCoupon = {
      couponId: null,
      code: null,
      discountAmount: 0,
    };
  }

  await refreshAppliedOffer(cart);

  recalculateCartTotals({ cart, shop, coupon });
  cart.expiresAt = cartExpiryDate();
  await cart.save();

  return cart;
};

const getCart = async (req, res) => {
  const cart = await getValidCart(req.user.id);

  if (!cart) {
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart fetched successfully.',
      data: {
        cart: formatCartResponse(null),
      },
    });
  }

  const updatedCart = await normalizeCartAfterRecalc(cart);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Cart fetched successfully.',
    data: {
      cart: formatCartResponse(updatedCart),
    },
  });
};

const addItem = async (req, res) => {
  const { shopId, productId, variantId, quantity } = req.body;

  const shop = await ensureActiveShop(shopId);

  const product = await Product.findOne({ _id: productId, shopId: shop._id, active: true, isDeleted: false });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const variant = getProductVariant(product, variantId);
  ensureQuantityInStock(variant, quantity);

  let cart = await getValidCart(req.user.id);

  if (!cart) {
    cart = await Cart.create({
      userId: req.user.id,
      shopId: shop._id,
      items: [],
      expiresAt: cartExpiryDate(),
    });
  }

  if (String(cart.shopId) !== String(shop._id)) {
    cart.shopId = shop._id;
    cart.items = [];
    cart.appliedCoupon = { couponId: null, code: null, discountAmount: 0 };
    cart.appliedOffer = { offerId: null, type: null, value: 0 };
  }

  const itemIndex = cart.items.findIndex(
    (item) => String(item.productId) === String(product._id) && String(item.variantId) === String(variantId)
  );

  if (itemIndex >= 0) {
    const nextQty = Number(cart.items[itemIndex].quantity) + Number(quantity);
    ensureQuantityInStock(variant, nextQty);
    cart.items[itemIndex].quantity = nextQty;
  } else {
    cart.items.push({
      productId: product._id,
      productName: product.name,
      variantId,
      variantLabel: variant.label,
      quantity,
      price: Number(variant.price || 0),
      mrp: Number(variant.mrp || 0),
      image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
    });
  }

  const totalUnits = cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (totalUnits > CART_MAX_ITEMS) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Maximum ${CART_MAX_ITEMS} items allowed in cart.`,
      ERROR_CODES.CART_MAX_ITEMS_REACHED
    );
  }

  await refreshAppliedOffer(cart);
  recalculateCartTotals({
    cart,
    shop,
    coupon: await getActiveCouponForCart(cart),
  });

  await cart.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Item added to cart successfully.',
    data: {
      cart: formatCartResponse(cart),
    },
  });
};

const updateItem = async (req, res) => {
  const { productId } = req.params;
  const { quantity, variantId } = req.body;

  const cart = await getValidCart(req.user.id);
  if (!cart) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart not found.', ERROR_CODES.CART_NOT_FOUND);
  }

  const filterByVariant = Boolean(variantId);
  const itemIndex = cart.items.findIndex((item) => {
    if (String(item.productId) !== String(productId)) {
      return false;
    }

    if (filterByVariant) {
      return String(item.variantId) === String(variantId);
    }

    return true;
  });

  if (itemIndex < 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart item not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    const current = cart.items[itemIndex];

    const product = await Product.findOne({ _id: current.productId, active: true, isDeleted: false });
    if (!product) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    const variant = getProductVariant(product, current.variantId);
    ensureQuantityInStock(variant, quantity);

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = Number(variant.price || 0);
    cart.items[itemIndex].mrp = Number(variant.mrp || 0);
  }

  if (cart.items.length === 0) {
    await Cart.deleteOne({ _id: cart._id });
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Cart updated successfully.',
      data: {
        cart: formatCartResponse(null),
      },
    });
  }

  const totalUnits = cart.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  if (totalUnits > CART_MAX_ITEMS) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Maximum ${CART_MAX_ITEMS} items allowed in cart.`,
      ERROR_CODES.CART_MAX_ITEMS_REACHED
    );
  }

  const normalized = await normalizeCartAfterRecalc(cart);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Cart updated successfully.',
    data: {
      cart: formatCartResponse(normalized),
    },
  });
};

const removeItem = async (req, res) => {
  const { productId } = req.params;

  const cart = await getValidCart(req.user.id);
  if (!cart) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart not found.', ERROR_CODES.CART_NOT_FOUND);
  }

  const prevCount = cart.items.length;
  cart.items = cart.items.filter((item) => String(item.productId) !== String(productId));

  if (cart.items.length === prevCount) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart item not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  if (cart.items.length === 0) {
    await Cart.deleteOne({ _id: cart._id });
    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Item removed successfully.',
      data: {
        cart: formatCartResponse(null),
      },
    });
  }

  const normalized = await normalizeCartAfterRecalc(cart);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Item removed successfully.',
    data: {
      cart: formatCartResponse(normalized),
    },
  });
};

const clearCart = async (req, res) => {
  await Cart.deleteMany({ userId: req.user.id });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Cart cleared successfully.',
    data: {},
  });
};

const applyCoupon = async (req, res) => {
  const couponCode = String(req.body.couponCode || '').trim().toUpperCase();

  const cart = await getValidCart(req.user.id);
  if (!cart || cart.items.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cart is empty.', ERROR_CODES.CART_NOT_FOUND);
  }

  const coupon = await Coupon.findOne({ code: couponCode });
  if (!coupon) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid coupon code.', ERROR_CODES.COUPON_INVALID);
  }

  if (!isCouponLive(coupon)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Coupon is expired or inactive.', ERROR_CODES.COUPON_EXPIRED);
  }

  await ensureCouponApplicableForCart({ coupon, cart, userId: req.user.id });

  cart.appliedCoupon = {
    couponId: String(coupon._id),
    code: coupon.code,
    discountAmount: 0,
  };

  const shop = await ensureActiveShop(cart.shopId);
  await refreshAppliedOffer(cart);
  recalculateCartTotals({ cart, shop, coupon });
  await cart.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon applied successfully.',
    data: {
      cart: formatCartResponse(cart),
    },
  });
};

const removeCoupon = async (req, res) => {
  const cart = await getValidCart(req.user.id);

  if (!cart) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Cart not found.', ERROR_CODES.CART_NOT_FOUND);
  }

  cart.appliedCoupon = {
    couponId: null,
    code: null,
    discountAmount: 0,
  };

  const normalized = await normalizeCartAfterRecalc(cart);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Coupon removed successfully.',
    data: {
      cart: formatCartResponse(normalized),
    },
  });
};

const estimateShipping = async (req, res) => {
  const { addressId } = req.query;

  const user = await User.findById(req.user.id);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  const address = (user.addresses || []).find((item) => String(item.id) === String(addressId));
  if (!address) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  const cart = await getValidCart(req.user.id);
  if (!cart || cart.items.length === 0) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cart is empty.', ERROR_CODES.CART_NOT_FOUND);
  }

  const shop = await ensureActiveShop(cart.shopId);

  const inPreferredArea = Array.isArray(shop.delivery?.availableAreas)
    ? shop.delivery.availableAreas.map((area) => String(area).toLowerCase()).includes(String(address.area).toLowerCase())
    : false;

  let deliveryCharge = Number(shop.delivery?.chargeAmount || 0);

  if (!inPreferredArea) {
    deliveryCharge += 20;
  }

  // Add ₹50 surcharge for orders between ₹100-₹999 (minimum order but not free delivery)
  const subtotalAmount = Number(cart.subtotal || 0);
  if (subtotalAmount >= 100 && subtotalAmount < FREE_DELIVERY_MIN_ORDER) {
    deliveryCharge += 50;
  }

  if (subtotalAmount >= FREE_DELIVERY_MIN_ORDER) {
    deliveryCharge = 0;
  }

  const eta = inPreferredArea ? '25-40 mins' : '40-60 mins';

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shipping estimate generated successfully.',
    data: {
      deliveryCharge: Number(deliveryCharge.toFixed(2)),
      eta,
    },
  });
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  estimateShipping,
};
