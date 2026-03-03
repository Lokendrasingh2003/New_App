const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminOrdersListQuery,
  validateAdminOrderIdParam,
  validateAdminOrderForceCancel,
  validateAdminOrderStatsQuery,
} = require('../middleware/validation');
const {
  listAdminOrders,
  getAdminOrderById,
  forceCancelAdminOrder,
  getAdminOrderStats,
} = require('../controllers/adminOrdersController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminOrdersListQuery(), listAdminOrders);
router.get('/stats', validateAdminOrderStatsQuery(), getAdminOrderStats);
router.get('/:orderId', validateAdminOrderIdParam(), getAdminOrderById);
router.post('/:orderId/force-cancel', validateAdminOrderIdParam(), validateAdminOrderForceCancel(), forceCancelAdminOrder);

module.exports = router;
