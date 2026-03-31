const express = require('express');
const multer = require('multer');
const { verifyShopkeeperToken } = require('../middleware/auth');
const {
	validateShopRegister,
	validateShopIdParam,
	validateShopSettings,
	validateShopBusinessHours,
	validateShopDeliveryConfig,
	validateProductManageCreate,
	validateProductManageListQuery,
	validateProductManageIdParam,
	validateProductManageImageParam,
	validateProductManageStock,
	validateOfferCreate,
	validateOfferListQuery,
	validateOfferIdParam,
	validateOfferToggle,
	validateShopOrdersListQuery,
	validateShopOrderIdParam,
	validateShopOrderUpdate,
	validateShopOrderReject,
	validateShopOrdersAnalyticsQuery,
} = require('../middleware/validation');
const { getShopById, getShopReviews, getNearbyShops, getPublicShopBySlug } = require('../controllers/shopsController');
const { getShopProducts } = require('../controllers/productsController');
const {
	createShop,
	updateShop,
	getShopDashboard,
	getShopSettings,
	updateShopSettings,
	uploadShopImage,
	patchBusinessHours,
	patchDeliveryConfig,
	getShopStats,
	getShopQrCode,
	getShopPublicLink,
} = require('../controllers/shopManagementController');
const {
	createProduct,
	getProductsForShopkeeper,
	getProductForShopkeeper,
	updateProduct,
	deleteProduct,
	patchProductStock,
	bulkUploadProducts,
	uploadProductImage,
	deleteProductImage,
} = require('../controllers/shopProductsController');
const {
	createOffer,
	listOffers,
	getOfferById,
	updateOffer,
	deleteOffer,
	toggleOffer,
} = require('../controllers/offersController');
const {
	listShopOrders,
	getShopOrderDetail,
	updateShopOrderStatus,
	acceptOrder,
	rejectOrder,
	markOrderReady,
	getTodayOrderStats,
	getOrdersAnalytics,
} = require('../controllers/shopOrdersController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @swagger
 * tags:
 *   - name: Shops
 *     description: Shop APIs
 */

/**
 * @swagger
 * /api/shops/{shopId}:
 *   get:
 *     summary: Get shop details by id
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Shop details fetched
 */

router.post('/register', verifyShopkeeperToken, validateShopRegister(), createShop);
router.put('/:shopId', verifyShopkeeperToken, validateShopIdParam(), validateShopRegister(), updateShop);
router.get('/:shopId/dashboard', verifyShopkeeperToken, validateShopIdParam(), getShopDashboard);
router.get('/:shopId/settings', verifyShopkeeperToken, validateShopIdParam(), getShopSettings);
router.put('/:shopId/settings', verifyShopkeeperToken, validateShopIdParam(), validateShopSettings(), updateShopSettings);
router.post('/:shopId/upload-image', verifyShopkeeperToken, validateShopIdParam(), upload.single('file'), uploadShopImage);
router.patch(
	'/:shopId/business-hours',
	verifyShopkeeperToken,
	validateShopIdParam(),
	validateShopBusinessHours(),
	patchBusinessHours
);
router.patch(
	'/:shopId/delivery-config',
	verifyShopkeeperToken,
	validateShopIdParam(),
	validateShopDeliveryConfig(),
	patchDeliveryConfig
);
router.get('/:shopId/stats', verifyShopkeeperToken, validateShopIdParam(), getShopStats);
router.get('/:shopId/qr-code', verifyShopkeeperToken, validateShopIdParam(), getShopQrCode);
router.get('/:shopId/public-link', verifyShopkeeperToken, validateShopIdParam(), getShopPublicLink);

router.post('/:shopId/products', verifyShopkeeperToken, validateShopIdParam(), validateProductManageCreate(), createProduct);
router.get(
	'/:shopId/products',
	verifyShopkeeperToken,
	validateShopIdParam(),
	validateProductManageListQuery(),
	getProductsForShopkeeper
);
router.get('/:shopId/products/:productId', verifyShopkeeperToken, validateProductManageIdParam(), getProductForShopkeeper);
router.put(
	'/:shopId/products/:productId',
	verifyShopkeeperToken,
	validateProductManageIdParam(),
	validateProductManageCreate(),
	updateProduct
);
router.delete('/:shopId/products/:productId', verifyShopkeeperToken, validateProductManageIdParam(), deleteProduct);
router.patch(
	'/:shopId/products/:productId/stock',
	verifyShopkeeperToken,
	validateProductManageIdParam(),
	validateProductManageStock(),
	patchProductStock
);
router.post(
	'/:shopId/products/bulk-upload',
	verifyShopkeeperToken,
	validateShopIdParam(),
	upload.single('file'),
	bulkUploadProducts
);
router.post(
	'/:shopId/products/upload-image',
	verifyShopkeeperToken,
	validateShopIdParam(),
	upload.single('file'),
	uploadProductImage
);
router.delete(
	'/:shopId/products/:productId/images/:imageId',
	verifyShopkeeperToken,
	validateProductManageImageParam(),
	deleteProductImage
);

router.post('/:shopId/offers', verifyShopkeeperToken, validateShopIdParam(), validateOfferCreate(), createOffer);
router.get('/:shopId/offers', verifyShopkeeperToken, validateShopIdParam(), validateOfferListQuery(), listOffers);
router.get('/:shopId/offers/:offerId', verifyShopkeeperToken, validateOfferIdParam(), getOfferById);
router.put('/:shopId/offers/:offerId', verifyShopkeeperToken, validateOfferIdParam(), validateOfferCreate(), updateOffer);
router.delete('/:shopId/offers/:offerId', verifyShopkeeperToken, validateOfferIdParam(), deleteOffer);
router.patch(
	'/:shopId/offers/:offerId/toggle',
	verifyShopkeeperToken,
	validateOfferIdParam(),
	validateOfferToggle(),
	toggleOffer
);

router.get(
	'/:shopId/orders/stats/today',
	verifyShopkeeperToken,
	validateShopIdParam(),
	getTodayOrderStats
);
router.get(
	'/:shopId/orders/analytics',
	verifyShopkeeperToken,
	validateShopIdParam(),
	validateShopOrdersAnalyticsQuery(),
	getOrdersAnalytics
);
router.get(
	'/:shopId/orders',
	verifyShopkeeperToken,
	validateShopIdParam(),
	validateShopOrdersListQuery(),
	listShopOrders
);
router.get(
	'/:shopId/orders/:orderId',
	verifyShopkeeperToken,
	validateShopOrderIdParam(),
	getShopOrderDetail
);
router.put(
	'/:shopId/orders/:orderId',
	verifyShopkeeperToken,
	validateShopOrderIdParam(),
	validateShopOrderUpdate(),
	updateShopOrderStatus
);
router.post(
	'/:shopId/orders/:orderId/accept',
	verifyShopkeeperToken,
	validateShopOrderIdParam(),
	acceptOrder
);
router.post(
	'/:shopId/orders/:orderId/reject',
	verifyShopkeeperToken,
	validateShopOrderIdParam(),
	validateShopOrderReject(),
	rejectOrder
);
router.post(
	'/:shopId/orders/:orderId/mark-ready',
	verifyShopkeeperToken,
	validateShopOrderIdParam(),
	markOrderReady
);

router.get('/nearby', getNearbyShops);
router.get('/public/:citySlug/:shopSlug', getPublicShopBySlug);
router.get('/:shopId', getShopById);
router.get('/:shopId/reviews', getShopReviews);

module.exports = router;
