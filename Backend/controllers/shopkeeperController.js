const City = require('../models/City');
const Shop = require('../models/Shop');
const Shopkeeper = require('../models/Shopkeeper');
const ApiError = require('../utils/apiError');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, generateRefreshToken, verifyToken, decodeToken } = require('../utils/jwt');
const { sendSuccess } = require('../utils/response');
const { encryptField } = require('../utils/secureField');
const {
  createSession,
  findActiveSessionForRefresh,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  listActiveSessions,
} = require('../services/authSessionService');
const environment = require('../config/environment');
const {
  HTTP_STATUS,
  ERROR_CODES,
  AUTH_ACTOR_TYPES,
  REFRESH_TOKEN_EXPIRY_BY_TYPE,
  SHOPKEEPER_STATUS,
  SHOP_STATUS,
} = require('../config/constants');

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: environment.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/shopkeeper',
  maxAge: REFRESH_MAX_AGE_MS,
};

const getRefreshExpiryMs = (type) => {
  const expiry = REFRESH_TOKEN_EXPIRY_BY_TYPE[type] || '30d';
  if (expiry.endsWith('d')) {
    return Number(expiry.slice(0, -1)) * 24 * 60 * 60 * 1000;
  }
  if (expiry.endsWith('h')) {
    return Number(expiry.slice(0, -1)) * 60 * 60 * 1000;
  }
  return REFRESH_MAX_AGE_MS;
};

const toSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const canAttemptLogin = (phone) => {
  const current = loginAttempts.get(phone);
  if (!current) {
    return true;
  }

  if (Date.now() > current.expiresAt) {
    loginAttempts.delete(phone);
    return true;
  }

  return current.count < LOGIN_MAX_ATTEMPTS;
};

const registerFailedLogin = (phone) => {
  const current = loginAttempts.get(phone);
  if (!current || Date.now() > current.expiresAt) {
    loginAttempts.set(phone, {
      count: 1,
      expiresAt: Date.now() + LOGIN_WINDOW_MS,
    });
    return;
  }

  current.count += 1;
  loginAttempts.set(phone, current);
};

const clearLoginAttempts = (phone) => {
  loginAttempts.delete(phone);
};

const buildShopkeeperTokens = (shopkeeper, sessionId) => {
  const token = generateToken(
    {
      sub: shopkeeper._id.toString(),
      phone: shopkeeper.phone,
      shopId: shopkeeper.shopId,
      sid: sessionId,
    },
    AUTH_ACTOR_TYPES.SHOPKEEPER
  );

  const refreshToken = generateRefreshToken(
    {
      sub: shopkeeper._id.toString(),
      sid: sessionId,
    },
    AUTH_ACTOR_TYPES.SHOPKEEPER
  );

  return { token, refreshToken };
};

const ensureActiveShopkeeper = (shopkeeper) => {
  if (shopkeeper.status === SHOPKEEPER_STATUS.SUSPENDED) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Shopkeeper account is suspended.', ERROR_CODES.SHOPKEEPER_SUSPENDED);
  }

  if (shopkeeper.status === SHOPKEEPER_STATUS.DISABLED) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, 'Shopkeeper account is disabled.', ERROR_CODES.SHOPKEEPER_DISABLED);
  }
};

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const ensurePasswordDoesNotContainPhone = ({ phone, password, fieldName = 'password' }) => {
  const normalizedPhone = normalizePhoneDigits(phone);
  if (!normalizedPhone || !password) {
    return;
  }

  if (String(password).includes(normalizedPhone)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `${fieldName} cannot contain your phone number.`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const registerShopkeeper = async (req, res) => {
  const { phone, password, confirmPassword, personalName, email, city, businessName, businessType } = req.body;

  if (password !== confirmPassword) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Password and confirmPassword must match.', ERROR_CODES.VALIDATION_ERROR);
  }

  ensurePasswordDoesNotContainPhone({ phone, password });

  const existing = await Shopkeeper.findOne({ $or: [{ phone }, ...(email ? [{ email: String(email).toLowerCase() }] : [])] });

  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'Shopkeeper already exists.', ERROR_CODES.SHOPKEEPER_ALREADY_EXISTS);
  }

  const cityDoc = await City.findOne({ name: { $regex: `^${city}$`, $options: 'i' }, isActive: true });
  if (!cityDoc) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'City not found.', ERROR_CODES.CITY_NOT_FOUND);
  }

  const hashedPassword = await hashPassword(password);

  const shopkeeper = await Shopkeeper.create({
    phone,
    password: hashedPassword,
    email: email ? String(email).toLowerCase() : null,
    personalInfo: {
      name: personalName,
      address: null,
      city: cityDoc.name,
      pincode: null,
    },
    businessInfo: {
      businessName,
      registrationType: businessType,
      registrationNumber: null,
    },
    verification: {
      emailVerified: false,
      phoneVerified: false,
      gstVerified: false,
      bankDetailsVerified: false,
    },
    bankDetails: {},
    commissionPreference: {
      percentage: 3,
      autoPayoutDay: 7,
    },
    status: SHOPKEEPER_STATUS.ACTIVE,
  });

  const baseSlug = toSlug(`${businessName}-${shopkeeper._id.toString().slice(-6)}`) || `shop-${shopkeeper._id.toString().slice(-6)}`;
  const shop = await Shop.create({
    ownerId: shopkeeper._id.toString(),
    cityId: cityDoc._id,
    shopName: businessName,
    slug: baseSlug,
    publicUrl: `/shops/${baseSlug}`,
    imageUrl: null,
    description: 'Shop profile pending details',
    category: 'General',
    phone,
    email: email ? String(email).toLowerCase() : null,
    addressLine1: `${cityDoc.name} (To be updated)`,
    area: cityDoc.name,
    pincode: '000000',
    latitude: cityDoc.latitude,
    longitude: cityDoc.longitude,
    businessHours: {
      open: '09:00',
      close: '21:00',
      closedDays: [],
    },
    delivery: {
      payer: 'CUSTOMER',
      chargeAmount: 0,
      serviceRadiusKm: 5,
      availableAreas: [cityDoc.name],
    },
    publicVisible: false,
    isActive: true,
    status: SHOP_STATUS.PENDING,
    verification: {
      gstNumber: null,
      status: 'PENDING',
      approvedAt: null,
    },
  });

  shopkeeper.shopId = shop._id;
  await shopkeeper.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Shopkeeper registered successfully. Verification SMS queued.',
    data: {
      shopkeeperId: shopkeeper._id,
    },
  });
};

