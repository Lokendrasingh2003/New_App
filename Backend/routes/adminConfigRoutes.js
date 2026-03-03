const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminConfigListQuery,
  validateAdminConfigKeyParam,
  validateAdminConfigUpdate,
  validateAdminConfigReset,
} = require('../middleware/validation');
const {
  listConfig,
  getConfigByKey,
  updateConfigByKey,
  resetConfigToDefault,
} = require('../controllers/adminConfigController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminConfigListQuery(), listConfig);
router.get('/:key', validateAdminConfigKeyParam(), getConfigByKey);
router.put('/:key', validateAdminConfigKeyParam(), validateAdminConfigUpdate(), updateConfigByKey);
router.post('/reset', validateAdminConfigReset(), resetConfigToDefault);

module.exports = router;
