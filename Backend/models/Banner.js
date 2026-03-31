const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    redirectUrl: {
      type: String,
      default: null,
      trim: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    position: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    bannerType: {
      type: String,
      enum: ['PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED'],
      default: 'GENERAL',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['ALL', 'NEW_USERS', 'RETURNING_USERS'],
      default: 'ALL',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

bannerSchema.index({ isActive: 1, position: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
bannerSchema.index({ bannerType: 1, isActive: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;
