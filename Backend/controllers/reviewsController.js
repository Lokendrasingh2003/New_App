const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductReview = require('../models/ProductReview');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES, ORDER_STATUS } = require('../config/constants');

const EDIT_DELETE_WINDOW_DAYS = 7;
const EDIT_DELETE_WINDOW_MS = EDIT_DELETE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const isWithinWindow = (dateValue) => {
  if (!dateValue) {
    return false;
  }

  const created = new Date(dateValue).getTime();
  return Date.now() - created <= EDIT_DELETE_WINDOW_MS;
};

const getReviewSort = (sort) => {
  if (sort === 'helpful') {
    return { 'helpful.upCount': -1, createdAt: -1 };
  }

  if (sort === 'rating') {
    return { rating: -1, createdAt: -1 };
  }

  return { createdAt: -1 };
};

const toReviewResponse = (review) => ({
  id: review._id,
  productId: review.productId,
  user: {
    id: review.userId,
    name: review.userName,
  },
  orderId: review.orderId,
  shopId: review.shopId,
  rating: review.rating,
  title: review.title,
  reviewText: review.reviewText,
  images: review.images || [],
  helpful: {
    upCount: Number(review.helpful?.upCount || 0),
    downCount: Number(review.helpful?.downCount || 0),
  },
  verified: Boolean(review.verified),
  isPublished: Boolean(review.isPublished),
  createdAt: review.createdAt,
  updatedAt: review.updatedAt,
});

const ensureDeliveredOrderForProduct = async ({ userId, productId, orderId }) => {
  const order = await Order.findOne({
    _id: orderId,
    userId,
    status: ORDER_STATUS.DELIVERED,
    'items.productId': productId,
  });

  if (!order) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Delivered order for this product is required to review.',
      ERROR_CODES.REVIEW_ORDER_NOT_ELIGIBLE
    );
  }

  return order;
};

const createProductReview = async (req, res) => {
  const { productId } = req.params;
  const { rating, title, reviewText, images, orderId } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const product = await Product.findOne({ _id: productId, active: true });
  if (!product) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  await ensureDeliveredOrderForProduct({
    userId: req.user.id,
    productId,
    orderId,
  });

  const existing = await ProductReview.findOne({
    productId,
    userId: req.user.id,
    isPublished: true,
  });

  if (existing) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      'Only one active review is allowed per product.',
      ERROR_CODES.REVIEW_ALREADY_EXISTS
    );
  }

  const user = await User.findById(req.user.id).lean();
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  const review = await ProductReview.create({
    productId,
    userId: req.user.id,
    orderId,
    shopId: product.shopId,
    userName: user.name || `User-${String(user._id).slice(-4)}`,
    rating,
    title,
    reviewText,
    images: images || [],
    helpful: {
      upCount: 0,
      downCount: 0,
    },
    verified: true,
    isPublished: true,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Review created successfully.',
    data: {
      review: toReviewResponse(review),
    },
  });
};

const getProductReviews = async (req, res) => {
  const { productId } = req.params;

  if (!mongoose.isValidObjectId(productId)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const productExists = await Product.exists({ _id: productId, active: true });
  if (!productExists) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Product not found.', ERROR_CODES.PRODUCT_NOT_FOUND);
  }

  const sort = String(req.query.sort || 'recent').toLowerCase();
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const baseFilter = {
    productId,
    isPublished: true,
  };

  const [reviews, total] = await Promise.all([
    ProductReview.find(baseFilter).sort(getReviewSort(sort)).skip(offset).limit(limit).lean(),
    ProductReview.countDocuments(baseFilter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Product reviews fetched successfully.',
    data: {
      reviews: reviews.map((review) => toReviewResponse(review)),
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getMyReviews = async (req, res) => {
  const reviews = await ProductReview.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'My reviews fetched successfully.',
    data: {
      reviews: reviews.map((review) => toReviewResponse(review)),
    },
  });
};

const updateReview = async (req, res) => {
  const { reviewId } = req.params;
  const { rating, title, reviewText, images } = req.body;

  const review = await ProductReview.findOne({ _id: reviewId, userId: req.user.id });
  if (!review) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found.', ERROR_CODES.REVIEW_NOT_FOUND);
  }

  if (!isWithinWindow(review.createdAt)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Review update window has expired after 7 days.',
      ERROR_CODES.REVIEW_EDIT_WINDOW_EXPIRED
    );
  }

  review.rating = rating;
  review.title = title;
  review.reviewText = reviewText;
  review.images = images || [];

  await review.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Review updated successfully.',
    data: {
      review: toReviewResponse(review),
    },
  });
};

const deleteReview = async (req, res) => {
  const { reviewId } = req.params;

  const review = await ProductReview.findOne({ _id: reviewId, userId: req.user.id });
  if (!review) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found.', ERROR_CODES.REVIEW_NOT_FOUND);
  }

  if (isWithinWindow(review.createdAt)) {
    await ProductReview.deleteOne({ _id: review._id });

    await ProductReview.recomputeProductStats(review.productId);

    return sendSuccess(res, {
      statusCode: HTTP_STATUS.OK,
      message: 'Review deleted successfully.',
      data: {},
    });
  }

  review.isPublished = false;
  await review.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Review cannot be deleted after 7 days. It has been unpublished.',
    data: {},
  });
};

const voteReviewHelpful = async (req, res) => {
  const { reviewId } = req.params;
  const { helpful } = req.body;

  const review = await ProductReview.findOne({ _id: reviewId, isPublished: true });
  if (!review) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Review not found.', ERROR_CODES.REVIEW_NOT_FOUND);
  }

  const nextVote = helpful ? 'UP' : 'DOWN';
  const existingVote = (review.helpfulVotes || []).find(
    (vote) => String(vote.userId) === String(req.user.id)
  );

  if (existingVote) {
    if (existingVote.vote === nextVote) {
      return sendSuccess(res, {
        statusCode: HTTP_STATUS.OK,
        message: 'Helpful vote already recorded.',
        data: {
          review: toReviewResponse(review),
        },
      });
    }

    if (existingVote.vote === 'UP') {
      review.helpful.upCount = Math.max(0, Number(review.helpful.upCount || 0) - 1);
    } else {
      review.helpful.downCount = Math.max(0, Number(review.helpful.downCount || 0) - 1);
    }

    existingVote.vote = nextVote;
  } else {
    review.helpfulVotes.push({
      userId: req.user.id,
      vote: nextVote,
    });
  }

  if (nextVote === 'UP') {
    review.helpful.upCount = Number(review.helpful.upCount || 0) + 1;
  } else {
    review.helpful.downCount = Number(review.helpful.downCount || 0) + 1;
  }

  await review.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Helpful vote updated successfully.',
    data: {
      review: toReviewResponse(review),
    },
  });
};

module.exports = {
  createProductReview,
  getProductReviews,
  getMyReviews,
  updateReview,
  deleteReview,
  voteReviewHelpful,
};
