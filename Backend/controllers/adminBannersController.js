const Banner = require('../models/Banner');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const buildBannerPayload = (input) => ({
  title: String(input.title || '').trim(),
  imageUrl: String(input.imageUrl || '').trim(),
  redirectUrl: input.redirectUrl ? String(input.redirectUrl).trim() : null,
  description: input.description ? String(input.description).trim() : null,
  position: parseIntSafe(input.position, 0),
  isActive: input.isActive !== undefined ? Boolean(input.isActive) : true,
  bannerType: ['PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED'].includes(input.bannerType)
    ? input.bannerType
    : 'GENERAL',
  targetAudience: ['ALL', 'NEW_USERS', 'RETURNING_USERS'].includes(input.targetAudience)
    ? input.targetAudience
    : 'ALL',
  startDate: input.startDate ? new Date(input.startDate) : null,
  endDate: input.endDate ? new Date(input.endDate) : null,
});

/**
 * Upload banner image
 */
const uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'No image file provided.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    console.log('[Banner Upload] File received:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    const imageUrl = `/uploads/banners/${req.file.filename}`;

    console.log('[Banner Upload] Sending response with imageUrl:', imageUrl);

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Image uploaded successfully',
      data: {
        imageUrl,
        filename: req.file.filename,
      },
    });
  } catch (error) {
    console.error('[Banner Upload] Error:', error.message);
    next(error);
  }
};

/**
 * Create a new banner
 */
const createBanner = async (req, res, next) => {
  try {
    const actor = buildActorFromRequest(req);
    const metadata = buildMetadataFromRequest(req);

    const payload = buildBannerPayload(req.body);

    // Validate dates
    if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Start date must be before end date.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const banner = new Banner(payload);
    banner.createdBy = req.user._id;
    banner.updatedBy = req.user._id;

    await banner.save();

    await logAudit({
      eventType: AUDIT_EVENT_TYPES.BANNER_CREATED,
      actor,
      entityType: 'Banner',
      entityId: banner._id,
      changes: payload,
      metadata,
    });

    sendSuccess(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Banner created successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all banners with pagination and filters
 */
const listBanners = async (req, res, next) => {
  try {
    const limit = parseIntSafe(req.query.limit, 20);
    const offset = parseIntSafe(req.query.offset, 0);
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
    const bannerType = req.query.bannerType ? String(req.query.bannerType).trim() : undefined;
    const sortBy = req.query.sortBy || 'position';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    if (bannerType && ['PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED'].includes(bannerType)) {
      query.bannerType = bannerType;
    }

    const banners = await Banner.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await Banner.countDocuments(query);

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Banners retrieved successfully',
      data: {
        banners,
        pagination: { offset, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get banner by ID
 */
const getBannerById = async (req, res, next) => {
  try {
    const { bannerId } = req.params;

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Banner not found.', ERROR_CODES.NOT_FOUND);
    }

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Banner retrieved successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update banner
 */
const updateBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const actor = buildActorFromRequest(req);
    const metadata = buildMetadataFromRequest(req);

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Banner not found.', ERROR_CODES.NOT_FOUND);
    }

    const payload = buildBannerPayload(req.body);

    // Validate dates
    if (payload.startDate && payload.endDate && payload.startDate > payload.endDate) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Start date must be before end date.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const changes = {};
    Object.keys(payload).forEach((key) => {
      if (banner[key] !== payload[key]) {
        changes[key] = { old: banner[key], new: payload[key] };
        banner[key] = payload[key];
      }
    });

    banner.updatedBy = req.user._id;
    banner.updatedAt = new Date();

    await banner.save();

    if (Object.keys(changes).length > 0) {
      await logAudit({
        eventType: AUDIT_EVENT_TYPES.BANNER_UPDATED,
        actor,
        entityType: 'Banner',
        entityId: banner._id,
        changes,
        metadata,
      });
    }

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Banner updated successfully',
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle banner active status
 */
const toggleBannerActive = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const { isActive } = req.body;
    const actor = buildActorFromRequest(req);
    const metadata = buildMetadataFromRequest(req);

    const banner = await Banner.findById(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Banner not found.', ERROR_CODES.NOT_FOUND);
    }

    const oldValue = banner.isActive;
    banner.isActive = Boolean(isActive);
    banner.updatedBy = req.user._id;
    banner.updatedAt = new Date();

    await banner.save();

    await logAudit({
      eventType: AUDIT_EVENT_TYPES.BANNER_UPDATED,
      actor,
      entityType: 'Banner',
      entityId: banner._id,
      changes: { isActive: { old: oldValue, new: banner.isActive } },
      metadata,
    });

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
      data: banner,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete banner
 */
const deleteBanner = async (req, res, next) => {
  try {
    const { bannerId } = req.params;
    const actor = buildActorFromRequest(req);
    const metadata = buildMetadataFromRequest(req);

    const banner = await Banner.findByIdAndDelete(bannerId);
    if (!banner) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Banner not found.', ERROR_CODES.NOT_FOUND);
    }

    await logAudit({
      eventType: AUDIT_EVENT_TYPES.BANNER_DELETED,
      actor,
      entityType: 'Banner',
      entityId: banner._id,
      changes: { deleted: banner },
      metadata,
    });

    sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Banner deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadBannerImage,
  createBanner,
  listBanners,
  getBannerById,
  updateBanner,
  toggleBannerActive,
  deleteBanner,
};
