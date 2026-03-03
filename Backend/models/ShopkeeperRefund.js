const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    accountNumber: { type: String, default: null, trim: true },
    ifscCode: { type: String, default: null, trim: true, uppercase: true },
    bankName: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      required: true,
    },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: null, trim: true },
  },
  { _id: false }
);

const shopkeeperRefundSchema = new mongoose.Schema(
  {
    shopkeeperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ShopkeeperPayment', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refundAmount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'REQUESTED',
      index: true,
    },
    refundMode: {
      type: String,
      enum: ['BANK_TRANSFER', 'UPI', 'WALLET'],
      required: true,
    },
    bankDetails: { type: bankDetailsSchema, default: () => ({}) },
    transactionRef: { type: String, default: null, trim: true },
    processedAt: { type: Date, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

shopkeeperRefundSchema.index({ shopkeeperId: 1, status: 1, createdAt: -1 });

const ShopkeeperRefund = mongoose.model('ShopkeeperRefund', shopkeeperRefundSchema);

module.exports = ShopkeeperRefund;
