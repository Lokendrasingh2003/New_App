const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminCommissionDefaultCreate,
  validateAdminCommissionOverrideCreate,
  validateAdminCommissionOverrideIdParam,
} = require('../middleware/validation');
const {
  getDefaultCommission,
  createDefaultCommission,
  createOverrideCommission,
  listCommissionOverrides,
  deleteCommissionOverride,
} = require('../controllers/adminFinanceController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/default', getDefaultCommission);
router.post('/default', validateAdminCommissionDefaultCreate(), createDefaultCommission);
router.post('/override', validateAdminCommissionOverrideCreate(), createOverrideCommission);
router.get('/overrides', listCommissionOverrides);
router.delete('/override/:overrideId', validateAdminCommissionOverrideIdParam(), deleteCommissionOverride);

module.exports = router;
