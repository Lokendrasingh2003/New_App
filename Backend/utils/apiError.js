const { AppError } = require('./errors');

class ApiError extends AppError {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = undefined) {
    super(message, statusCode, code, details);
  }
}

module.exports = ApiError;
