const express = require('express');
const { verifyShopkeeperToken } = require('../middleware/auth');
const { requireShopkeeper, requireOwnership } = require('../middleware/authGuards');
const {
  validateShopkeeperPaymentQuery,
  validateShopkeeperPaymentIdParam,
  validateShopkeeperPaymentVerify,
  validateShopkeeperPaymentBulkStatusUpdate,
  validateShopkeeperRefundQuery,
  validateShopkeeperRefundIdParam,
  validateShopkeeperRefundCreate,
  validateShopkeeperRefundUpdate,
  validateShopkeeperRefundProcess,
  validateShopkeeperIdParam,
} = require('../middleware/validation');
const paymentController = require('../controllers/shopkeeperPaymentController');
const refundController = require('../controllers/shopkeeperRefundController');

const router = express.Router();

router.use(verifyShopkeeperToken, requireShopkeeper, requireOwnership);

router.get('/:shopkeeperId/payments', validateShopkeeperIdParam(), validateShopkeeperPaymentQuery(), paymentController.getPayments);
router.get('/:shopkeeperId/payments/stats', validateShopkeeperIdParam(), paymentController.getPaymentStats);
router.get('/:shopkeeperId/payments/:paymentId', validateShopkeeperPaymentIdParam(), paymentController.getPaymentById);
router.post(
  '/:shopkeeperId/payments/:paymentId/verify',
  validateShopkeeperPaymentIdParam(),
  validateShopkeeperPaymentVerify(),
  paymentController.verifyPayment
);
router.post(
  '/:shopkeeperId/payments/bulk-status-update',
  validateShopkeeperIdParam(),
  validateShopkeeperPaymentBulkStatusUpdate(),
  paymentController.bulkStatusUpdate
);

router.get('/:shopkeeperId/refunds', validateShopkeeperIdParam(), validateShopkeeperRefundQuery(), refundController.getRefunds);
router.get('/:shopkeeperId/refunds/stats', validateShopkeeperIdParam(), refundController.getRefundStats);
router.get('/:shopkeeperId/refunds/:refundId', validateShopkeeperRefundIdParam(), refundController.getRefundById);
router.post('/:shopkeeperId/refunds', validateShopkeeperIdParam(), validateShopkeeperRefundCreate(), refundController.createRefund);
router.put(
  '/:shopkeeperId/refunds/:refundId',
  validateShopkeeperRefundIdParam(),
  validateShopkeeperRefundUpdate(),
  refundController.updateRefund
);
router.post(
  '/:shopkeeperId/refunds/:refundId/process',
  validateShopkeeperRefundIdParam(),
  validateShopkeeperRefundProcess(),
  refundController.processRefund
);

module.exports = router;
