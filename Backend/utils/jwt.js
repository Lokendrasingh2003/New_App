const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const environment = require('../config/environment');
const {
  AUTH_ACTOR_TYPES,
  ACCESS_TOKEN_EXPIRY_BY_TYPE,
  REFRESH_TOKEN_EXPIRY_BY_TYPE,
} = require('../config/constants');

const KNOWN_TYPES = new Set(Object.values(AUTH_ACTOR_TYPES));

const resolveActorType = (type) => {
  if (KNOWN_TYPES.has(type)) {
    return type;
  }

  return AUTH_ACTOR_TYPES.USER;
};

const getSecretsByType = (type) => {
  const actorType = resolveActorType(type);

  if (actorType === AUTH_ACTOR_TYPES.ADMIN) {
    return {
      accessSecret: environment.adminJwtSecret,
      refreshSecret: environment.adminRefreshJwtSecret,
    };
  }

  if (actorType === AUTH_ACTOR_TYPES.SHOPKEEPER) {
    return {
      accessSecret: environment.shopkeeperJwtSecret,
      refreshSecret: environment.shopkeeperRefreshJwtSecret,
    };
  }

  return {
    accessSecret: environment.userJwtSecret,
    refreshSecret: environment.userRefreshJwtSecret,
  };
};

const isLegacySecret = (value) => {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  return !KNOWN_TYPES.has(value);
};

const generateToken = (payload, typeOrSecret = AUTH_ACTOR_TYPES.USER, options = undefined) => {
  if (isLegacySecret(typeOrSecret)) {
    const secret = typeOrSecret;
    if (!secret) {
      throw new Error('JWT secret is required for token generation');
    }

    return jwt.sign(payload, secret, options || { expiresIn: '7d' });
  }

  const actorType = resolveActorType(typeOrSecret);
  const { accessSecret } = getSecretsByType(actorType);

  return jwt.sign(
    {
      ...payload,
      type: actorType,
      tokenUse: 'access',
    },
    accessSecret,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY_BY_TYPE[actorType] || '7d',
      ...(options || {}),
    }
  );
};

const generateRefreshToken = (payload, type = AUTH_ACTOR_TYPES.USER, options = undefined) => {
  const actorType = resolveActorType(type);
  const { refreshSecret } = getSecretsByType(actorType);

  return jwt.sign(
    {
      ...payload,
      type: actorType,
      tokenUse: 'refresh',
      jti: crypto.randomUUID(),
    },
    refreshSecret,
    {
      expiresIn: REFRESH_TOKEN_EXPIRY_BY_TYPE[actorType] || '30d',
      ...(options || {}),
    }
  );
};

const verifyToken = (token, typeOrSecret = AUTH_ACTOR_TYPES.USER, options = undefined) => {
  if (isLegacySecret(typeOrSecret)) {
    const secret = typeOrSecret;
    if (!secret) {
      throw new Error('JWT secret is required for token verification');
    }

    return jwt.verify(token, secret, options || {});
  }

  const actorType = resolveActorType(typeOrSecret);
  const { accessSecret, refreshSecret } = getSecretsByType(actorType);

  const tokenUse = options?.tokenUse;

  if (tokenUse === 'refresh') {
    return jwt.verify(token, refreshSecret, options || {});
  }

  return jwt.verify(token, accessSecret, options || {});
};

const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
};
