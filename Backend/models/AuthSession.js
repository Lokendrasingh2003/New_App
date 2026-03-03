const mongoose = require('mongoose');

const authSessionSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['USER', 'SHOPKEEPER', 'ADMIN'],
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenJti: {
      type: String,
      required: true,
      index: true,
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    lastSeenAt: { type: Date, default: Date.now, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null, index: true },
    revokeReason: { type: String, default: null },
  },
  { timestamps: true }
);

authSessionSchema.index({ actorType: 1, actorId: 1, revokedAt: 1, createdAt: -1 });
authSessionSchema.index({ actorType: 1, actorId: 1, lastSeenAt: -1 });
authSessionSchema.index({ refreshTokenHash: 1, revokedAt: 1 });

const AuthSession = mongoose.model('AuthSession', authSessionSchema);

module.exports = AuthSession;
