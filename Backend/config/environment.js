const dotenv = require('dotenv');

dotenv.config();

const requiredVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'NODE_ENV', 'CORS_ORIGIN', 'API_BASE_URL'];

for (const envKey of requiredVars) {
  if (!process.env[envKey]) {
    throw new Error(`Missing required environment variable: ${envKey}`);
  }
}

const environment = {
  port: Number(process.env.PORT) || 5000,
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  userJwtSecret: process.env.USER_JWT_SECRET || process.env.JWT_SECRET,
  shopkeeperJwtSecret: process.env.SHOPKEEPER_JWT_SECRET || process.env.JWT_SECRET,
  adminJwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
  userRefreshJwtSecret: process.env.USER_REFRESH_JWT_SECRET || process.env.USER_JWT_SECRET || process.env.JWT_SECRET,
  shopkeeperRefreshJwtSecret:
    process.env.SHOPKEEPER_REFRESH_JWT_SECRET || process.env.SHOPKEEPER_JWT_SECRET || process.env.JWT_SECRET,
  adminRefreshJwtSecret: process.env.ADMIN_REFRESH_JWT_SECRET || process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV,
  corsOrigin: process.env.CORS_ORIGIN,
  corsOrigins: String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
  apiBaseUrl: process.env.API_BASE_URL,
};

module.exports = environment;
