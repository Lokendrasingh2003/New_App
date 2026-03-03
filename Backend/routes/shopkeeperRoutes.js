const express = require('express');
const { verifyShopkeeperToken } = require('../middleware/auth');
const { loginRateLimiter } = require('../middleware/rateLimiters');
const {
  validateShopkeeperRegister,
  validateShopkeeperLogin,
  validateShopkeeperRefresh,
  validateShopkeeperProfile,
  validateShopkeeperChangePassword,
  validateShopkeeperVerifyEmail,
  validateShopkeeperBankDetails,
} = require('../middleware/validation');
const {
  registerShopkeeper,
  loginShopkeeper,
  logoutShopkeeper,
  refreshShopkeeperToken,
  getShopkeeperActiveSessions,
  logoutShopkeeperAllDevices,
  updateShopkeeperProfile,
  changeShopkeeperPassword,
  verifyShopkeeperEmail,
  updateShopkeeperBankDetails,
} = require('../controllers/shopkeeperController');

const router = express.Router();

router.post('/register', validateShopkeeperRegister(), registerShopkeeper);
router.post('/login', loginRateLimiter, validateShopkeeperLogin(), loginShopkeeper);
router.post('/logout', verifyShopkeeperToken, logoutShopkeeper);
router.post('/logout-all', verifyShopkeeperToken, logoutShopkeeperAllDevices);
router.get('/sessions', verifyShopkeeperToken, getShopkeeperActiveSessions);
router.post('/refresh-token', validateShopkeeperRefresh(), refreshShopkeeperToken);
router.put('/profile', verifyShopkeeperToken, validateShopkeeperProfile(), updateShopkeeperProfile);
router.put(
  '/change-password',
  verifyShopkeeperToken,
  validateShopkeeperChangePassword(),
  changeShopkeeperPassword
);
router.post('/verify-email', validateShopkeeperVerifyEmail(), verifyShopkeeperEmail);
router.post(
  '/update-bank-details',
  verifyShopkeeperToken,
  validateShopkeeperBankDetails(),
  updateShopkeeperBankDetails
);

module.exports = router;
