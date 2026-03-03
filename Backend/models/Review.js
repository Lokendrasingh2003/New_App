const mongoose = require('mongoose');
const Shop = require('./Shop');

const reviewSchema = new mongoose.Schema(
  {
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
    comment: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ shopId: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, createdAt: -1 });

const recomputeShopStats = async (shopId) => {
  if (!shopId) {
    return;
  }

  const result = await mongoose.model('Review').aggregate([
    { $match: { shopId: new mongoose.Types.ObjectId(String(shopId)) } },
    {
      $group: {
        _id: '$shopId',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { averageRating: 0, reviewCount: 0 };
  const averageRating = Number((stats.averageRating || 0).toFixed(2));

  await Shop.updateOne(
    { _id: shopId },
    {
      $set: {
        'stats.rating': averageRating,
        'stats.reviewCount': stats.reviewCount || 0,
      },
    }
  );
};

reviewSchema.post('save', async function onSave(_doc, next) {
  try {
    await recomputeShopStats(this.shopId);
    next();
  } catch (error) {
    next(error);
  }
});

reviewSchema.post('findOneAndDelete', async function onDelete(doc, next) {
  try {
    if (doc?.shopId) {
      await recomputeShopStats(doc.shopId);
    }
    next();
  } catch (error) {
    next(error);
  }
});

reviewSchema.statics.recomputeShopStats = recomputeShopStats;

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
