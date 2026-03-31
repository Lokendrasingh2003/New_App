const { connectDatabase } = require('../config/database');
const Order = require('../models/Order');

(async () => {
  await connectDatabase();

  const result = await Order.updateMany(
    {
      status: 'CANCELLED',
      'payment.mode': 'COD',
      'payment.status': { $nin: ['FAILED', 'REFUNDED'] },
    },
    {
      $set: { 'payment.status': 'FAILED' },
    },
  );

  console.log(`Updated ${result.modifiedCount} cancelled COD orders to payment FAILED.`);
  process.exit(0);
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
