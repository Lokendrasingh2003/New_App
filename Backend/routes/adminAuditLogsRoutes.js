const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const {
  validateAdminAuditLogsListQuery,
  validateAdminAuditLogIdParam,
  validateAdminAuditAnalyticsQuery,
  validateAdminAuditExportQuery,
} = require('../middleware/validation');
const {
  listAuditLogs,
  getAuditLogById,
  getAuditAnalytics,
  exportAuditLogsCsv,
} = require('../controllers/adminAuditController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminAuditLogsListQuery(), listAuditLogs);
router.get('/analytics', validateAdminAuditAnalyticsQuery(), getAuditAnalytics);
router.post('/export', validateAdminAuditExportQuery(), exportAuditLogsCsv);
router.get('/:logId', validateAdminAuditLogIdParam(), getAuditLogById);

module.exports = router;
