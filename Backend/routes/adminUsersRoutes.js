const express = require('express');
const { verifySuperAdmin } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/authGuards');
const { validateAdminUsersListQuery, validateAdminUserIdParam } = require('../middleware/validation');
const { listUsers, getUserById } = require('../controllers/adminUsersController');

const router = express.Router();

router.use(verifySuperAdmin, requireAdmin);

router.get('/', validateAdminUsersListQuery(), listUsers);
router.get('/:userId', validateAdminUserIdParam(), getUserById);

module.exports = router;
