const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminCouponCreate,
  validateAdminCouponsListQuery,
  validateAdminCouponIdParam,
  validateAdminCouponUpdate,
  validateAdminCouponToggle,
} = require('../middleware/validation');
const {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
  toggleCouponActive,
  getCouponAnalytics,
} = require('../controllers/adminCouponsController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.post('/', validateAdminCouponCreate(), createCoupon);
router.get('/', validateAdminCouponsListQuery(), listCoupons);
router.put('/:couponId', validateAdminCouponIdParam(), validateAdminCouponUpdate(), updateCoupon);
router.delete('/:couponId', validateAdminCouponIdParam(), deleteCoupon);
router.patch('/:couponId/toggle-active', validateAdminCouponIdParam(), validateAdminCouponToggle(), toggleCouponActive);
router.get('/:couponId/analytics', validateAdminCouponIdParam(), getCouponAnalytics);

module.exports = router;
