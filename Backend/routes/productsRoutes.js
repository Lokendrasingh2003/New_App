const express = require('express');
const { verifyUserToken } = require('../middleware/auth');
const { validateProductIdParam, validateReviewCreate, validateReviewListQuery } = require('../middleware/validation');
const { getProductById, searchProducts, getShopProducts } = require('../controllers/productsController');
const { createProductReview, getProductReviews } = require('../controllers/reviewsController');

const router = express.Router();

router.get('/search', searchProducts);
router.get('/shops/:shopId', getShopProducts);
router.post('/:productId/reviews', verifyUserToken, validateProductIdParam(), validateReviewCreate(), createProductReview);
router.get('/:productId/reviews', validateProductIdParam(), validateReviewListQuery(), getProductReviews);
router.get('/:productId', getProductById);

module.exports = router;
