const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deliveryAvailable: {
      type: Boolean,
      default: true,
    },
    shopCount: {
      type: Number,
      default: 0,
    },
    populationEstimate: {
      type: Number,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

citySchema.index({ isActive: 1, createdAt: -1 });
citySchema.index({ createdAt: -1 });

const City = mongoose.model('City', citySchema);

module.exports = City;
