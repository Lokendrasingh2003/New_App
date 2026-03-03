const express = require('express');
const { verifyUserToken } = require('../middleware/auth');
const {
  validateReviewIdParam,
  validateReviewUpdate,
  validateReviewHelpful,
} = require('../middleware/validation');
const { updateReview, deleteReview, voteReviewHelpful } = require('../controllers/reviewsController');

const router = express.Router();

router.use(verifyUserToken);

router.put('/:reviewId', validateReviewIdParam(), validateReviewUpdate(), updateReview);
router.delete('/:reviewId', validateReviewIdParam(), deleteReview);
router.post('/:reviewId/helpful', validateReviewIdParam(), validateReviewHelpful(), voteReviewHelpful);

module.exports = router;
