const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['DEFAULT', 'SHOP_OVERRIDE'], required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', default: null, index: true },
    percentage: { type: Number, required: true, min: 1, max: 100 },
    effectiveFrom: { type: Date, required: true, index: true },
    effectiveTill: { type: Date, default: null },
  },
  { timestamps: true }
);

commissionSchema.index({ shopId: 1, effectiveFrom: -1 });
commissionSchema.index({ type: 1, effectiveFrom: -1 });

const Commission = mongoose.model('Commission', commissionSchema);

module.exports = Commission;
