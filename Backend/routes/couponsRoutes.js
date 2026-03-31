const express = require('express');
const { validateCouponPublicQuery } = require('../middleware/validation');
const { validateCoupon, listPublicCoupons } = require('../controllers/couponsController');

const router = express.Router();

router.get('/validate', validateCouponPublicQuery(), validateCoupon);
router.get('/public', listPublicCoupons);

module.exports = router;
