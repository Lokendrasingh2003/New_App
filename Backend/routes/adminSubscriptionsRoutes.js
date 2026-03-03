const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminSubscriptionsListQuery,
  validateAdminSubscriptionIdParam,
} = require('../middleware/validation');
const {
  listShopSubscriptions,
  getShopSubscriptionById,
  getShopSubscriptionStats,
} = require('../controllers/adminSubscriptionsController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminSubscriptionsListQuery(), listShopSubscriptions);
router.get('/stats', getShopSubscriptionStats);
router.get('/:subscriptionId', validateAdminSubscriptionIdParam(), getShopSubscriptionById);

module.exports = router;
