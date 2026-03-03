const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const getVariant = (product, variantId) => {
  const variant = (product.variants || []).find((item) => String(item.id) === String(variantId));

  if (!variant) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Variant not found in inventory.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  return variant;
};

const ensureAvailableForOrder = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.active) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'One or more products are unavailable.', ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    const variant = getVariant(product, item.variantId);
    const availableQty = Math.max(0, Number(variant.stockQty || 0) - Number(variant.lockedQty || 0));

    if (!variant.inStock || availableQty < Number(item.quantity || 0)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'One or more items are out of stock.',
        ERROR_CODES.CART_QUANTITY_EXCEEDS_STOCK
      );
    }
  }
};

const lockInventory = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Product not found for inventory lock.', ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    const variant = getVariant(product, item.variantId);
    const lockQty = Number(item.quantity || 0);
    const availableQty = Math.max(0, Number(variant.stockQty || 0) - Number(variant.lockedQty || 0));

    if (availableQty < lockQty) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Insufficient stock for ${item.productName}.`,
        ERROR_CODES.INVENTORY_LOCK_FAILED
      );
    }

    variant.lockedQty = Number(variant.lockedQty || 0) + lockQty;
    variant.inStock = Number(variant.stockQty || 0) - Number(variant.lockedQty || 0) > 0;
    await product.save();
  }
};

const releaseInventory = async (items, wasDeducted = false) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      continue;
    }

    const variant = getVariant(product, item.variantId);
    const qty = Number(item.quantity || 0);

    if (wasDeducted) {
      variant.stockQty = Math.max(0, Number(variant.stockQty || 0) + qty);
    } else {
      variant.lockedQty = Math.max(0, Number(variant.lockedQty || 0) - qty);
    }

    variant.inStock = Number(variant.stockQty || 0) - Number(variant.lockedQty || 0) > 0;
    await product.save();
  }
};

const deductLockedInventory = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Product not found for inventory deduction.', ERROR_CODES.PRODUCT_NOT_FOUND);
    }

    const variant = getVariant(product, item.variantId);
    const qty = Number(item.quantity || 0);

    if (Number(variant.lockedQty || 0) < qty || Number(variant.stockQty || 0) < qty) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        `Unable to deduct locked inventory for ${item.productName}.`,
        ERROR_CODES.INVENTORY_DEDUCT_FAILED
      );
    }

    variant.lockedQty = Number(variant.lockedQty || 0) - qty;
    variant.stockQty = Number(variant.stockQty || 0) - qty;
    variant.inStock = Number(variant.stockQty || 0) - Number(variant.lockedQty || 0) > 0;
    await product.save();
  }
};

module.exports = {
  ensureAvailableForOrder,
  lockInventory,
  releaseInventory,
  deductLockedInventory,
};
