const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const ensureDistinctSubcategories = (subcategories) => {
  const nameSet = new Set();
  const slugSet = new Set();

  for (const subcategory of subcategories) {
    const nameKey = String(subcategory.name || '').trim().toLowerCase();
    const slugKey = toSlug(subcategory.slug || subcategory.name);

    if (nameSet.has(nameKey) || slugSet.has(slugKey)) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Subcategory names/slugs must be unique within category.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    nameSet.add(nameKey);
    slugSet.add(slugKey);
  }
};

const normalizeSubcategories = (subcategories) => {
  const list = Array.isArray(subcategories) ? subcategories : [];

  if (list.length > 8) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Category can have at most 8 subcategories.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  ensureDistinctSubcategories(list);

  return list.map((subcategory, index) => ({
    id: String(subcategory.id || `subcat-${Date.now()}-${index + 1}`),
    name: String(subcategory.name || '').trim(),
    slug: toSlug(subcategory.slug || subcategory.name),
    isActive: subcategory.isActive !== undefined ? Boolean(subcategory.isActive) : true,
  }));
};

const ensureUniqueCategory = async ({ name, slug, excludeId = null }) => {
  const query = {
    $or: [{ name: { $regex: `^${name}$`, $options: 'i' } }, { slug }],
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const existing = await Category.findOne(query).lean();
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Category name or slug already exists.', ERROR_CODES.VALIDATION_ERROR);
  }
};

const buildCategoryPayload = (input) => ({
  name: String(input.name || '').trim(),
  slug: toSlug(input.slug || input.name),
  description: input.description ? String(input.description).trim() : null,
  image: input.image ? String(input.image).trim() : null,
  icon: input.icon ? String(input.icon).trim() : null,
  displayOrder: Number(input.displayOrder || 0),
  subcategories: normalizeSubcategories(input.subcategories),
});

const createCategory = async (req, res) => {
  const payload = buildCategoryPayload(req.body);
  await ensureUniqueCategory({ name: payload.name, slug: payload.slug });

  const category = await Category.create({
    ...payload,
    status: 'DRAFT',
    publishedAt: null,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.CATEGORY_CREATED,
    buildActorFromRequest(req),
    { type: 'CATEGORY', id: category._id, name: category.name },
    'CREATED',
    { before: null, after: category.toObject() },
    'Category created by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Category created successfully.',
    data: { category },
  });
};

const listCategories = async (req, res) => {
  const search = String(req.query.search || '').trim();
  const status = String(req.query.status || '').trim().toUpperCase();
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ displayOrder: 1, createdAt: -1 }).skip(offset).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Categories fetched successfully.',
    data: {
      categories,
      pagination: { total, limit, offset },
    },
  });
};

const getCategoryById = async (req, res) => {
  const category = await Category.findById(req.params.categoryId).lean();
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Category fetched successfully.',
    data: { category },
  });
};

const updateCategory = async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if (category.status !== 'DRAFT') {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Only DRAFT categories can be updated.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const payload = buildCategoryPayload(req.body);
  await ensureUniqueCategory({ name: payload.name, slug: payload.slug, excludeId: category._id });

  const before = category.toObject();

  category.name = payload.name;
  category.slug = payload.slug;
  category.description = payload.description;
  category.image = payload.image;
  category.icon = payload.icon;
  category.displayOrder = payload.displayOrder;
  category.subcategories = payload.subcategories;

  await category.save();

  await logAudit(
    AUDIT_EVENT_TYPES.CATEGORY_UPDATED,
    buildActorFromRequest(req),
    { type: 'CATEGORY', id: category._id, name: category.name },
    'UPDATED',
    { before, after: category.toObject() },
    'Category updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Category updated successfully.',
    data: { category },
  });
};

const deleteCategory = async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if (category.status !== 'DRAFT') {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Only DRAFT categories can be deleted.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const productExists = await Product.exists({ categoryId: category._id, isDeleted: false });
  if (productExists) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot delete category with existing products.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  await Category.deleteOne({ _id: category._id });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Category deleted successfully.',
    data: {},
  });
};

