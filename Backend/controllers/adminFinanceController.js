const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const Payout = require('../models/Payout');
const Shop = require('../models/Shop');
const Shopkeeper = require('../models/Shopkeeper');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { decryptField } = require('../utils/secureField');
const { resolveDefaultCommission, resolveShopCommission, calculateCommissionAmount } = require('../services/commissionService');
const { sendPayoutApproved, sendPayoutCompleted, sendPaymentFailed } = require('../services/notificationService');
const { HTTP_STATUS, ERROR_CODES, ORDER_STATUS, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const sanitizeDateRange = ({ dateFrom, dateTo }) => {
  const range = {};

  if (dateFrom) {
    range.$gte = new Date(dateFrom);
  }

  if (dateTo) {
    range.$lte = new Date(dateTo);
  }

  return Object.keys(range).length > 0 ? range : null;
};

const listPayments = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.method) {
    filter.method = req.query.method;
  }

  const dateRange = sanitizeDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Payment.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payments fetched successfully.',
    data: {
      payments,
      pagination: { total, limit, offset },
    },
  });
};

const getPaymentStats = async (req, res) => {
  const dateRange = sanitizeDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });

  const filter = {};
  if (dateRange) {
    filter.createdAt = dateRange;
  }

  const [totalPayments, successCount, failedCount, pendingCount, amountAgg] = await Promise.all([
    Payment.countDocuments(filter),
    Payment.countDocuments({ ...filter, status: 'SUCCESS' }),
    Payment.countDocuments({ ...filter, status: 'FAILED' }),
    Payment.countDocuments({ ...filter, status: 'PENDING' }),
    Payment.aggregate([{ $match: filter }, { $group: { _id: null, totalAmount: { $sum: '$amount' } } }]),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment stats fetched successfully.',
    data: {
      totalPayments,
      successCount,
      failedCount,
      pendingCount,
      totalAmount: Number(Number(amountAgg?.[0]?.totalAmount || 0).toFixed(2)),
    },
  });
};

const verifyPaymentByAdmin = async (req, res) => {
  const { paymentId } = req.params;
  const verificationCode = String(req.body.verificationCode || '').trim();
  const expectedCode = String(process.env.ADMIN_PAYMENT_VERIFICATION_CODE || '123456').trim();

  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payment not found.', ERROR_CODES.ORDER_NOT_FOUND);
  }

  const order = await Order.findById(payment.orderId);
  const user = await User.findById(payment.userId);

  if (verificationCode !== expectedCode) {
    payment.status = 'FAILED';
    payment.paymentGatewayResponse = {
      ...(payment.paymentGatewayResponse || {}),
      adminVerification: 'FAILED',
      verifiedAt: new Date(),
    };
    await payment.save();

    if (order) {
      order.payment.status = 'FAILED';
      order.payment.failureReason = 'Admin verification failed';
      await order.save();
    }

    await sendPaymentFailed({ user, payment });

    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid verification code.', ERROR_CODES.PAYMENT_VERIFICATION_FAILED);
  }

  payment.status = 'SUCCESS';
  payment.paymentGatewayResponse = {
    ...(payment.paymentGatewayResponse || {}),
    adminVerification: 'SUCCESS',
    verifiedAt: new Date(),
  };
  await payment.save();

  if (order) {
    order.payment.status = 'SUCCESS';
    await order.save();
  }

  await logAudit(
    AUDIT_EVENT_TYPES.PAYMENT_VERIFY_RETRIED,
    buildActorFromRequest(req),
    { type: 'PAYMENT', id: payment._id, name: String(payment.orderId || payment._id) },
    'UPDATED',
    { before: { status: 'PENDING' }, after: { status: payment.status } },
    'Payment verification retried by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payment verified successfully.',
    data: { success: true, payment },
  });
};

const getDefaultCommission = async (_req, res) => {
  const entry = await resolveDefaultCommission(new Date());

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Default commission fetched successfully.',
    data: {
      percentage: entry.percentage,
      effectiveFrom: entry.effectiveFrom,
    },
  });
};

