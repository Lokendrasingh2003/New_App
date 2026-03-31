const express = require('express');
const { getActiveBanners } = require('../controllers/bannersController');
const Banner = require('../models/Banner');

const router = express.Router();

// Debug endpoint to check database
router.get('/debug/count', async (req, res) => {
  try {
    const total = await Banner.countDocuments({});
    const active = await Banner.countDocuments({ isActive: true });
    const all = await Banner.find({}).lean();
    
    res.json({
      total,
      active,
      allBanners: all.map(b => ({
        id: b._id,
        title: b.title,
        isActive: b.isActive,
        imageUrl: b.imageUrl,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', getActiveBanners);

module.exports = router;
