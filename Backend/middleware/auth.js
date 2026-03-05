const { verifyToken } = require('../utils/jwt');
const environment = require('../config/environment');
const { HTTP_STATUS, ERROR_CODES, AUTH_ACTOR_TYPES } = require('../config/constants');
const { authenticatedApiRateLimiter } = require('./rateLimiters');

const isDevAuthBypassEnabled = () => {
  return environment.nodeEnv !== 'production' && String(process.env.DEV_AUTH_BYPASS || 'true').toLowerCase() !== 'false';
};

const shouldAcceptDemoInternalKey = () => {
  const allowDemoKey = String(process.env.ALLOW_DEMO_INTERNAL_KEY || 'true').toLowerCase() !== 'false';
  if (!allowDemoKey) {
    return false;
  }

  if (isDevAuthBypassEnabled()) {
    return true;
  }

  return !process.env.INTERNAL_ADMIN_KEY;
};

const DEMO_INTERNAL_ADMIN_KEY = String(process.env.DEMO_INTERNAL_ADMIN_KEY || 'demo-superadmin-access');
const DEMO_USER_TOKEN = String(process.env.DEMO_USER_TOKEN || 'user-app-demo-session-token');
const DEMO_SHOPKEEPER_TOKEN = String(
  process.env.DEMO_SHOPKEEPER_TOKEN ||
    'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIwMDAwMDAwMDAwMDAwMDAwMDAwMDEiLCJzaG9wSWQiOiIwMDAwMDAwMDAwMDAwMDAwMDAwMDIiLCJ0eXBlIjoiU0hPUEtFRVBFUiIsInRva2VuVXNlIjoiYWNjZXNzIn0.demo'
);

const attachDemoUserContext = (req) => {
  const syntheticSub = '000000000000000000000010';
  req.auth = {
    sub: syntheticSub,
    type: AUTH_ACTOR_TYPES.USER,
    tokenUse: 'access',
    sid: 'demo-user-session',
    phone: '9999999999',
  };
  req.user = {
    id: syntheticSub,
    ...req.auth,
  };
};

const attachDemoShopkeeperContext = (req) => {
  const syntheticSub = '000000000000000000000001';
  req.auth = {
    sub: syntheticSub,
    type: AUTH_ACTOR_TYPES.SHOPKEEPER,
    tokenUse: 'access',
    sid: 'demo-shopkeeper-session',
    phone: '9999999999',
    shopId: '000000000000000000000002',
  };
  req.shopkeeper = {
    id: syntheticSub,
    ...req.auth,
  };
};

const tryAttachDevDemoContext = (req, token, expectedType = null) => {
  if (!isDevAuthBypassEnabled()) {
    return false;
  }

  if (token === DEMO_USER_TOKEN && (!expectedType || expectedType === AUTH_ACTOR_TYPES.USER)) {
    attachDemoUserContext(req);
    return true;
  }

  if (token === DEMO_SHOPKEEPER_TOKEN && (!expectedType || expectedType === AUTH_ACTOR_TYPES.SHOPKEEPER)) {
    attachDemoShopkeeperContext(req);
    return true;
  }

  return false;
};