const createDefaultCommission = async (req, res) => {
  const percentage = Number(req.body.percentage);

  if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Commission percentage must be between 1 and 100.', ERROR_CODES.VALIDATION_ERROR);
  }

  const commission = await Commission.create({
    type: 'DEFAULT',
    shopId: null,
    percentage,
    effectiveFrom: new Date(),
    effectiveTill: null,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.COMMISSION_UPDATED,
    buildActorFromRequest(req),
    { type: 'COMMISSION', id: commission._id, name: 'default-commission' },
    'UPDATED',
    { before: null, after: commission.toObject() },
    'Default commission updated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Default commission created successfully.',
    data: { success: true, commission },
  });
};

const createOverrideCommission = async (req, res) => {
  const { shopId, percentage } = req.body;
  const effectiveFrom = req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : new Date();
  const effectiveTill = req.body.effectiveTill ? new Date(req.body.effectiveTill) : null;

  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const defaultCommission = await resolveDefaultCommission(effectiveFrom);
  if (Number(defaultCommission.percentage) === Number(percentage)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Override percentage cannot be same as default commission percentage.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  const commission = await Commission.create({
    type: 'SHOP_OVERRIDE',
    shopId,
    percentage,
    effectiveFrom,
    effectiveTill,
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Shop commission override created successfully.',
    data: { success: true, commission },
  });
};

const listCommissionOverrides = async (_req, res) => {
  const overrides = await Commission.find({ type: 'SHOP_OVERRIDE' }).sort({ createdAt: -1 }).lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Commission overrides fetched successfully.',
    data: { overrides },
  });
};

const deleteCommissionOverride = async (req, res) => {
  const { overrideId } = req.params;

  const deleted = await Commission.findOneAndDelete({ _id: overrideId, type: 'SHOP_OVERRIDE' });
  if (!deleted) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Commission override not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Commission override deleted successfully.',
    data: { success: true, message: 'Override deleted successfully.' },
  });
};

const listPayouts = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  if (req.query.shopId) {
    filter.shopId = req.query.shopId;
  }

  const dateRange = sanitizeDateRange({ dateFrom: req.query.dateFrom, dateTo: req.query.dateTo });
  if (dateRange) {
    filter.periodStart = dateRange;
  }

  const [payouts, total] = await Promise.all([
    Payout.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Payout.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payouts fetched successfully.',
    data: {
      payouts,
      pagination: { total, limit, offset },
    },
  });
};

const getPayoutById = async (req, res) => {
  const payout = await Payout.findById(req.params.payoutId).lean();
  if (!payout) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payout not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payout fetched successfully.',
    data: { payout },
  });
};

const approvePayout = async (req, res) => {
  const payout = await Payout.findById(req.params.payoutId);
  if (!payout) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payout not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (payout.status !== 'PENDING') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only PENDING payout can be approved.', ERROR_CODES.VALIDATION_ERROR);
  }

  payout.status = 'APPROVED';
  payout.notes = req.body.notes ? String(req.body.notes).trim() : payout.notes;
  payout.approvedBy = req.user?.id && mongoose.isValidObjectId(req.user.id) ? req.user.id : null;
  payout.approvedAt = new Date();

  await payout.save();

  await logAudit(
    AUDIT_EVENT_TYPES.PAYOUT_APPROVED,
    buildActorFromRequest(req),
    { type: 'PAYOUT', id: payout._id, name: String(payout.shopId || payout._id) },
    'APPROVED',
    { before: { status: 'PENDING' }, after: { status: payout.status, notes: payout.notes || null } },
    'Payout approved by super admin.',
    buildMetadataFromRequest(req)
  );

  const shop = await Shop.findById(payout.shopId).lean();
  const owner = shop ? await Shopkeeper.findById(shop.ownerId).lean() : null;
  await sendPayoutApproved({ shopkeeper: owner, payout });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payout approved successfully.',
    data: { success: true, payout },
  });
};

const rejectPayout = async (req, res) => {
  const payout = await Payout.findById(req.params.payoutId);
  if (!payout) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payout not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (payout.status !== 'PENDING') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only PENDING payout can be rejected.', ERROR_CODES.VALIDATION_ERROR);
  }

  payout.status = 'REJECTED';
  payout.notes = String(req.body.reason || '').trim();
  await payout.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payout rejected successfully.',
    data: { success: true, message: 'Payout rejected successfully.' },
  });
};

