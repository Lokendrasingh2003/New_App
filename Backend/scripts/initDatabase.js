const { MODELS, ensureDbConnection, closeDbConnection } = require('./_shared');
const { seedMinimalDatabase } = require('./seedMinimalDatabase');

const isDevelopment = () => (process.env.NODE_ENV || 'development') === 'development';
const isStaging = () => (process.env.NODE_ENV || '').toLowerCase() === 'staging';

const dropExistingCollections = async (connection) => {
  await connection.db.dropDatabase();
};

const createCollectionsAndIndexes = async () => {
  for (const model of Object.values(MODELS)) {
    await model.createCollection().catch(() => {});
    await model.init();
  }
};

const verifyData = async () => {
  const counts = {};
  for (const [name, model] of Object.entries(MODELS)) {
    counts[name] = await model.estimatedDocumentCount();
  }

  return { counts };
};

const initDatabase = async () => {
  const connection = await ensureDbConnection();
  const mode = process.env.NODE_ENV || 'development';

  if (isDevelopment()) {
    console.log('Development mode: dropping existing collections...');
    await dropExistingCollections(connection);
  }

  console.log('Creating collections and indexes...');
  await createCollectionsAndIndexes();

  if (isDevelopment() || isStaging()) {
    console.log(`Seeding minimal non-demo data for ${mode} mode...`);
    await seedMinimalDatabase();
  } else {
    console.log('Production mode: skipping seed data.');
  }

  const verification = await verifyData();
  return {
    mode,
    seeded: isDevelopment() || isStaging(),
    verification,
  };
};

if (require.main === module) {
  initDatabase()
    .then((result) => {
      console.log('Database initialization completed');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  initDatabase,
};
