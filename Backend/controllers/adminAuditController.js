const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const parseDateSafe = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateRangeFromQuery = ({ dateFrom, dateTo }) => {
  const range = {};
  if (dateFrom) {
    const parsed = parseDateSafe(dateFrom);
    if (parsed) {
      range.$gte = parsed;
    }
  }
  if (dateTo) {
    const parsed = parseDateSafe(dateTo);
    if (parsed) {
      range.$lte = parsed;
    }
  }

  return Object.keys(range).length > 0 ? range : null;
};

const buildFilter = async (query) => {
  const filter = {};

  if (query.eventType) {
    filter.$or = [{ eventType: query.eventType }, { action: query.eventType }];
  }

  if (query.actorId) {
    filter.$and = [...(filter.$and || []), { $or: [{ actorId: String(query.actorId) }, { 'actor.id': query.actorId }] }];
  }

  if (query.resourceType) {
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ resourceType: query.resourceType }, { targetType: query.resourceType }, { 'resource.type': query.resourceType }] },
    ];
  }

  if (query.action) {
    filter.$and = [...(filter.$and || []), { action: query.action }];
  }

  const dateRange = dateRangeFromQuery({ dateFrom: query.dateFrom, dateTo: query.dateTo });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const search = String(query.search || '').trim();
  if (search) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { action: { $regex: search, $options: 'i' } },
          { targetType: { $regex: search, $options: 'i' } },
          { targetId: { $regex: search, $options: 'i' } },
          { actorId: { $regex: search, $options: 'i' } },
          { 'actor.name': { $regex: search, $options: 'i' } },
          { 'actor.email': { $regex: search, $options: 'i' } },
          { 'resource.name': { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  return filter;
};

const listAuditLogs = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = await buildFilter(req.query);

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Audit logs fetched successfully.',
    data: {
      logs,
      pagination: { total, limit, offset },
    },
  });
};

const getAuditLogById = async (req, res) => {
  const log = await AuditLog.findById(req.params.logId).lean();
  if (!log) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Audit log not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Audit log fetched successfully.',
    data: { log },
  });
};

const getAuditAnalytics = async (req, res) => {
  const match = {};
  const dateRange = dateRangeFromQuery({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    match.createdAt = dateRange;
  }

  const [eventsByTypeRows, eventsByActorRows, timelineRows, deletedResourcesRows, mostModifiedRows] = await Promise.all([
    AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$eventType', '$action'] },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $ifNull: ['$actor.id', '$actorId'] },
          actorName: { $first: { $ifNull: ['$actor.name', '$actorId'] } },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
    AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
        },
      },
    ]),
    AuditLog.aggregate([
      {
        $match: {
          ...match,
          action: 'DELETED',
        },
      },
      {
        $project: {
          _id: 0,
          resourceType: { $ifNull: ['$resource.type', '$targetType'] },
          resourceId: { $ifNull: ['$resource.id', '$targetId'] },
          resourceName: '$resource.name',
          action: 1,
          createdAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ]),
    AuditLog.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            type: { $ifNull: ['$resource.type', '$targetType'] },
            id: { $ifNull: ['$resource.id', '$targetId'] },
          },
          name: { $first: '$resource.name' },
          modifications: { $sum: 1 },
        },
      },
      { $sort: { modifications: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          resourceType: '$_id.type',
          resourceId: '$_id.id',
          resourceName: '$name',
          modifications: 1,
        },
      },
    ]),
  ]);

  const eventsByType = eventsByTypeRows.reduce((acc, row) => {
    acc[String(row._id || 'UNKNOWN')] = Number(row.count || 0);
    return acc;
  }, {});

  const eventsByActor = eventsByActorRows.reduce((acc, row) => {
    acc[String(row.actorName || row._id || 'UNKNOWN')] = Number(row.count || 0);
    return acc;
  }, {});

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Audit analytics fetched successfully.',
    data: {
      eventsByType,
      eventsByActor,
      changesTimeline: timelineRows,
      deletedResources: deletedResourcesRows,
      mostModifiedResources: mostModifiedRows,
    },
  });
};

const escapeCsv = (value) => {
  const asString = String(value ?? '');
  if (/[",\n]/.test(asString)) {
    return `"${asString.replace(/"/g, '""')}"`;
  }

  return asString;
};

const exportAuditLogsCsv = async (req, res) => {
  const filter = await buildFilter(req.query);

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(50000).lean();

  const headers = [
    'createdAt',
    'eventType',
    'action',
    'actorType',
    'actorId',
    'actorName',
    'resourceType',
    'resourceId',
    'resourceName',
    'ipAddress',
    'notes',
  ];

  const rows = logs.map((log) => [
    new Date(log.createdAt).toISOString(),
    log.eventType || '',
    log.action || '',
    log.actor?.type || log.actorRole || '',
    log.actor?.id || log.actorId || '',
    log.actor?.name || '',
    log.resource?.type || log.targetType || '',
    log.resource?.id || log.targetId || '',
    log.resource?.name || '',
    log.metadata?.ipAddress || '',
    log.notes || '',
  ]);

  const csvLines = [headers, ...rows].map((row) => row.map(escapeCsv).join(','));
  const csv = csvLines.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);

  return res.status(HTTP_STATUS.OK).send(csv);
};

module.exports = {
  listAuditLogs,
  getAuditLogById,
  getAuditAnalytics,
  exportAuditLogsCsv,
};
