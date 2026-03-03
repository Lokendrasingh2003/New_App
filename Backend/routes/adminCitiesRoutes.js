const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminCityCreate,
  validateAdminCityUpdate,
  validateAdminCitiesListQuery,
  validateAdminCityIdParam,
  validateAdminCityToggleActive,
  validateAdminCityToggleDelivery,
} = require('../middleware/validation');
const {
  createCity,
  listCities,
  getCityById,
  updateCity,
  toggleCityActive,
  toggleCityDelivery,
  getCityStats,
} = require('../controllers/adminCitiesController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.post('/', validateAdminCityCreate(), createCity);
router.get('/', validateAdminCitiesListQuery(), listCities);
router.get('/:cityId', validateAdminCityIdParam(), getCityById);
router.put('/:cityId', validateAdminCityIdParam(), validateAdminCityUpdate(), updateCity);
router.patch('/:cityId/toggle-active', validateAdminCityIdParam(), validateAdminCityToggleActive(), toggleCityActive);
router.patch(
  '/:cityId/toggle-delivery',
  validateAdminCityIdParam(),
  validateAdminCityToggleDelivery(),
  toggleCityDelivery
);
router.get('/:cityId/stats', validateAdminCityIdParam(), getCityStats);

module.exports = router;
