const rateLimit = require('express-rate-limit');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const rateLimitHandler = (req, res) => {
  return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    error: 'Too many attempts. Please try again later.',
    code: ERROR_CODES.LOGIN_RATE_LIMITED,
    retryAfter: req.rateLimit?.resetTime || null,
  });
};

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const authenticatedApiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const subject = req.auth?.sub || req.user?.id || req.shopkeeper?.id;
    return subject ? `auth:${subject}` : req.ip;
  },
  handler: (req, res) => {
    return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      error: 'Too many API requests. Please slow down.',
      code: ERROR_CODES.LOGIN_RATE_LIMITED,
    });
  },
});

module.exports = {
  loginRateLimiter,
  otpRateLimiter,
  authenticatedApiRateLimiter,
};
