/**
 * Multer Error Handler Middleware
 * Wraps multer middleware to catch and properly handle file upload errors
 */

const handleMulterError = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        // Multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next({
            status: 400,
            message: 'File too large. Maximum 5MB allowed.',
            code: 'FILE_TOO_LARGE',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next({
            status: 400,
            message: 'Too many files. Only 1 file allowed.',
            code: 'TOO_MANY_FILES',
          });
        }
        if (err.message && err.message.includes('Only image files')) {
          return next({
            status: 400,
            message: err.message,
            code: 'INVALID_FILE_TYPE',
          });
        }
        // Generic multer error
        return next({
          status: 400,
          message: err.message || 'File upload failed.',
          code: 'UPLOAD_ERROR',
        });
      }
      next();
    });
  };
};

module.exports = { handleMulterError };
