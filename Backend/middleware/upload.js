const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ensureUploadDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const createImageStorage = (uploadDir) => {
  ensureUploadDirExists(uploadDir);

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });
};

const imageFilter = (_req, file, cb) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(
      new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Only image files (JPEG, PNG, WebP, GIF) are allowed.',
        ERROR_CODES.VALIDATION_ERROR
      )
    );
  } else {
    cb(null, true);
  }
};

const createImageUploadMiddleware = (uploadDir) => {
  const storage = createImageStorage(uploadDir);

  return multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
    },
  });
};

const handleUploadError = (error, _req, _res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(
        new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          'Only one file can be uploaded.',
          ERROR_CODES.VALIDATION_ERROR
        )
      );
    }
  }

  if (error instanceof ApiError) {
    return next(error);
  }

  next(error);
};

module.exports = {
  createImageUploadMiddleware,
  handleUploadError,
};
