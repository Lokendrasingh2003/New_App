const { ensureDbConnection, closeDbConnection, MODELS } = require('./_shared');

const findOrphanStats = async () => {
  const { Order, User, Shop, Product, ProductReview, City } = MODELS;

  const [userIds, shopIds, productIds, orderIds, cityIds] = await Promise.all([
    User.distinct('_id'),
    Shop.distinct('_id'),
    Product.distinct('_id'),
    Order.distinct('_id'),
    City.distinct('_id'),
  ]);

  const [ordersMissingUser, ordersMissingShop, ordersMissingCity, reviewsMissingProduct, reviewsMissingOrder] =
    await Promise.all([
      Order.countDocuments({ userId: { $nin: userIds } }),
      Order.countDocuments({ shopId: { $nin: shopIds } }),
      Order.countDocuments({ cityId: { $nin: cityIds } }),
      ProductReview.countDocuments({ productId: { $nin: productIds } }),
      ProductReview.countDocuments({ orderId: { $nin: orderIds } }),
    ]);

  return {
    ordersMissingUser,
    ordersMissingShop,
    ordersMissingCity,
    reviewsMissingProduct,
    reviewsMissingOrder,
  };
};

const getDbStats = async () => {
  const connection = await ensureDbConnection();
  const collectionStats = {};

  for (const [name, model] of Object.entries(MODELS)) {
    const count = await model.estimatedDocumentCount();
    const indexes = await model.collection.indexes();

    collectionStats[name] = {
      collection: model.collection.name,
      count,
      indexes,
    };
  }

  const dbStats = await connection.db.stats();
  const orphaned = await findOrphanStats();

  return {
    storage: {
      dataSize: dbStats.dataSize,
      storageSize: dbStats.storageSize,
      collections: dbStats.collections,
      indexes: dbStats.indexes,
      indexSize: dbStats.indexSize,
    },
    collections: collectionStats,
    orphaned,
  };
};

if (require.main === module) {
  getDbStats()
    .then((result) => {
      console.log('Database stats');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('db-stats failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  getDbStats,
};
