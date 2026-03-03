const mongoose = require('mongoose');

const paymentCommissionSchema = new mongoose.Schema(
  {
    percentage: { type: Number, required: true, min: 1, max: 100 },
    amount: { type: Number, required: true, min: 0 },
    calculatedAt: { type: Date, required: true },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shopId: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'PENDING', index: true },
    method: { type: String, enum: ['COD', 'ONLINE'], required: true, index: true },
    transactionId: { type: String, default: null, trim: true },
    paymentGatewayResponse: { type: mongoose.Schema.Types.Mixed, default: {} },
    commission: { type: paymentCommissionSchema, required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ shopId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