const toggleCategoryActive = async (req, res) => {
  const { categoryId } = req.params;
  const { isActive } = req.body;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  category.isActive = Boolean(isActive);
  await category.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Category active status updated successfully.',
    data: { category },
  });
};

const publishCategory = async (req, res) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if (category.status === 'PUBLISHED') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Category is already published.', ERROR_CODES.VALIDATION_ERROR);
  }

  const activeSubcategories = (category.subcategories || []).filter((subcategory) => subcategory.isActive !== false);

  if (activeSubcategories.length > 8) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Publishing allows at most 8 active subcategories.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  if (!category.name || !category.slug || !category.description || !category.image || !category.icon) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'All required fields must be filled before publishing.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  category.status = 'PUBLISHED';
  category.publishedAt = new Date();
  await category.save();

  await logAudit(
    AUDIT_EVENT_TYPES.CATEGORY_PUBLISHED,
    buildActorFromRequest(req),
    { type: 'CATEGORY', id: category._id, name: category.name },
    'APPROVED',
    {
      before: { status: 'DRAFT', publishedAt: null },
      after: { status: category.status, publishedAt: category.publishedAt },
    },
    'Category published by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Category published successfully.',
    data: { category },
  });
};

const addSubcategory = async (req, res) => {
  const { categoryId } = req.params;
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if ((category.subcategories || []).length >= 8) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Maximum 8 subcategories allowed.', ERROR_CODES.VALIDATION_ERROR);
  }

  const incomingName = String(req.body.name || '').trim();
  const incomingSlug = toSlug(req.body.slug || req.body.name);

  const duplicate = (category.subcategories || []).some(
    (item) => item.name.toLowerCase() === incomingName.toLowerCase() || item.slug === incomingSlug
  );

  if (duplicate) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Duplicate subcategory.', ERROR_CODES.VALIDATION_ERROR);
  }

  const subcategory = {
    id: `subcat-${Date.now()}`,
    name: incomingName,
    slug: incomingSlug,
    isActive: true,
  };

  category.subcategories.push(subcategory);
  await category.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Subcategory added successfully.',
    data: { subcategory },
  });
};

const updateSubcategory = async (req, res) => {
  const { categoryId, subcatId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if (category.status === 'PUBLISHED') {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot update subcategories in published category.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const index = (category.subcategories || []).findIndex((item) => String(item.id) === String(subcatId));
  if (index < 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subcategory not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  const nextName = String(req.body.name || '').trim();
  const nextSlug = toSlug(req.body.slug || req.body.name);

  const duplicate = (category.subcategories || []).some(
    (item, idx) => idx !== index && (item.name.toLowerCase() === nextName.toLowerCase() || item.slug === nextSlug)
  );

  if (duplicate) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Duplicate subcategory.', ERROR_CODES.VALIDATION_ERROR);
  }

  category.subcategories[index] = {
    ...category.subcategories[index],
    name: nextName,
    slug: nextSlug,
  };

  await category.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subcategory updated successfully.',
    data: { subcategory: category.subcategories[index] },
  });
};

const deleteSubcategory = async (req, res) => {
  const { categoryId, subcatId } = req.params;

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Category not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  if (category.status === 'PUBLISHED') {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot delete subcategories in published category.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const subcategory = (category.subcategories || []).find((item) => String(item.id) === String(subcatId));
  if (!subcategory) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Subcategory not found.', ERROR_CODES.CATEGORY_NOT_FOUND);
  }

  const productExists = await Product.exists({
    categoryId: category._id,
    subcategoryName: { $regex: `^${subcategory.name}$`, $options: 'i' },
    isDeleted: false,
  });

  if (productExists) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot delete subcategory with existing products.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  category.subcategories = (category.subcategories || []).filter((item) => String(item.id) !== String(subcatId));
  await category.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Subcategory deleted successfully.',
    data: {},
  });
};

module.exports = {
  createCategory,
  listCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
  publishCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
};