const completePayout = async (req, res) => {
  const payout = await Payout.findById(req.params.payoutId);
  if (!payout) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Payout not found.', ERROR_CODES.VALIDATION_ERROR);
  }

  if (payout.status !== 'APPROVED') {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Only APPROVED payout can be completed.', ERROR_CODES.VALIDATION_ERROR);
  }

  payout.status = 'COMPLETED';
  payout.transactionRef = String(req.body.transactionRef || '').trim();
  payout.completedAt = new Date();
  await payout.save();

  await logAudit(
    AUDIT_EVENT_TYPES.PAYOUT_COMPLETED,
    buildActorFromRequest(req),
    { type: 'PAYOUT', id: payout._id, name: String(payout.shopId || payout._id) },
    'UPDATED',
    { before: { status: 'APPROVED' }, after: { status: payout.status, transactionRef: payout.transactionRef } },
    'Payout marked completed by super admin.',
    buildMetadataFromRequest(req)
  );

  const shop = await Shop.findById(payout.shopId).lean();
  const owner = shop ? await Shopkeeper.findById(shop.ownerId).lean() : null;
  await sendPayoutCompleted({ shopkeeper: owner, payout });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payout completed successfully.',
    data: { success: true, payout },
  });
};

const generatePayouts = async (req, res) => {
  const forDate = new Date(req.body.forDate);
  if (Number.isNaN(forDate.getTime())) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid forDate.', ERROR_CODES.VALIDATION_ERROR);
  }

  const periodEnd = new Date(forDate);
  const periodStart = new Date(forDate);
  periodStart.setDate(periodStart.getDate() - 30);

  const shops = await Shop.find({}).lean();

  let payoutsGenerated = 0;

  for (const shop of shops) {
    const existing = await Payout.exists({
      shopId: shop._id,
      periodStart,
      periodEnd,
    });

    if (existing) {
      continue;
    }

    const [ordersProcessed, grossAgg] = await Promise.all([
      Order.countDocuments({
        shopId: shop._id,
        status: ORDER_STATUS.DELIVERED,
        createdAt: { $gte: periodStart, $lte: periodEnd },
      }),
      Order.aggregate([
        {
          $match: {
            shopId: new mongoose.Types.ObjectId(String(shop._id)),
            status: ORDER_STATUS.DELIVERED,
            createdAt: { $gte: periodStart, $lte: periodEnd },
          },
        },
        { $group: { _id: null, grossAmount: { $sum: '$pricing.total' } } },
      ]),
    ]);

    const grossAmount = Number(Number(grossAgg?.[0]?.grossAmount || 0).toFixed(2));
    const commissionInfo = await resolveShopCommission({ shopId: shop._id, at: periodEnd });
    const commission = calculateCommissionAmount({ amount: grossAmount, percentage: commissionInfo.percentage });
    const payableAmount = Number((grossAmount - commission).toFixed(2));

    const owner = await Shopkeeper.findById(shop.ownerId).lean();
    const accountNumberRaw = owner?.bankDetails?.accountNumber || null;
    const accountNumber = accountNumberRaw && String(accountNumberRaw).includes(':') ? decryptField(accountNumberRaw) : accountNumberRaw;

    await Payout.create({
      shopId: shop._id,
      periodStart,
      periodEnd,
      ordersProcessed,
      grossAmount,
      commission,
      payableAmount,
      status: 'PENDING',
      bankDetails: {
        accountNumber: accountNumber || null,
        ifscCode: owner?.bankDetails?.ifscCode || null,
        bankName: owner?.bankDetails?.bankName || null,
      },
      transactionRef: null,
      approvedBy: null,
      approvedAt: null,
      completedAt: null,
      notes: null,
    });

    payoutsGenerated += 1;
  }

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Payout generation completed.',
    data: { success: true, payoutsGenerated },
  });
};

module.exports = {
  listPayments,
  getPaymentStats,
  verifyPaymentByAdmin,
  getDefaultCommission,
  createDefaultCommission,
  createOverrideCommission,
  listCommissionOverrides,
  deleteCommissionOverride,
  listPayouts,
  getPayoutById,
  approvePayout,
  rejectPayout,
  completePayout,
  generatePayouts,
};
