const mongoose = require('mongoose');
const environment = require('./environment');
const { logger, sendCriticalAlert } = require('../utils/logger');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRIES = Number(process.env.MONGODB_CONNECT_MAX_RETRIES || 6);
const BASE_DELAY_MS = Number(process.env.MONGODB_RETRY_BASE_DELAY_MS || 1000);

const connectDatabase = async () => {
  mongoose.connection.on('connected', () => {
    logger.info({
      message: 'MongoDB connected',
      context: {
        path: 'mongodb',
        method: 'CONNECT',
        statusCode: 200,
      },
    });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn({
      message: 'MongoDB disconnected',
      context: {
        path: 'mongodb',
        method: 'DISCONNECT',
        statusCode: 503,
      },
    });

    sendCriticalAlert({
      message: 'MongoDB disconnected',
      requestId: 'system',
      path: 'mongodb',
      errorCode: 'MONGODB_DISCONNECTED',
      statusCode: 503,
    }).catch(() => {});
  });

  mongoose.connection.on('error', (error) => {
    logger.error({
      message: 'MongoDB connection error',
      context: {
        path: 'mongodb',
        method: 'CONNECT',
        statusCode: 503,
      },
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
      },
    });
  });

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt += 1;

    try {
      await mongoose.connect(environment.mongodbUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      return mongoose.connection;
    } catch (error) {
      const backoffMs = BASE_DELAY_MS * 2 ** (attempt - 1);

      logger.error({
        message: `MongoDB connection attempt ${attempt} failed`,
        context: {
          path: 'mongodb',
          method: 'CONNECT',
          statusCode: 503,
          attempt,
          nextRetryInMs: backoffMs,
        },
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
      });

      if (attempt >= MAX_RETRIES) {
        sendCriticalAlert({
          message: 'MongoDB is down after max retries',
          requestId: 'system',
          path: 'mongodb',
          errorCode: 'MONGODB_UNAVAILABLE',
          statusCode: 503,
        }).catch(() => {});

        throw error;
      }

      await wait(backoffMs);
    }
  }

  return mongoose.connection;
};

module.exports = {
  connectDatabase,
};
