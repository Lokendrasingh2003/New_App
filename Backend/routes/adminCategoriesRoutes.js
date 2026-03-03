const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminCategoryCreate,
  validateAdminCategoryUpdate,
  validateAdminCategoriesListQuery,
  validateAdminCategoryIdParam,
  validateAdminCategoryToggleActive,
  validateAdminSubcategoryCreate,
  validateAdminSubcategoryUpdate,
  validateAdminSubcategoryParam,
} = require('../middleware/validation');
const {
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
} = require('../controllers/adminCategoriesController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.post('/', validateAdminCategoryCreate(), createCategory);
router.get('/', validateAdminCategoriesListQuery(), listCategories);
router.get('/:categoryId', validateAdminCategoryIdParam(), getCategoryById);
router.put('/:categoryId', validateAdminCategoryIdParam(), validateAdminCategoryUpdate(), updateCategory);
router.delete('/:categoryId', validateAdminCategoryIdParam(), deleteCategory);
router.patch('/:categoryId/toggle-active', validateAdminCategoryIdParam(), validateAdminCategoryToggleActive(), toggleCategoryActive);
router.post('/:categoryId/publish', validateAdminCategoryIdParam(), publishCategory);
router.post('/:categoryId/subcategories', validateAdminCategoryIdParam(), validateAdminSubcategoryCreate(), addSubcategory);
router.put(
  '/:categoryId/subcategories/:subcatId',
  validateAdminSubcategoryParam(),
  validateAdminSubcategoryUpdate(),
  updateSubcategory
);
router.delete('/:categoryId/subcategories/:subcatId', validateAdminSubcategoryParam(), deleteSubcategory);

module.exports = router;
