const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminShopsListQuery,
  validateAdminShopIdParam,
  validateAdminShopApprove,
  validateAdminShopReject,
  validateAdminShopSuspend,
  validateAdminShopTogglePublic,
  validateAdminShopEarningsQuery,
} = require('../middleware/validation');
const {
  listShops,
  getShopByIdForAdmin,
  approveShop,
  rejectShop,
  suspendShop,
  reactivateShop,
  togglePublic,
  getShopOrders,
  getShopEarnings,
} = require('../controllers/adminShopsController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminShopsListQuery(), listShops);
router.get('/:shopId', validateAdminShopIdParam(), getShopByIdForAdmin);
router.post('/:shopId/approve', validateAdminShopIdParam(), validateAdminShopApprove(), approveShop);
router.post('/:shopId/reject', validateAdminShopIdParam(), validateAdminShopReject(), rejectShop);
router.post('/:shopId/suspend', validateAdminShopIdParam(), validateAdminShopSuspend(), suspendShop);
router.post('/:shopId/reactivate', validateAdminShopIdParam(), reactivateShop);
router.patch('/:shopId/toggle-public', validateAdminShopIdParam(), validateAdminShopTogglePublic(), togglePublic);
router.get('/:shopId/orders', validateAdminShopIdParam(), getShopOrders);
router.get('/:shopId/earnings', validateAdminShopIdParam(), validateAdminShopEarningsQuery(), getShopEarnings);

module.exports = router;
