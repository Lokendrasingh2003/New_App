const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminSubscriptionPlanCreate,
  validateAdminSubscriptionPlanListQuery,
  validateAdminSubscriptionPlanIdParam,
  validateAdminSubscriptionPlanUpdate,
  validateAdminSubscriptionPlanToggle,
} = require('../middleware/validation');
const {
  createSubscriptionPlan,
  listSubscriptionPlans,
  updateSubscriptionPlan,
  toggleSubscriptionPlanActive,
} = require('../controllers/adminSubscriptionsController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.post('/', validateAdminSubscriptionPlanCreate(), createSubscriptionPlan);
router.get('/', validateAdminSubscriptionPlanListQuery(), listSubscriptionPlans);
router.put('/:planId', validateAdminSubscriptionPlanIdParam(), validateAdminSubscriptionPlanUpdate(), updateSubscriptionPlan);
router.patch('/:planId/toggle-active', validateAdminSubscriptionPlanIdParam(), validateAdminSubscriptionPlanToggle(), toggleSubscriptionPlanActive);

module.exports = router;
