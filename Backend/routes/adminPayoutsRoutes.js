const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminPayoutsListQuery,
  validateAdminPayoutIdParam,
  validateAdminPayoutApprove,
  validateAdminPayoutReject,
  validateAdminPayoutComplete,
  validateAdminPayoutGenerate,
} = require('../middleware/validation');
const {
  listPayouts,
  getPayoutById,
  approvePayout,
  rejectPayout,
  completePayout,
  generatePayouts,
} = require('../controllers/adminFinanceController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminPayoutsListQuery(), listPayouts);
router.get('/:payoutId', validateAdminPayoutIdParam(), getPayoutById);
router.post('/:payoutId/approve', validateAdminPayoutIdParam(), validateAdminPayoutApprove(), approvePayout);
router.post('/:payoutId/reject', validateAdminPayoutIdParam(), validateAdminPayoutReject(), rejectPayout);
router.post('/:payoutId/complete', validateAdminPayoutIdParam(), validateAdminPayoutComplete(), completePayout);
router.post('/generate', validateAdminPayoutGenerate(), generatePayouts);

module.exports = router;
