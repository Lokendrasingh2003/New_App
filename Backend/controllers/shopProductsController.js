const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { parse } = require('csv-parse/sync');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Shopkeeper = require('../models/Shopkeeper');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES, SHOPKEEPER_STATUS } = require('../config/constants');

const RECENT_ORDER_DAYS = 30;

const toSlugPart = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const randomId = () => Math.random().toString(36).slice(2, 8);

const ensureActiveShopkeeper = (shopkeeper) => {
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  if (shopkeeper.status !== SHOPKEEPER_STATUS.ACTIVE) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Active shopkeeper account required.', ERROR_CODES.SHOPKEEPER_SUSPENDED);
  }
};

const ensureOwnedShop = async ({ shopkeeperId, shopId }) => {
  const shopkeeper = await Shopkeeper.findById(shopkeeperId);
  ensureActiveShopkeeper(shopkeeper);

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  if (String(shop.ownerId) !== String(shopkeeper._id)) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'You do not own this shop.', ERROR_CODES.SHOP_OWNER_MISMATCH);
  }

  return { shopkeeper, shop };
};

const ensureCategoryPublished = async (categoryId) => {
  const category = await Category.findOne({ _id: categoryId, isActive: true, status: 'PUBLISHED' }).lean();
  if (!category) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Category is not published or does not exist.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  return category;
};

const withVariantIds = (variants) =>
  variants.map((variant, index) => ({
    id: String(variant.id || `${toSlugPart(variant.label) || 'variant'}-${index + 1}`),
    label: variant.label,
    price: Number(variant.price),
    mrp: Number(variant.mrp),
    inStock: Boolean(variant.inStock),
    stockQty: Number(variant.stockQty),
    lockedQty: 0,
  }));

const buildProductSlug = async ({ shopId, name }) => {
  const base = `${toSlugPart(name)}-${randomId()}`;
  let candidate = base;
  let tries = 0;

  while (tries < 10) {
    const exists = await Product.exists({ shopId, slug: candidate });
    if (!exists) {
      return candidate;
    }

    candidate = `${toSlugPart(name)}-${randomId()}`;
    tries += 1;
  }

  throw new ApiError(HTTP_STATUS.CONFLICT, 'Unable to generate unique product slug.', ERROR_CODES.VALIDATION_ERROR);
};

const sanitizeImages = (images) => {
  const list = Array.isArray(images) ? images : [];
  return list.slice(0, 10);
};

const createProduct = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const {
    name,
    description,
    categoryId,
    categoryName,
    subcategoryName,
    images,
    variants,
    active,
  } = req.body;

  await ensureCategoryPublished(categoryId);

  const slug = await buildProductSlug({ shopId: shop._id, name });

  const product = await Product.create({
    shopId: shop._id,
    shopName: shop.shopName,
    name,
    slug,
    description: description || null,
    categoryId,
    categoryName,
    subcategoryName: subcategoryName || null,
    images: sanitizeImages(images),
    variants: withVariantIds(variants),
    active,
    rating: 0,
    reviewCount: 0,
    isDeleted: false,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Product created successfully.',
    data: {
      product,
    },
  });
};

const getProductsForShopkeeper = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const search = String(req.query.search || '').trim();
  const category = String(req.query.category || '').trim();
  const active = req.query.active;
  const limit = Math.min(toInt(req.query.limit, 20), 100);
  const offset = Math.max(toInt(req.query.offset, 0), 0);

  const filter = {
    shopId,
    isDeleted: false,
  };

  if (search) {
    filter.$or = [{ name: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
  }

  if (category) {
    filter.categoryName = { $regex: `^${category}$`, $options: 'i' };
  }

  if (active !== undefined) {
    filter.active = String(active).toLowerCase() === 'true';
  }

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ updatedAt: -1 }).skip(offset).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Products fetched successfully.',
    data: {
      products,
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getProductForShopkeeper = async (req, res) => {
  const { shopId, productId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const product = await Product.findOne({ _id: productId, shopId, isDeleted: false }).lean();
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product fetched successfully.',
    data: {
      product,
    },
  });
};

const updateProduct = async (req, res) => {
  const { shopId, productId } = req.params;
  const { shop } = await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const product = await Product.findOne({ _id: productId, shopId, isDeleted: false });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const {
    name,
    description,
    categoryId,
    categoryName,
    subcategoryName,
    images,
    variants,
    active,
  } = req.body;

  await ensureCategoryPublished(categoryId);

  product.name = name;
  product.description = description || null;
  product.categoryId = categoryId;
  product.categoryName = categoryName;
  product.subcategoryName = subcategoryName || null;
  product.images = sanitizeImages(images);

  const existingVariantMap = new Map((product.variants || []).map((item) => [String(item.id), Number(item.lockedQty || 0)]));
  product.variants = withVariantIds(variants).map((variant) => ({
    ...variant,
    lockedQty: existingVariantMap.get(String(variant.id)) || 0,
  }));

  product.active = active;
  product.shopName = shop.shopName;

  await product.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product updated successfully.',
    data: {
      product,
    },
  });
};

