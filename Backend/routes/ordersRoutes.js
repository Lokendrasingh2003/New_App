const express = require('express');
const { verifyUserToken } = require('../middleware/auth');
const {
  validateOrderCreate,
  validateOrdersQuery,
  validateOrderIdParam,
  validateOrderCancel,
  validateOrderFeedback,
} = require('../middleware/validation');
const {
  createOrder,
  getOrders,
  getOrderByOrderId,
  cancelOrder,
  submitOrderFeedback,
} = require('../controllers/ordersController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: User order APIs
 */

/**
 * @swagger
 * /api/orders/create:
 *   post:
 *     summary: Create order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List user orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Orders fetched
 */

router.use(verifyUserToken);

router.post('/create', validateOrderCreate(), createOrder);
router.get('/', validateOrdersQuery(), getOrders);
router.get('/:orderId', validateOrderIdParam(), getOrderByOrderId);
router.post('/:orderId/cancel', validateOrderIdParam(), validateOrderCancel(), cancelOrder);
router.post('/:orderId/submit-feedback', validateOrderIdParam(), validateOrderFeedback(), submitOrderFeedback);

module.exports = router;