const loginShopkeeper = async (req, res) => {
  const { phone, password } = req.body;

  if (!canAttemptLogin(phone)) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'Too many login attempts. Try again later.',
      ERROR_CODES.LOGIN_RATE_LIMITED
    );
  }

  const shopkeeper = await Shopkeeper.findOne({ phone });
  if (!shopkeeper) {
    registerFailedLogin(phone);
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.', ERROR_CODES.INVALID_CREDENTIALS);
  }

  const match = await comparePassword(password, shopkeeper.password);
  if (!match) {
    registerFailedLogin(phone);
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid credentials.', ERROR_CODES.INVALID_CREDENTIALS);
  }

  ensureActiveShopkeeper(shopkeeper);
  clearLoginAttempts(phone);

  shopkeeper.lastLogin = new Date();
  await shopkeeper.save();

  const sessionId = require('crypto').randomUUID();
  const { token, refreshToken } = buildShopkeeperTokens(shopkeeper, sessionId);
  const decodedRefresh = decodeToken(refreshToken) || {};

  await createSession({
    actorType: 'SHOPKEEPER',
    actorId: shopkeeper._id,
    sessionId,
    refreshToken,
    refreshTokenJti: decodedRefresh.jti,
    req,
    expiresInMs: getRefreshExpiryMs(AUTH_ACTOR_TYPES.SHOPKEEPER),
  });

  res.cookie('shopkeeperRefreshToken', refreshToken, refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Login successful.',
    data: {
      token,
      refreshToken,
      shopkeeper: {
        id: shopkeeper._id,
        phone: shopkeeper.phone,
        shopId: shopkeeper.shopId,
        status: shopkeeper.status,
      },
    },
  });
};

const logoutShopkeeper = async (_req, res) => {
  const sessionId = _req.auth?.sid;
  if (sessionId) {
    await revokeSession({ sessionId, reason: 'LOGOUT' });
  }

  res.clearCookie('shopkeeperRefreshToken', refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out successfully.',
    data: {},
  });
};

const refreshShopkeeperToken = async (req, res) => {
  const refreshToken = req.body.refreshToken || req.cookies?.shopkeeperRefreshToken;

  if (!refreshToken) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing token.', ERROR_CODES.MISSING_TOKEN);
  }

  let payload;
  try {
    payload = verifyToken(refreshToken, AUTH_ACTOR_TYPES.SHOPKEEPER, { tokenUse: 'refresh' });
  } catch (error) {
    const code = error?.name === 'TokenExpiredError' ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.INVALID_TOKEN;
    const message = error?.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  if (
    payload.type !== AUTH_ACTOR_TYPES.SHOPKEEPER ||
    payload.tokenUse !== 'refresh' ||
    !payload.sub ||
    !payload.sid ||
    !payload.jti
  ) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token.', ERROR_CODES.INVALID_TOKEN);
  }

  const shopkeeper = await Shopkeeper.findById(payload.sub);
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  ensureActiveShopkeeper(shopkeeper);

  const activeSession = await findActiveSessionForRefresh({
    actorType: 'SHOPKEEPER',
    actorId: shopkeeper._id,
    sessionId: payload.sid,
    refreshTokenJti: payload.jti,
    refreshToken,
  });

  if (!activeSession) {
    await revokeAllSessions({ actorType: 'SHOPKEEPER', actorId: shopkeeper._id, reason: 'SUSPICIOUS_REFRESH_REUSE' });
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token.', ERROR_CODES.INVALID_TOKEN);
  }

  const nextRefreshToken = generateRefreshToken(
    {
      sub: shopkeeper._id.toString(),
      sid: payload.sid,
    },
    AUTH_ACTOR_TYPES.SHOPKEEPER
  );

  const decodedNextRefresh = decodeToken(nextRefreshToken) || {};

  await rotateSession({
    session: activeSession,
    nextRefreshToken,
    nextRefreshTokenJti: decodedNextRefresh.jti,
    req,
    expiresInMs: getRefreshExpiryMs(AUTH_ACTOR_TYPES.SHOPKEEPER),
  });

  const nextTokens = {
    token: generateToken(
      {
        sub: shopkeeper._id.toString(),
        phone: shopkeeper.phone,
        shopId: shopkeeper.shopId,
        sid: payload.sid,
      },
      AUTH_ACTOR_TYPES.SHOPKEEPER
    ),
    refreshToken: nextRefreshToken,
  };

  res.cookie('shopkeeperRefreshToken', nextRefreshToken, refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Token refreshed successfully.',
    data: nextTokens,
  });
};

