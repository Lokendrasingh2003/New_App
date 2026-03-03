const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, default: null, trim: true },
    ifscCode: { type: String, default: null, trim: true, uppercase: true },
    bankName: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const payoutSchema = new mongoose.Schema(
  {
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    ordersProcessed: { type: Number, required: true, min: 0, default: 0 },
    grossAmount: { type: Number, required: true, min: 0, default: 0 },
    commission: { type: Number, required: true, min: 0, default: 0 },
    payableAmount: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    transactionRef: { type: String, default: null, trim: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

payoutSchema.index({ shopId: 1, status: 1, periodStart: -1 });
payoutSchema.index({ shopId: 1, periodStart: -1, periodEnd: -1 }, { unique: true });

const Payout = mongoose.model('Payout', payoutSchema);

module.exports = Payout;
