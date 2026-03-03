const express = require('express');
const {
  sendOtp,
  verifyOtp,
  logout,
  refreshToken,
  getActiveUserSessions,
  logoutAllDevices,
} = require('../controllers/authController');
const {
  validatePhone,
  validateOtp,
  validateRefreshToken,
} = require('../middleware/validation');
const { verifyUserToken } = require('../middleware/auth');
const { otpRateLimiter, loginRateLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: User authentication APIs
 */

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP to phone
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9999999990"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: Authenticated successfully
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out
 */

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Rotate and refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 */

/**
 * @swagger
 * /api/auth/sessions:
 *   get:
 *     summary: List active user sessions
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active sessions fetched
 */

router.post('/send-otp', otpRateLimiter, validatePhone(), sendOtp);
router.post('/verify-otp', loginRateLimiter, validateOtp(), verifyOtp);
router.post('/logout', verifyUserToken, logout);
router.post('/logout-all', verifyUserToken, logoutAllDevices);
router.get('/sessions', verifyUserToken, getActiveUserSessions);
router.post('/refresh-token', validateRefreshToken(), refreshToken);

module.exports = router;
