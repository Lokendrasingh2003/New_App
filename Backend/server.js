const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');
const environment = require('./config/environment');
const { connectDatabase } = require('./config/database');
const { logger, sendCriticalAlert } = require('./utils/logger');

const startServer = async () => {
  await connectDatabase();

  const server = http.createServer(app);

  server.listen(environment.port, () => {
    console.log(`Server running on port ${environment.port}`);
  });

  const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        console.error('Error during MongoDB shutdown:', error.message);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({
    message: 'Unhandled promise rejection',
    context: {
      path: 'process',
      method: 'UNHANDLED_REJECTION',
      statusCode: 500,
      requestId: 'system',
    },
    error: {
      message: reason?.message || String(reason),
      stack: reason?.stack,
      code: reason?.code,
    },
  });

  sendCriticalAlert({
    message: 'Unhandled promise rejection',
    requestId: 'system',
    path: 'process',
    errorCode: 'UNHANDLED_REJECTION',
    statusCode: 500,
  }).catch(() => {});
});

process.on('uncaughtException', (error) => {
  logger.error({
    message: 'Uncaught exception',
    context: {
      path: 'process',
      method: 'UNCAUGHT_EXCEPTION',
      statusCode: 500,
      requestId: 'system',
    },
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  });

  sendCriticalAlert({
    message: 'Uncaught exception',
    requestId: 'system',
    path: 'process',
    errorCode: 'UNCAUGHT_EXCEPTION',
    statusCode: 500,
  }).catch(() => {});
});
