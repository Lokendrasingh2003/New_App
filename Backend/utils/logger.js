const fs = require('fs');
const path = require('path');
const winston = require('winston');
const axios = require('axios');
const environment = require('../config/environment');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const accessOnly = winston.format((info) => {
  if (info?.context?.type === 'access') {
    return info;
  }

  return false;
});

const nonAccessOnly = winston.format((info) => {
  if (info?.context?.type === 'access') {
    return false;
  }

  return info;
});

const transports = [
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(nonAccessOnly(), jsonFormat),
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: winston.format.combine(nonAccessOnly(), jsonFormat),
  }),
  new winston.transports.File({
    filename: path.join(logsDir, 'access.log'),
    format: winston.format.combine(accessOnly(), jsonFormat),
  }),
];

if (environment.nodeEnv !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf((info) => {
          const context = info.context ? ` ${JSON.stringify(info.context)}` : '';
          return `${info.timestamp} [${info.level}] ${info.message}${context}`;
        })
      ),
    })
  );
}

const logger = winston.createLogger({
  level: environment.nodeEnv === 'production' ? 'info' : 'debug',
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  transports,
});

const buildRequestContext = (req, statusCode) => {
  return {
    userId: req?.user?.id ? String(req.user.id) : undefined,
    shopkeeperId: req?.shopkeeper?.id ? String(req.shopkeeper.id) : undefined,
    requestId: req?.requestId,
    path: req?.originalUrl || req?.path,
    method: req?.method,
    statusCode,
  };
};

const logError = ({ message, error, req, statusCode, details }) => {
  logger.error({
    message,
    context: buildRequestContext(req, statusCode),
    details,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          code: error.errorCode || error.code,
        }
      : undefined,
  });
};

const logAccess = ({ req, statusCode, durationMs, body, query }) => {
  logger.info({
    message: 'HTTP request',
    context: {
      ...buildRequestContext(req, statusCode),
      type: 'access',
      durationMs,
      query,
      body,
      ipAddress: req?.ip,
      userAgent: req?.get?.('user-agent') || null,
    },
  });
};

const logExternalServiceError = ({ service, req, error, details }) => {
  logger.error({
    message: `External service error: ${service}`,
    context: {
      ...buildRequestContext(req, details?.statusCode),
      service,
    },
    details,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          code: error.code,
        }
      : undefined,
  });
};

const postWebhook = async (url, payload) => {
  if (!url) {
    return;
  }

  await axios.post(url, payload, {
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

const sendCriticalAlert = async ({ message, requestId, path: requestPath, errorCode, statusCode }) => {
  const payload = {
    timestamp: new Date().toISOString(),
    message,
    requestId,
    path: requestPath,
    errorCode,
    statusCode,
  };

  try {
    if (process.env.ERROR_ALERT_EMAIL_WEBHOOK_URL) {
      await postWebhook(process.env.ERROR_ALERT_EMAIL_WEBHOOK_URL, {
        subject: `[CRITICAL] ${errorCode || 'INTERNAL_ERROR'}`,
        body: payload,
      });
    }

    if (process.env.SLACK_WEBHOOK_URL) {
      await postWebhook(process.env.SLACK_WEBHOOK_URL, {
        text: `Critical error detected (${errorCode || 'INTERNAL_ERROR'}) on ${requestPath || 'unknown path'} | requestId=${requestId || 'n/a'}`,
        payload,
      });
    }
  } catch (alertError) {
    logger.warn({
      message: 'Failed to send critical alert',
      context: {
        requestId,
        path: requestPath,
        statusCode,
      },
      error: {
        message: alertError.message,
        stack: alertError.stack,
      },
    });
  }
};

module.exports = {
  logger,
  buildRequestContext,
  logError,
  logAccess,
  logExternalServiceError,
  sendCriticalAlert,
};
