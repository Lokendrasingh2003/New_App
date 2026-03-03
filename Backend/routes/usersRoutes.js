const express = require('express');
const { verifyUserToken } = require('../middleware/auth');
const { requireUser } = require('../middleware/authGuards');
const {
  validateProfileUpdate,
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressIdParam,
} = require('../middleware/validation');
const {
  getProfile,
  updateProfile,
  deleteProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} = require('../controllers/usersController');
const { getMyReviews } = require('../controllers/reviewsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User profile and address APIs
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */

/**
 * @swagger
 * /api/users/addresses:
 *   post:
 *     summary: Add a user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Address added
 */

router.use(verifyUserToken, requireUser);

router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate(), updateProfile);
router.delete('/profile', deleteProfile);

router.get('/addresses', getAddresses);
router.get('/my-reviews', getMyReviews);
router.post('/addresses', validateCreateAddress(), addAddress);
router.put('/addresses/:addressId', validateAddressIdParam(), validateUpdateAddress(), updateAddress);
router.delete('/addresses/:addressId', validateAddressIdParam(), deleteAddress);
router.patch('/addresses/:addressId/set-default', validateAddressIdParam(), setDefaultAddress);

module.exports = router;
