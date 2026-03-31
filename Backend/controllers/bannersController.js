const Banner = require('../models/Banner');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Get active banners for public display
 */
const getActiveBanners = async (req, res, next) => {
  try {
    const now = new Date();
    console.log('[GetActiveBanners] Current time:', now);

    // First, let's check how many total banners exist
    const totalBanners = await Banner.countDocuments({});
    console.log('[GetActiveBanners] Total banners in DB:', totalBanners);

    // Check active banners
    const activeBanners = await Banner.countDocuments({ isActive: true });
    console.log('[GetActiveBanners] Active banners in DB:', activeBanners);

    const banners = await Banner.find({
      isActive: true,
      // TODO: Add date range filtering if needed
      // $or: [
      //   { startDate: null, endDate: null },
      //   { startDate: { $lte: now }, endDate: null },
      //   { startDate: null, endDate: { $gte: now } },
      //   { startDate: { $lte: now }, endDate: { $gte: now } },
      // ],
    })
      .sort({ position: 1 })
      .lean();

    console.log('[GetActiveBanners] Banners matching date criteria:', banners.length);
    if (banners.length > 0) {
      console.log('[GetActiveBanners] First banner:', JSON.stringify(banners[0], null, 2));
    }

    const formattedBanners = banners.map((banner) => ({
      id: String(banner._id),
      imageUrl: banner.imageUrl,
      redirectUrl: banner.redirectUrl,
      title: banner.title,
      description: banner.description,
    }));

    console.log('[GetActiveBanners] Sending response with', formattedBanners.length, 'banners');
    const responsePayload = {
      statusCode: HTTP_STATUS.OK,
      message: 'Banners retrieved successfully',
      data: { banners: formattedBanners },
    };
    console.log('[GetActiveBanners] Response payload:', JSON.stringify(responsePayload, null, 2));

    sendSuccess(res, responsePayload);
  } catch (error) {
    console.error('[GetActiveBanners] Error:', error.message);
    next(error);
  }
};

module.exports = {
  getActiveBanners,
};
