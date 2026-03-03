const express = require('express');
const { validateOfferApplicableQuery } = require('../middleware/validation');
const { getApplicableOffers } = require('../controllers/offersController');

const router = express.Router();

router.get('/applicable', validateOfferApplicableQuery(), getApplicableOffers);

module.exports = router;
