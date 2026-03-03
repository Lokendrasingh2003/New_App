const User = require('../models/User');
const environment = require('../config/environment');
const {
  HTTP_STATUS,
  ERROR_CODES,
  AUTH_ACTOR_TYPES,
  REFRESH_TOKEN_EXPIRY_BY_TYPE,
} = require('../config/constants');
const {
  createSession,
  findActiveSessionForRefresh,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  listActiveSessions,
} = require('../services/authSessionService');
const { formatPhone, generateReferralCode } = require('../utils/authHelpers');
const { generateToken, generateRefreshToken, verifyToken, decodeToken } = require('../utils/jwt');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const {
  createOtpPayload,
  assertVerifyAttemptLimit,
  registerFailedVerifyAttempt,
  clearVerifyAttempts,
} = require('../services/otpService');

const REFRESH_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: environment.nodeEnv === 'production',
  sameSite: 'strict',
  path: '/api/auth',
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

const getSafeUser = (user) => {
  return {
    id: user._id,
    phone: user.phone,
    isVerified: user.isVerified,
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    addresses: user.addresses,
    savedPaymentMethods: user.savedPaymentMethods,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const generateUniqueReferralCode = async () => {
  let attempts = 0;

  while (attempts < 10) {
    const candidate = generateReferralCode();
    const exists = await User.exists({ referralCode: candidate });
    if (!exists) {
      return candidate;
    }
    attempts += 1;
  }

  throw new ApiError(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    'Unable to generate referral code.',
    ERROR_CODES.REFERRAL_CODE_GENERATION_FAILED
  );
};

const sendOtp = async (req, res) => {
  const phone = formatPhone(req.body.phone);
  const { otp, otpExpiresAt, expiresIn } = createOtpPayload(phone);

  let user = await User.findOne({ phone });

  if (!user) {
    const referralCode = await generateUniqueReferralCode();
    user = await User.create({
      phone,
      otp,
      otpExpiresAt,
      isVerified: false,
      referralCode,
    });
  } else {
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'OTP sent successfully.',
    data: {
      expiresIn,
    },
  });
};

const verifyOtp = async (req, res) => {
  const phone = formatPhone(req.body.phone);
  const otp = req.body.otp;

  assertVerifyAttemptLimit(phone);

  const user = await User.findOne({ phone });

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'OTP expired.', ERROR_CODES.OTP_EXPIRED);
  }

  if (String(user.otp) !== String(otp)) {
    registerFailedVerifyAttempt(phone);
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid OTP.', ERROR_CODES.INVALID_OTP);
  }

  clearVerifyAttempts(phone);

  user.isVerified = true;
  user.otp = null;
  user.otpExpiresAt = null;
  await user.save();

  const sessionId = require('crypto').randomUUID();

  const refreshToken = generateRefreshToken(
    {
      sub: user._id.toString(),
      sid: sessionId,
    },
    AUTH_ACTOR_TYPES.USER
  );

  const decodedRefresh = decodeToken(refreshToken) || {};

  await createSession({
    actorType: 'USER',
    actorId: user._id,
    sessionId,
    refreshToken,
    refreshTokenJti: decodedRefresh.jti,
    req,
    expiresInMs: getRefreshExpiryMs(AUTH_ACTOR_TYPES.USER),
  });

  const token = generateToken(
    {
      sub: user._id.toString(),
      phone: user.phone,
      sid: sessionId,
    },
    AUTH_ACTOR_TYPES.USER
  );

  res.cookie('refreshToken', refreshToken, refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'OTP verified successfully.',
    data: {
      token,
      refreshToken,
      user: getSafeUser(user),
    },
  });
};

const logout = async (_req, res) => {
  const sessionId = _req.auth?.sid;
  if (sessionId) {
    await revokeSession({ sessionId, reason: 'LOGOUT' });
  }

  res.clearCookie('refreshToken', refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out successfully.',
    data: {},
  });
};

const refreshToken = async (req, res) => {
  const incomingRefreshToken = req.body.refreshToken || req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Missing token.', ERROR_CODES.MISSING_TOKEN);
  }

  let payload;
  try {
    payload = verifyToken(incomingRefreshToken, AUTH_ACTOR_TYPES.USER, { tokenUse: 'refresh' });
  } catch (_error) {
    const code = _error?.name === 'TokenExpiredError' ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.INVALID_TOKEN;
    const message = _error?.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, message, code);
  }

  if (payload.type !== AUTH_ACTOR_TYPES.USER || payload.tokenUse !== 'refresh' || !payload.sub || !payload.sid || !payload.jti) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token.', ERROR_CODES.INVALID_TOKEN);
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  const activeSession = await findActiveSessionForRefresh({
    actorType: 'USER',
    actorId: user._id,
    sessionId: payload.sid,
    refreshTokenJti: payload.jti,
    refreshToken: incomingRefreshToken,
  });

  if (!activeSession) {
    await revokeAllSessions({ actorType: 'USER', actorId: user._id, reason: 'SUSPICIOUS_REFRESH_REUSE' });
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid token.', ERROR_CODES.INVALID_TOKEN);
  }

  const newRefreshToken = generateRefreshToken(
    {
      sub: user._id.toString(),
      sid: payload.sid,
    },
    AUTH_ACTOR_TYPES.USER
  );

  const decodedNewRefresh = decodeToken(newRefreshToken) || {};

  await rotateSession({
    session: activeSession,
    nextRefreshToken: newRefreshToken,
    nextRefreshTokenJti: decodedNewRefresh.jti,
    req,
    expiresInMs: getRefreshExpiryMs(AUTH_ACTOR_TYPES.USER),
  });

  const newToken = generateToken(
    {
      sub: user._id.toString(),
      phone: user.phone,
      sid: payload.sid,
    },
    AUTH_ACTOR_TYPES.USER
  );

  res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Token refreshed successfully.',
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
  });
};

const getActiveUserSessions = async (req, res) => {
  const sessions = await listActiveSessions({ actorType: 'USER', actorId: req.user.id });

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

const logoutAllDevices = async (req, res) => {
  await revokeAllSessions({ actorType: 'USER', actorId: req.user.id, reason: 'LOGOUT_ALL' });
  res.clearCookie('refreshToken', refreshCookieOptions);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Logged out from all devices successfully.',
    data: {
      success: true,
    },
  });
};

module.exports = {
  sendOtp,
  verifyOtp,
  logout,
  refreshToken,
  getActiveUserSessions,
  logoutAllDevices,
};
