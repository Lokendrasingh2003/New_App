const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema(
  {
    percentage: { type: Number, default: 3, min: 0, max: 100 },
    amount: { type: Number, required: true, min: 0 },
    payableAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shopkeeperPaymentSchema = new mongoose.Schema(
  {
    shopkeeperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shopkeeper', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['COD', 'ONLINE'], required: true, index: true },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING', index: true },
    transactionId: { type: String, default: null, trim: true, index: true },
    commission: { type: commissionSchema, required: true },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shopkeeperPaymentSchema.index({ shopkeeperId: 1, status: 1, createdAt: -1 });
shopkeeperPaymentSchema.index({ shopkeeperId: 1, processedAt: -1 });
shopkeeperPaymentSchema.index({ shopkeeperId: 1, transactionId: 1 });

const ShopkeeperPayment = mongoose.model('ShopkeeperPayment', shopkeeperPaymentSchema);

module.exports = ShopkeeperPayment;
