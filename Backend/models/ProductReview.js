const mongoose = require('mongoose');
const Product = require('./Product');
const Shop = require('./Shop');

const helpfulVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['UP', 'DOWN'], required: true },
  },
  { _id: false }
);

const productReviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 3,
        message: 'Maximum 3 images are allowed.',
      },
    },
    helpful: {
      upCount: { type: Number, default: 0 },
      downCount: { type: Number, default: 0 },
    },
    helpfulVotes: {
      type: [helpfulVoteSchema],
      default: [],
    },
    verified: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

productReviewSchema.index({ productId: 1, rating: 1, isPublished: 1, createdAt: -1 });
productReviewSchema.index({ productId: 1, isPublished: 1, createdAt: -1 });
productReviewSchema.index({ userId: 1, createdAt: -1 });
productReviewSchema.index({ productId: 1, userId: 1, isPublished: 1 });

const recomputeProductStats = async (productId) => {
  if (!productId) {
    return;
  }

  const result = await mongoose.model('ProductReview').aggregate([
    {
      $match: {
        productId: new mongoose.Types.ObjectId(String(productId)),
        verified: true,
        isPublished: true,
      },
    },
    {
      $group: {
        _id: '$productId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { averageRating: 0, reviewCount: 0 };

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        rating: Number((stats.averageRating || 0).toFixed(2)),
        reviewCount: stats.reviewCount || 0,
      },
    }
  );
};

const recomputeShopReviewStats = async (shopId) => {
  if (!shopId) {
    return;
  }

  const result = await mongoose.model('ProductReview').aggregate([
    {
      $match: {
        shopId: new mongoose.Types.ObjectId(String(shopId)),
        verified: true,
        isPublished: true,
      },
    },
    {
      $group: {
        _id: '$shopId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { averageRating: 0, reviewCount: 0 };

  await Shop.updateOne(
    { _id: shopId },
    {
      $set: {
        'stats.rating': Number((stats.averageRating || 0).toFixed(2)),
        'stats.reviewCount': stats.reviewCount || 0,
        'cachedStats.lastUpdated': null,
      },
    }
  );
};

productReviewSchema.post('save', async function postSave(_doc, next) {
  try {
    await recomputeProductStats(this.productId);
    await recomputeShopReviewStats(this.shopId);
    next();
  } catch (error) {
    next(error);
  }
});

productReviewSchema.post('findOneAndDelete', async function postDelete(doc, next) {
  try {
    if (doc?.productId) {
      await recomputeProductStats(doc.productId);
      await recomputeShopReviewStats(doc.shopId);
    }
    next();
  } catch (error) {
    next(error);
  }
});

productReviewSchema.post('findOneAndUpdate', async function postUpdate(doc, next) {
  try {
    if (doc?.productId) {
      await recomputeProductStats(doc.productId);
      await recomputeShopReviewStats(doc.shopId);
    }
    next();
  } catch (error) {
    next(error);
  }
});

productReviewSchema.statics.recomputeProductStats = recomputeProductStats;
productReviewSchema.statics.recomputeShopReviewStats = recomputeShopReviewStats;

const ProductReview = mongoose.model('ProductReview', productReviewSchema);

module.exports = ProductReview;