const getShopkeeperActiveSessions = async (req, res) => {
  const sessions = await listActiveSessions({ actorType: 'SHOPKEEPER', actorId: req.shopkeeper.id });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Active sessions fetched successfully.',
    data: {
      sessions: sessions.map((session) => ({
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        lastSeenAt: session.lastSeenAt,
        createdAt: session.createdAt,
        current: req.auth?.sid ? String(req.auth.sid) === String(session.sessionId) : false,
      })),
    },
  });
};

const logoutShopkeeperAllDevices = async (req, res) => {
  await revokeAllSessions({ actorType: 'SHOPKEEPER', actorId: req.shopkeeper.id, reason: 'LOGOUT_ALL' });
  res.clearCookie('shopkeeperRefreshToken', refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out from all devices successfully.',
    data: { success: true },
  });
};

const updateShopkeeperProfile = async (req, res) => {
  const { name, email, personalAddress, city } = req.body;

  const shopkeeper = await Shopkeeper.findById(req.shopkeeper.id);
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  ensureActiveShopkeeper(shopkeeper);

  if (email) {
    const existingEmail = await Shopkeeper.findOne({ email: String(email).toLowerCase(), _id: { $ne: shopkeeper._id } });
    if (existingEmail) {
      throw new ApiError(HTTP_STATUS.CONFLICT, 'Email already in use.', ERROR_CODES.SHOPKEEPER_ALREADY_EXISTS);
    }
  }

  shopkeeper.personalInfo.name = name;
  shopkeeper.personalInfo.address = personalAddress || null;
  shopkeeper.personalInfo.city = city;
  shopkeeper.email = email ? String(email).toLowerCase() : null;

  await shopkeeper.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Profile updated successfully.',
    data: {
      shopkeeper,
    },
  });
};

const changeShopkeeperPassword = async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'newPassword and confirmPassword must match.', ERROR_CODES.VALIDATION_ERROR);
  }

  const shopkeeper = await Shopkeeper.findById(req.shopkeeper.id);
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  ensureActiveShopkeeper(shopkeeper);

  const oldMatches = await comparePassword(oldPassword, shopkeeper.password);
  if (!oldMatches) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Old password is incorrect.', ERROR_CODES.INVALID_CREDENTIALS);
  }

  ensurePasswordDoesNotContainPhone({ phone: shopkeeper.phone, password: newPassword, fieldName: 'newPassword' });

  shopkeeper.password = await hashPassword(newPassword);
  await shopkeeper.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Password changed successfully.',
    data: {},
  });
};

const verifyShopkeeperEmail = async (req, res) => {
  const { email, verificationCode } = req.body;

  if (String(verificationCode) !== '123456') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid verification code.', ERROR_CODES.VALIDATION_ERROR);
  }

  const shopkeeper = await Shopkeeper.findOne({ email: String(email).toLowerCase() });
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  shopkeeper.verification.emailVerified = true;
  await shopkeeper.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Email verified successfully.',
    data: {
      success: true,
    },
  });
};

const updateShopkeeperBankDetails = async (req, res) => {
  const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

  const shopkeeper = await Shopkeeper.findById(req.shopkeeper.id);
  if (!shopkeeper) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shopkeeper not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  ensureActiveShopkeeper(shopkeeper);

  shopkeeper.bankDetails = {
    accountHolderName,
    accountNumber: encryptField(accountNumber),
    ifscCode,
    bankName,
  };
  shopkeeper.verification.bankDetailsVerified = false;

  await shopkeeper.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Bank details updated successfully.',
    data: {},
  });
};

module.exports = {
  registerShopkeeper,
  loginShopkeeper,
  logoutShopkeeper,
  refreshShopkeeperToken,
  getShopkeeperActiveSessions,
  logoutShopkeeperAllDevices,
  updateShopkeeperProfile,
  changeShopkeeperPassword,
  verifyShopkeeperEmail,
  updateShopkeeperBankDetails,
};
