const mongoose = require('mongoose');

const refundStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: null, trim: true },
    processedBy: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const refundSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
      default: 'REQUESTED',
      index: true,
    },
    statusHistory: { type: [refundStatusHistorySchema], default: [] },
    bankDetails: {
      accountNumber: { type: String, default: null, trim: true },
      ifscCode: { type: String, default: null, trim: true, uppercase: true },
      bankName: { type: String, default: null, trim: true },
    },
    transactionRef: { type: String, default: null, trim: true },
    processedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ shopId: 1, createdAt: -1 });
refundSchema.index({ orderId: 1, status: 1 });

const Refund = mongoose.model('Refund', refundSchema);

module.exports = Refund;
