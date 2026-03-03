const express = require('express');
const { getCities, getCityById, getCityStats } = require('../controllers/citiesController');
const { getCityShops } = require('../controllers/shopsController');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Cities
 *     description: City and discovery APIs
 */

/**
 * @swagger
 * /api/cities:
 *   get:
 *     summary: List cities
 *     tags: [Cities]
 *     responses:
 *       200:
 *         description: Cities listed
 */

/**
 * @swagger
 * /api/cities/{cityId}/shops:
 *   get:
 *     summary: Get shops for a city
 *     tags: [Cities]
 *     parameters:
 *       - in: path
 *         name: cityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: City shops listed
 */

router.get('/', getCities);
router.get('/:cityId', getCityById);
router.get('/:cityId/stats', getCityStats);
router.get('/:cityId/shops', getCityShops);

module.exports = router;