const deleteProduct = async (req, res) => {
  const { shopId, productId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const product = await Product.findOne({ _id: productId, shopId, isDeleted: false });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const recentSince = new Date(Date.now() - RECENT_ORDER_DAYS * 24 * 60 * 60 * 1000);
  const usedRecently = await Order.exists({
    shopId,
    createdAt: { $gte: recentSince },
    'items.productId': product._id,
  });

  if (usedRecently) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Product cannot be deleted because it is used in recent orders.',
      ERROR_CODES.PRODUCT_IN_RECENT_ORDERS
    );
  }

  product.isDeleted = true;
  product.deletedAt = new Date();
  product.active = false;
  await product.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product deleted successfully.',
    data: {},
  });
};

const patchProductStock = async (req, res) => {
  const { shopId, productId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const product = await Product.findOne({ _id: productId, shopId, isDeleted: false });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const updates = req.body.variants || [];
  const updateMap = new Map(updates.map((item) => [String(item.id), item]));

  product.variants = (product.variants || []).map((variant) => {
    const patch = updateMap.get(String(variant.id));
    if (!patch) {
      return variant;
    }

    return {
      ...variant,
      stockQty: Math.max(0, Number(patch.stockQty || 0)),
      inStock: Boolean(patch.inStock),
    };
  });

  await product.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product stock updated successfully.',
    data: {
      product,
    },
  });
};

const parseCsvRows = (buffer) => {
  const text = buffer.toString('utf8');
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
};

const parseSpreadsheetRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
};

const buildProductFromRow = (row) => {
  const variantLabel = String(row.variantLabel || 'Default').trim();
  const price = Number(row.price || 0);
  const mrp = Number(row.mrp || 0);
  const stockQty = Number(row.stockQty || 0);

  return {
    name: String(row.name || '').trim(),
    description: String(row.description || '').trim(),
    categoryId: String(row.categoryId || '').trim(),
    categoryName: String(row.categoryName || '').trim(),
    subcategoryName: String(row.subcategoryName || '').trim(),
    images: String(row.images || '')
      .split('|')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10),
    variants: [
      {
        label: variantLabel || 'Default',
        price,
        mrp,
        inStock: stockQty > 0,
        stockQty: Math.max(0, stockQty),
      },
    ],
    active: String(row.active || 'true').toLowerCase() !== 'false',
  };
};

const bulkUploadProducts = async (req, res) => {
  const { shopId } = req.params;
  const { shop } = await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  if (!req.file) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'File is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const originalName = String(req.file.originalname || '').toLowerCase();
  let rows = [];

  if (originalName.endsWith('.csv')) {
    rows = parseCsvRows(req.file.buffer);
  } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
    rows = parseSpreadsheetRows(req.file.buffer);
  } else {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Only CSV and Excel files are supported.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  let imported = 0;
  let failed = 0;
  const errors = [];

  for (let index = 0; index < rows.length; index += 1) {
    try {
      const raw = buildProductFromRow(rows[index]);
      await ensureCategoryPublished(raw.categoryId);

      const slug = await buildProductSlug({ shopId: shop._id, name: raw.name });

      await Product.create({
        shopId: shop._id,
        shopName: shop.shopName,
        name: raw.name,
        slug,
        description: raw.description || null,
        categoryId: raw.categoryId,
        categoryName: raw.categoryName,
        subcategoryName: raw.subcategoryName || null,
        images: sanitizeImages(raw.images),
        variants: withVariantIds(raw.variants),
        active: raw.active,
        rating: 0,
        reviewCount: 0,
        isDeleted: false,
      });

      imported += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        row: index + 1,
        error: error.message,
      });
    }
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Bulk upload processed.',
    data: {
      imported,
      failed,
      errors,
    },
  });
};

const uploadProductImage = async (req, res) => {
  const { shopId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  if (!req.file) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image file is required.', ERROR_CODES.VALIDATION_ERROR);
  }

  const ext = path.extname(req.file.originalname || '').toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only jpg and png formats are allowed.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (Number(req.file.size || 0) > 5 * 1024 * 1024) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Image size must be <= 5MB.', ERROR_CODES.VALIDATION_ERROR);
  }

  const uploadsRoot = path.join(__dirname, '..', 'uploads', 'products');
  await fs.promises.mkdir(uploadsRoot, { recursive: true });

  const imageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filename = `${imageId}${ext === '.jpeg' ? '.jpg' : ext}`;
  const targetPath = path.join(uploadsRoot, filename);

  await fs.promises.writeFile(targetPath, req.file.buffer);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Image uploaded successfully.',
    data: {
      id: imageId,
      imageUrl: `${process.env.API_BASE_URL || 'http://localhost:5000/api'}`.replace(/\/api$/i, '') + `/uploads/products/${filename}`,
    },
  });
};

const deleteProductImage = async (req, res) => {
  const { shopId, productId, imageId } = req.params;
  await ensureOwnedShop({ shopkeeperId: req.shopkeeper.id, shopId });

  const product = await Product.findOne({ _id: productId, shopId, isDeleted: false });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const nextImages = (product.images || []).filter((image, index) => {
    if (String(index) === String(imageId)) {
      return false;
    }

    const fileName = String(image).split('/').pop() || '';
    return !fileName.startsWith(String(imageId));
  });

  product.images = nextImages;
  await product.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Image deleted successfully.',
    data: {
      success: true,
    },
  });
};

module.exports = {
  createProduct,
  getProductsForShopkeeper,
  getProductForShopkeeper,
  updateProduct,
  deleteProduct,
  patchProductStock,
  bulkUploadProducts,
  uploadProductImage,
  deleteProductImage,
};
