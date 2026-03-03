const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminRefundsListQuery,
  validateAdminRefundIdParam,
  validateAdminRefundCreate,
  validateAdminRefundProcess,
  validateAdminRefundComplete,
  validateAdminRefundFail,
} = require('../middleware/validation');
const {
  listAdminRefunds,
  getAdminRefundById,
  createAdminRefund,
  processAdminRefund,
  completeAdminRefund,
  failAdminRefund,
} = require('../controllers/adminOrdersController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminRefundsListQuery(), listAdminRefunds);
router.get('/:refundId', validateAdminRefundIdParam(), getAdminRefundById);
router.post('/', validateAdminRefundCreate(), createAdminRefund);
router.post('/:refundId/process', validateAdminRefundIdParam(), validateAdminRefundProcess(), processAdminRefund);
router.post('/:refundId/complete', validateAdminRefundIdParam(), validateAdminRefundComplete(), completeAdminRefund);
router.post('/:refundId/fail', validateAdminRefundIdParam(), validateAdminRefundFail(), failAdminRefund);

module.exports = router;
