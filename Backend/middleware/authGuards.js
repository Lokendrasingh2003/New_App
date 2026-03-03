const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES, AUTH_ACTOR_TYPES } = require('../config/constants');

const ensureAuth = (req) => {
  if (!req.auth?.sub) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing token.', ERROR_CODES.MISSING_TOKEN);
  }
};

const requireUser = (req, _res, next) => {
  try {
    ensureAuth(req);
    if (req.auth.type !== AUTH_ACTOR_TYPES.USER) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
    }
    req.user = {
      id: req.auth.sub,
      ...req.auth,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const requireShopkeeper = (req, _res, next) => {
  try {
    ensureAuth(req);
    if (req.auth.type !== AUTH_ACTOR_TYPES.SHOPKEEPER) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
    }
    req.shopkeeper = {
      id: req.auth.sub,
      ...req.auth,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const requireAdmin = (req, _res, next) => {
  try {
    ensureAuth(req);
    if (req.auth.type !== AUTH_ACTOR_TYPES.ADMIN) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
    }
    req.admin = {
      id: req.auth.sub,
      ...req.auth,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const requireOwnership = (req, _res, next) => {
  try {
    ensureAuth(req);

    if (req.auth.type === AUTH_ACTOR_TYPES.ADMIN) {
      return next();
    }

    const userIdFromParams = req.params.userId || req.params.ownerId;
    const shopkeeperIdFromParams = req.params.shopkeeperId;
    const shopIdFromParams = req.params.shopId;

    if (req.auth.type === AUTH_ACTOR_TYPES.USER && userIdFromParams && String(req.auth.sub) !== String(userIdFromParams)) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
    }

    if (
      req.auth.type === AUTH_ACTOR_TYPES.SHOPKEEPER &&
      shopkeeperIdFromParams &&
      String(req.auth.sub) !== String(shopkeeperIdFromParams)
    ) {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
    }

    if (req.auth.type === AUTH_ACTOR_TYPES.SHOPKEEPER && shopIdFromParams && req.auth.shopId) {
      if (String(req.auth.shopId) !== String(shopIdFromParams)) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Permission denied.', ERROR_CODES.PERMISSION_DENIED);
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireUser,
  requireShopkeeper,
  requireAdmin,
  requireOwnership,
};
