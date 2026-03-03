const express = require('express');
const { validateCouponPublicQuery } = require('../middleware/validation');
const { validateCoupon } = require('../controllers/couponsController');

const router = express.Router();

router.get('/validate', validateCouponPublicQuery(), validateCoupon);

module.exports = router;
