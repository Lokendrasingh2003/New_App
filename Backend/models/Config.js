const mongoose = require('mongoose');

const configSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    category: {
      type: String,
      enum: ['GENERAL', 'PAYMENT', 'COMMISSION', 'DELIVERY', 'SUBSCRIPTION', 'OTP', 'CART', 'REVIEW', 'ORDER', 'REFUND'],
      default: 'GENERAL',
      index: true,
    },
    description: { type: String, default: null, trim: true },
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    lastModifiedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

configSchema.index({ category: 1, key: 1 });

configSchema.index({ lastModifiedAt: -1 });

const Config = mongoose.model('Config', configSchema);

module.exports = Config;
