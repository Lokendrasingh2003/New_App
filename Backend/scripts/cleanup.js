const { ensureDbConnection, closeDbConnection, MODELS } = require('./_shared');

const cleanupDatabase = async () => {
  await ensureDbConnection();

  const { Cart, User, AuditLog, Product } = MODELS;

  const now = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [expiredCarts, expiredOtps, oldAuditLogs, oldSoftDeletedProducts] = await Promise.all([
    Cart.deleteMany({ expiresAt: { $lt: now } }),
    User.updateMany(
      {
        otp: { $ne: null },
        otpExpiresAt: { $lt: now },
      },
      {
        $set: {
          otp: null,
          otpExpiresAt: null,
        },
      }
    ),
    AuditLog.deleteMany({ createdAt: { $lt: ninetyDaysAgo } }),
    Product.deleteMany({
      isDeleted: true,
      deletedAt: { $lt: thirtyDaysAgo },
    }),
  ]);

  return {
    deletedExpiredCarts: expiredCarts.deletedCount || 0,
    clearedExpiredOtps: expiredOtps.modifiedCount || 0,
    deletedOldAuditLogs: oldAuditLogs.deletedCount || 0,
    deletedSoftDeletedProducts: oldSoftDeletedProducts.deletedCount || 0,
  };
};

if (require.main === module) {
  cleanupDatabase()
    .then((result) => {
      console.log('Cleanup completed');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('cleanup failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  cleanupDatabase,
};
