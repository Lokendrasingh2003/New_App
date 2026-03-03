const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminPaymentsListQuery,
  validateAdminPaymentsStatsQuery,
  validateAdminPaymentIdParam,
  validateAdminPaymentVerify,
} = require('../middleware/validation');
const {
  listPayments,
  getPaymentStats,
  verifyPaymentByAdmin,
} = require('../controllers/adminFinanceController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminPaymentsListQuery(), listPayments);
router.get('/stats', validateAdminPaymentsStatsQuery(), getPaymentStats);
router.post('/:paymentId/verify', validateAdminPaymentIdParam(), validateAdminPaymentVerify(), verifyPaymentByAdmin);

module.exports = router;
