const mongoose = require('mongoose');
const { connectDatabase } = require('../../config/database');

const setupTestDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await connectDatabase();
  }
};

const clearTestDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const collections = mongoose.connection.collections;
  const promises = Object.values(collections).map((collection) => collection.deleteMany({}));
  await Promise.all(promises);
};

const closeTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

module.exports = {
  setupTestDB,
  clearTestDB,
  closeTestDB,
};
