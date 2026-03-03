const mongoose = require('mongoose');
const { AUDIT_EVENT_TYPES } = require('../config/constants');

const auditLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: Object.values(AUDIT_EVENT_TYPES),
      default: AUDIT_EVENT_TYPES.GENERIC_EVENT,
      index: true,
    },
    actorId: { type: String, default: null },
    actorRole: { type: String, default: 'system' },
    actor: {
      type: {
        type: String,
        enum: ['ADMIN', 'SYSTEM', 'SHOPKEEPER'],
        default: 'SYSTEM',
      },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: null, trim: true },
      email: { type: String, default: null, trim: true, lowercase: true },
    },
    resource: {
      type: { type: String, default: null, trim: true },
      id: { type: String, default: null, trim: true },
      name: { type: String, default: null, trim: true },
    },
    resourceType: { type: String, default: null, trim: true, index: true },
    action: { type: String, required: true },
    targetType: { type: String, default: null },
    targetId: { type: String, default: null },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    metadata: {
      ipAddress: { type: String, default: null, trim: true },
      userAgent: { type: String, default: null, trim: true },
    },
    notes: { type: String, default: null, trim: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.index({ eventType: 1, createdAt: -1 });

auditLogSchema.index({ actorId: 1, createdAt: -1 });

auditLogSchema.index({ resourceType: 1, createdAt: -1 });

auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1, createdAt: -1 });

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
