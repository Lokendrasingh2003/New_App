const crypto = require('crypto');
const { logAccess } = require('../utils/logger');

const SENSITIVE_KEYS = new Set(['password', 'oldPassword', 'newPassword', 'confirmPassword', 'otp', 'token', 'refreshToken', 'authorization', 'secret']);

const sanitizeObject = (input) => {
  if (!input || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObject(item));
  }

  const next = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(key)) {
      next[key] = '[REDACTED]';
      continue;
    }

    next[key] = sanitizeObject(value);
  }

  return next;
};

const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader('x-request-id', req.requestId);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const finishedAt = process.hrtime.bigint();
    const durationMs = Number(finishedAt - startedAt) / 1_000_000;

    logAccess({
      req,
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      query: sanitizeObject(req.query || {}),
      body: sanitizeObject(req.body || {}),
    });
  });

  next();
};

module.exports = requestLogger;
