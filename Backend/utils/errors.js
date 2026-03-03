const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errorCode = ERROR_CODES.INTERNAL_ERROR, details = undefined) {
    super(message || 'Internal server error');
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.code = errorCode;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = undefined) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = undefined) {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND_ERROR, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = undefined) {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED_ERROR, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = undefined) {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN_ERROR, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = undefined) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT_ERROR, details);
  }
}

class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details = undefined) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, details);
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', details = undefined) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, ERROR_CODES.EXTERNAL_SERVICE_ERROR, details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = undefined) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_ERROR, details);
  }
}

class PaymentError extends AppError {
  constructor(message = 'Payment processing failed', details = undefined) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.PAYMENT_ERROR, details);
  }
}

class OtpError extends AppError {
  constructor(message = 'OTP processing failed', details = undefined) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_ERROR, details);
  }
}

class InventoryError extends AppError {
  constructor(message = 'Inventory operation failed', details = undefined) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.INVENTORY_ERROR, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  InternalServerError,
  ExternalServiceError,
  RateLimitError,
  PaymentError,
  OtpError,
  InventoryError,
};
