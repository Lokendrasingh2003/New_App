/**
 * One-time migration: Set payment.status = SUCCESS for all delivered COD orders
 * that still have payment.status = PENDING.
 *
 * Usage: node scripts/fixDeliveredCodPayments.js
 */

const { connectDatabase } = require('../config/database');
const Order = require('../models/Order');

const run = async () => {
  await connectDatabase();

  const result = await Order.updateMany(
    {
      status: 'DELIVERED',
      'payment.mode': 'COD',
      'payment.status': { $ne: 'SUCCESS' },
    },
    {
      $set: {
        'payment.status': 'SUCCESS',
        'payment.paidAt': new Date(),
      },
    },
  );

  console.log(`Updated ${result.modifiedCount} delivered COD orders to payment SUCCESS.`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
