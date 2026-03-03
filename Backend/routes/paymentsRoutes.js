const express = require('express');
const { verifyUserToken, verifyInternalOrAdmin } = require('../middleware/auth');
const { validatePaymentVerify, validatePaymentRefund } = require('../middleware/validation');
const { verifyPayment, refundPayment } = require('../controllers/paymentsController');

const router = express.Router();

router.post('/verify', verifyUserToken, validatePaymentVerify(), verifyPayment);
router.post('/refund', verifyInternalOrAdmin, validatePaymentRefund(), refundPayment);

module.exports = router;
