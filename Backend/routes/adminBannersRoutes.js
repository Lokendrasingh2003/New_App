const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  validateAdminBannerCreate,
  validateAdminBannerUpdate,
  validateAdminBannersListQuery,
  validateAdminBannerIdParam,
  validateAdminBannerToggleActive,
} = require('../middleware/validation');
const {
  uploadBannerImage,
  createBanner,
  listBanners,
  getBannerById,
  updateBanner,
  toggleBannerActive,
  deleteBanner,
} = require('../controllers/adminBannersController');

const router = express.Router();

// DEBUG: Test endpoint to verify routing works
router.get('/test-routes', (req, res) => {
  res.json({
    success: true,
    message: 'Admin banner routes are loaded and working',
    routes: [
      'GET /api/admin/banners/test-routes',
      'POST /api/admin/banners/upload',
      'GET /api/admin/banners',
      'POST /api/admin/banners',
      'GET /api/admin/banners/:bannerId',
      'PUT /api/admin/banners/:bannerId',
      'DELETE /api/admin/banners/:bannerId',
      'PATCH /api/admin/banners/:bannerId/toggle-active',
    ],
  });
});

// Configure multer for banner image uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'banners');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

const bannerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Multer error wrapper
const handleUploadErrors = (req, res, next) => {
  bannerUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
        code: 'UPLOAD_ERROR',
      });
    }
    next();
  });
};

// Upload image endpoint (no other middleware before multer)
router.post('/upload', verifySuperAdmin, requireAdmin, handleUploadErrors, uploadBannerImage);

// All other routes with auth
router.use(verifySuperAdmin, requireAdmin);

router.post('/', validateAdminBannerCreate(), createBanner);
router.get('/', validateAdminBannersListQuery(), listBanners);
router.get('/:bannerId', validateAdminBannerIdParam(), getBannerById);
router.put('/:bannerId', validateAdminBannerIdParam(), validateAdminBannerUpdate(), updateBanner);
router.delete('/:bannerId', validateAdminBannerIdParam(), deleteBanner);
router.patch('/:bannerId/toggle-active', validateAdminBannerIdParam(), validateAdminBannerToggleActive(), toggleBannerActive);

module.exports = router;
