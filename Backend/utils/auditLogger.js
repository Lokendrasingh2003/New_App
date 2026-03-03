const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');
const { AUDIT_EVENT_TYPES } = require('../config/constants');

const normalizeObjectId = (value) => {
  if (!value) {
    return null;
  }

  const asString = String(value);
  return mongoose.isValidObjectId(asString) ? asString : null;
};

const buildActorFromRequest = (req) => {
  const actorId = req.user?.id || req.internal?.actorId || null;

  return {
    type: req.user ? 'ADMIN' : req.internal?.role ? String(req.internal.role).toUpperCase() : 'SYSTEM',
    id: normalizeObjectId(actorId),
    name: req.user?.name || req.internal?.name || null,
    email: req.user?.email || req.internal?.email || null,
  };
};

const buildMetadataFromRequest = (req) => ({
  ipAddress: req.ip || null,
  userAgent: req.get('user-agent') || null,
});

async function logAudit(eventType, actor, resource, action, changes = undefined, notes = undefined, metadata = undefined) {
  const actorId = actor?.id ? String(actor.id) : null;
  const actorObjectId = normalizeObjectId(actor?.id);
  const resourceId = resource?.id ? String(resource.id) : null;
  const resourceType = resource?.type ? String(resource.type) : null;

  return AuditLog.create({
    eventType: eventType || AUDIT_EVENT_TYPES.GENERIC_EVENT,
    actorId,
    actorRole: actor?.type || 'SYSTEM',
    actor: {
      type: actor?.type || 'SYSTEM',
      id: actorObjectId,
      name: actor?.name || null,
      email: actor?.email || null,
    },
    resource: {
      type: resourceType,
      id: resourceId,
      name: resource?.name || null,
    },
    resourceType,
    action,
    targetType: resourceType,
    targetId: resourceId,
    changes: changes
      ? {
          before: changes.before ?? null,
          after: changes.after ?? null,
        }
      : {
          before: null,
          after: null,
        },
    metadata: {
      ipAddress: metadata?.ipAddress || null,
      userAgent: metadata?.userAgent || null,
    },
    notes: notes || null,
    payload: changes
      ? {
          before: changes.before ?? null,
          after: changes.after ?? null,
        }
      : {},
  });
}

module.exports = {
  logAudit,
  buildActorFromRequest,
  buildMetadataFromRequest,
};
