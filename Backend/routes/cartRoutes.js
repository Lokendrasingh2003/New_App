const express = require('express');
const { verifyUserToken } = require('../middleware/auth');
const {
  validateCartAddItem,
  validateCartUpdateItem,
  validateCartItemParam,
  validateCartCoupon,
  validateCartShippingQuery,
} = require('../middleware/validation');
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  applyCoupon,
  removeCoupon,
  estimateShipping,
} = require('../controllers/cartController');

const router = express.Router();

router.use(verifyUserToken);

router.get('/', getCart);
router.post('/add-item', validateCartAddItem(), addItem);
router.put('/update-item/:productId', validateCartItemParam(), validateCartUpdateItem(), updateItem);
router.delete('/items/:productId', validateCartItemParam(), removeItem);
router.delete('/clear', clearCart);
router.post('/apply-coupon', validateCartCoupon(), applyCoupon);
router.delete('/remove-coupon', removeCoupon);
router.get('/estimate-shipping', validateCartShippingQuery(), estimateShipping);

module.exports = router;
