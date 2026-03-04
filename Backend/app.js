require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const environment = require('./config/environment');
const { HTTP_STATUS, ERROR_CODES } = require('./config/constants');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { NotFoundError } = require('./utils/errors');
const { setupSwagger } = require('./swagger');

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (Array.isArray(environment.corsOrigins) && environment.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (origin === environment.corsOrigin) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true,
  })
);

if (environment.nodeEnv === 'production') {
  app.use((req, res, next) => {
    const forwardedProto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    const isSecure = req.secure || forwardedProto === 'https';

    if (!isSecure) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'HTTPS is required in production.',
        code: ERROR_CODES.PERMISSION_DENIED,
      });
    }

    return next();
  });
}
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use('/uploads', express.static('uploads'));

app.get('/health', (_req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {},
    message: 'CityConnect backend is healthy',
  });
});

app.use('/api', apiRoutes);
setupSwagger(app);

app.use((req, _res, next) => {
  next(
    new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`, {
      route: req.originalUrl,
      method: req.method,
      fallbackCode: ERROR_CODES.ROUTE_NOT_FOUND,
    })
  );
});

app.use(errorHandler);

module.exports = app;
