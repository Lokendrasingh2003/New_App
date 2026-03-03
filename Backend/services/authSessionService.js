const crypto = require('crypto');
const AuthSession = require('../models/AuthSession');

const hashToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');

const computeExpiryDate = (expiresInMs) => new Date(Date.now() + Math.max(0, Number(expiresInMs || 0)));

const createSession = async ({ actorType, actorId, refreshToken, refreshTokenJti, req, expiresInMs, sessionId }) => {
  return AuthSession.create({
    actorType,
    actorId,
    sessionId,
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenJti: refreshTokenJti,
    ipAddress: req?.ip || null,
    userAgent: req?.get?.('user-agent') || null,
    lastSeenAt: new Date(),
    expiresAt: computeExpiryDate(expiresInMs),
  });
};

const findActiveSessionForRefresh = async ({ actorType, actorId, refreshToken, refreshTokenJti, sessionId }) => {
  return AuthSession.findOne({
    actorType,
    actorId,
    sessionId,
    refreshTokenJti,
    refreshTokenHash: hashToken(refreshToken),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
};

const rotateSession = async ({ session, nextRefreshToken, nextRefreshTokenJti, req, expiresInMs }) => {
  session.refreshTokenHash = hashToken(nextRefreshToken);
  session.refreshTokenJti = nextRefreshTokenJti;
  session.lastSeenAt = new Date();
  session.ipAddress = req?.ip || session.ipAddress || null;
  session.userAgent = req?.get?.('user-agent') || session.userAgent || null;
  session.expiresAt = computeExpiryDate(expiresInMs);
  await session.save();
  return session;
};

const revokeSession = async ({ sessionId, reason = 'LOGOUT' }) => {
  await AuthSession.updateOne(
    { sessionId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
};

const revokeAllSessions = async ({ actorType, actorId, reason = 'LOGOUT_ALL' }) => {
  await AuthSession.updateMany(
    { actorType, actorId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    }
  );
};

const listActiveSessions = async ({ actorType, actorId }) => {
  return AuthSession.find({
    actorType,
    actorId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastSeenAt: -1 })
    .lean();
};

module.exports = {
  createSession,
  findActiveSessionForRefresh,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  listActiveSessions,
};