const extractBearerToken = (authorizationHeader = '') => {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

const runAuthApiRateLimit = (req, res) => {
  return new Promise((resolve, reject) => {
    authenticatedApiRateLimiter(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

const attachInternalAdminContext = (req) => {
  const syntheticSub = 'internal-admin';

  req.internal = { trusted: true, actorId: syntheticSub, role: 'superadmin' };
  req.auth = {
    sub: syntheticSub,
    type: AUTH_ACTOR_TYPES.ADMIN,
    role: 'superadmin',
    tokenUse: 'access',
    sid: 'internal-key',
  };
  req.admin = {
    id: syntheticSub,
    ...req.auth,
  };
  req.user = {
    id: syntheticSub,
    role: 'superadmin',
    ...req.auth,
  };
};

const parseAuthError = (error) => {
  if (error?.statusCode) {
    return error;
  }

  if (error?.name === 'TokenExpiredError') {
    const e = new Error('Token expired.');
    e.statusCode = HTTP_STATUS.UNAUTHORIZED;
    e.code = ERROR_CODES.TOKEN_EXPIRED;
    return e;
  }

  if (error?.name === 'NotBeforeError') {
    const e = new Error('Token not active.');
    e.statusCode = HTTP_STATUS.UNAUTHORIZED;
    e.code = ERROR_CODES.INVALID_TOKEN;
    return e;
  }

  const e = new Error('Invalid token.');
  e.statusCode = HTTP_STATUS.UNAUTHORIZED;
  e.code = ERROR_CODES.INVALID_TOKEN;
  return e;
};

const verifyAccessToken = async (req, res, next, expectedType = null) => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      const error = new Error('Missing token.');
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.MISSING_TOKEN;
      throw error;
    }

    if (tryAttachDevDemoContext(req, token, expectedType)) {
      await runAuthApiRateLimit(req, res);
      return next();
    }

    const decoded = verifyToken(token, expectedType || AUTH_ACTOR_TYPES.USER);

    if (decoded.tokenUse && decoded.tokenUse !== 'access') {
      const error = new Error('Invalid token.');
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    if (!decoded.sub) {
      const error = new Error('Invalid token.');
      error.statusCode = HTTP_STATUS.UNAUTHORIZED;
      error.code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }

    req.auth = decoded;

    if (decoded.type === AUTH_ACTOR_TYPES.USER) {
      req.user = {
        id: decoded.sub,
        ...decoded,
      };
    }

    if (decoded.type === AUTH_ACTOR_TYPES.SHOPKEEPER) {
      req.shopkeeper = {
        id: decoded.sub,
        ...decoded,
      };
    }

    if (decoded.type === AUTH_ACTOR_TYPES.ADMIN) {
      req.admin = {
        id: decoded.sub,
        ...decoded,
      };
      req.user = {
        id: decoded.sub,
        role: 'superadmin',
        ...decoded,
      };
    }

    await runAuthApiRateLimit(req, res);
    return next();
  } catch (error) {
    return next(parseAuthError(error));
  }
};

const verifyTokenMiddleware = (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    const error = new Error('Missing token.');
    error.statusCode = HTTP_STATUS.UNAUTHORIZED;
    error.code = ERROR_CODES.MISSING_TOKEN;
    return next(error);
  }

  if (tryAttachDevDemoContext(req, token)) {
    return next();
  }

  try {
    let decoded;

    try {
      decoded = verifyToken(token, AUTH_ACTOR_TYPES.USER);
    } catch (_errUser) {
      try {
        decoded = verifyToken(token, AUTH_ACTOR_TYPES.SHOPKEEPER);
      } catch (_errShopkeeper) {
        decoded = verifyToken(token, AUTH_ACTOR_TYPES.ADMIN);
      }
    }

    req.auth = decoded;
    return next();
  } catch (error) {
    return next(parseAuthError(error));
  }
};

const verifyUserToken = (req, _res, next) => {
  return verifyAccessToken(req, _res, next, AUTH_ACTOR_TYPES.USER);
};

const verifyShopkeeperToken = (req, _res, next) => {
  return verifyAccessToken(req, _res, next, AUTH_ACTOR_TYPES.SHOPKEEPER);
};

const verifyInternalOrAdmin = (req, _res, next) => {
  const internalKey = String(req.headers['x-internal-key'] || '');
  const expected = process.env.INTERNAL_ADMIN_KEY || environment.jwtSecret;

  if (internalKey && internalKey === expected) {
    attachInternalAdminContext(req);
    return next();
  }

  if (shouldAcceptDemoInternalKey() && internalKey && internalKey === DEMO_INTERNAL_ADMIN_KEY) {
    attachInternalAdminContext(req);
    return next();
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    const error = new Error('Forbidden: internal/admin authorization required');
    error.statusCode = HTTP_STATUS.FORBIDDEN;
    error.code = ERROR_CODES.INVALID_TOKEN;
    return next(error);
  }

  return verifyAccessToken(req, _res, next, AUTH_ACTOR_TYPES.ADMIN);
};

const verifySuperAdmin = (req, _res, next) => {
  const internalKey = String(req.headers['x-internal-key'] || '');
  const expected = process.env.INTERNAL_ADMIN_KEY || environment.jwtSecret;

  if (internalKey && internalKey === expected) {
    attachInternalAdminContext(req);
    return next();
  }

  if (shouldAcceptDemoInternalKey() && internalKey && internalKey === DEMO_INTERNAL_ADMIN_KEY) {
    attachInternalAdminContext(req);
    return next();
  }

  return verifyAccessToken(req, _res, next, AUTH_ACTOR_TYPES.ADMIN);
};

module.exports = {
  verifyToken: verifyTokenMiddleware,
  verifyUserToken,
  verifyShopkeeperToken,
  verifyInternalOrAdmin,
  verifySuperAdmin,
  extractBearerToken,
};
