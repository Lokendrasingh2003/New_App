const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');
const {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ExternalServiceError,
} = require('../utils/errors');
const { logError, sendCriticalAlert } = require('../utils/logger');

const errorFrequencyTracker = new Map();
const ERROR_WINDOW_MS = Number(process.env.ERROR_ALERT_WINDOW_MS || 5 * 60 * 1000);
const ERROR_ALERT_THRESHOLD = Number(process.env.ERROR_ALERT_THRESHOLD || 10);

const normalizeJoiDetails = (error) => {
  const fieldErrors = {};
  for (const detail of error?.details || []) {
    const path = Array.isArray(detail.path) ? detail.path.join('.') : String(detail.path || 'unknown');
    fieldErrors[path] = detail.message;
  }
  return fieldErrors;
};

const trackErrorFrequency = (errorCode) => {
  const now = Date.now();
  const existing = errorFrequencyTracker.get(errorCode) || { count: 0, windowStartedAt: now };

  if (now - existing.windowStartedAt > ERROR_WINDOW_MS) {
    errorFrequencyTracker.set(errorCode, { count: 1, windowStartedAt: now });
    return false;
  }

  existing.count += 1;
  errorFrequencyTracker.set(errorCode, existing);

  return existing.count >= ERROR_ALERT_THRESHOLD;
};

const mapKnownError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.isJoi && Array.isArray(error.details)) {
    return new ValidationError('Validation failed', normalizeJoiDetails(error));
  }

  if (error?.name === 'ValidationError' && error?.errors) {
    const details = {};
    for (const [field, issue] of Object.entries(error.errors)) {
      details[field] = issue.message;
    }
    return new ValidationError('Validation failed', details);
  }

  if (error?.name === 'CastError') {
    return new ValidationError('Invalid request parameter', {
      [error.path || 'id']: error.message,
    });
  }

  if (error?.code === 11000) {
    return new ConflictError('Resource already exists', error.keyValue || undefined);
  }

  if (error?.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token expired');
  }

  if (error?.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }

  return new AppError(
    error?.message || 'Internal server error',
    error?.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR,
    error?.errorCode || error?.code || ERROR_CODES.INTERNAL_ERROR,
    error?.details
  );
};

const errorHandler = (rawError, req, res, _next) => {
  const error = mapKnownError(rawError);

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const errorCode = error.errorCode || error.code || ERROR_CODES.INTERNAL_ERROR;
  const requestId = req.requestId || null;

  logError({
    message: error.message || 'Request failed',
    error,
    req,
    statusCode,
    details: error.details,
  });

  const shouldAlert =
    statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR ||
    error instanceof ExternalServiceError ||
    trackErrorFrequency(errorCode);

  if (shouldAlert) {
    sendCriticalAlert({
      message: error.message,
      requestId,
      path: req.originalUrl,
      errorCode,
      statusCode,
    }).catch(() => {});
  }

  const payload = {
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'Internal server error',
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    requestId,
  };

  if (process.env.NODE_ENV !== 'production' && statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    payload.error.debug = {
      stack: error.stack,
    };
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
