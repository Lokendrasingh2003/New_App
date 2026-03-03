const Shop = require('../models/Shop');
const Shopkeeper = require('../models/Shopkeeper');
const Order = require('../models/Order');
const Product = require('../models/Product');
const City = require('../models/City');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { logAudit, buildActorFromRequest, buildMetadataFromRequest } = require('../utils/auditLogger');
const { HTTP_STATUS, ERROR_CODES, SHOP_STATUS, ORDER_STATUS, AUDIT_EVENT_TYPES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const sendShopkeeperStatusSms = async ({ phone, status, shopName, reason }) => {
  const safePhone = String(phone || '').trim();
  console.log(`[SMS Placeholder] Shop ${status}: ${shopName || 'N/A'} to +91${safePhone}${reason ? ` | ${reason}` : ''}`);
};

const mapOwner = (owner) => {
  if (!owner) {
    return null;
  }

  return {
    id: owner._id,
    phone: owner.phone,
    email: owner.email,
    name: owner.personalInfo?.name || null,
    status: owner.status,
    verification: owner.verification || {},
  };
};

const loadShopWithOwner = async (shopId) => {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const owner = await Shopkeeper.findById(shop.ownerId).lean();
  const city = await City.findById(shop.cityId).lean();

  return { shop, owner, city };
};

const assertTransition = ({ from, to }) => {
  const allowed = {
    [SHOP_STATUS.PENDING]: new Set([SHOP_STATUS.APPROVED, SHOP_STATUS.REJECTED]),
    [SHOP_STATUS.APPROVED]: new Set([SHOP_STATUS.SUSPENDED]),
    [SHOP_STATUS.SUSPENDED]: new Set([SHOP_STATUS.APPROVED]),
    [SHOP_STATUS.REJECTED]: new Set([]),
  };

  if (!allowed[from]?.has(to)) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Invalid status transition from ${from} to ${to}.`,
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const ensureApprovalVerification = (owner) => {
  const verification = owner?.verification || {};
  const complete =
    verification.phoneVerified === true &&
    verification.gstVerified === true &&
    verification.businessDetailsVerified === true;

  if (!complete) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Shop cannot be approved until phone, GST, and business details are verified.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
};

const buildListFilter = async (query) => {
  const filter = {};

  if (query.status) {
    filter.status = query.status;
  }

  if (query.cityId) {
    filter.cityId = query.cityId;
  }

  const search = String(query.search || '').trim();
  if (!search) {
    return filter;
  }

  const ownerMatches = await Shopkeeper.find(
    {
      $or: [
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'personalInfo.name': { $regex: search, $options: 'i' } },
      ],
    },
    { _id: 1 }
  )
    .lean()
    .then((rows) => rows.map((row) => String(row._id)));

  filter.$or = [
    { shopName: { $regex: search, $options: 'i' } },
    { slug: { $regex: search, $options: 'i' } },
    { category: { $regex: search, $options: 'i' } },
    { area: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } },
  ];

  if (ownerMatches.length > 0) {
    filter.$or.push({ ownerId: { $in: ownerMatches } });
  }

  return filter;
};

const listShops = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);

  const filter = await buildListFilter(req.query);

  const [shops, total] = await Promise.all([
    Shop.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit).lean(),
    Shop.countDocuments(filter),
  ]);

  const ownerIds = [...new Set(shops.map((shop) => String(shop.ownerId)).filter(Boolean))];
  const owners = await Shopkeeper.find({ _id: { $in: ownerIds } }).lean();
  const ownerMap = new Map(owners.map((owner) => [String(owner._id), owner]));

  const payload = shops.map((shop) => ({
    id: shop._id,
    shopName: shop.shopName,
    status: shop.status,
    cityId: shop.cityId,
    createdAt: shop.createdAt,
    owner: mapOwner(ownerMap.get(String(shop.ownerId))),
  }));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin shops fetched successfully.',
    data: {
      shops: payload,
      pagination: { total, limit, offset },
    },
  });
};

const getShopByIdForAdmin = async (req, res) => {
  const { shop, owner, city } = await loadShopWithOwner(req.params.shopId);

  const [totalOrders, productCount] = await Promise.all([
    Order.countDocuments({ shopId: shop._id }),
    Product.countDocuments({ shopId: shop._id, isDeleted: false }),
  ]);

  const activeSubscriptions = shop.subscription?.isActive ? 1 : 0;

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin shop details fetched successfully.',
    data: {
      shop,
      owner: mapOwner(owner),
      city,
      stats: {
        totalOrders,
        earnings: Number(shop.stats?.totalEarnings || 0),
        rating: Number(shop.stats?.rating || 0),
        productsCount: productCount,
        activeSubscriptions,
      },
    },
  });
};

const approveShop = async (req, res) => {
  const { shopId } = req.params;
  const notes = req.body.notes ? String(req.body.notes).trim() : null;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  assertTransition({ from: shop.status, to: SHOP_STATUS.APPROVED });

  const owner = await Shopkeeper.findById(shop.ownerId);
  if (!owner) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop owner not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  ensureApprovalVerification(owner);

  shop.status = SHOP_STATUS.APPROVED;
  shop.publicVisible = true;
  shop.isActive = true;
  shop.verification = {
    ...(shop.verification || {}),
    status: 'APPROVED',
    approvedAt: new Date(),
  };

  await shop.save();

  await sendShopkeeperStatusSms({
    phone: owner.phone,
    status: 'APPROVED',
    shopName: shop.shopName,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.SHOP_APPROVED,
    buildActorFromRequest(req),
    { type: 'SHOP', id: shop._id, name: shop.shopName },
    'APPROVED',
    {
      before: { status: SHOP_STATUS.PENDING, publicVisible: false, isActive: false },
      after: { status: shop.status, publicVisible: shop.publicVisible, isActive: shop.isActive },
    },
    notes || 'Shop approved by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop approved successfully.',
    data: { success: true, shop },
  });
};

const rejectShop = async (req, res) => {
  const { shopId } = req.params;
  const reason = String(req.body.reason || '').trim();

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  assertTransition({ from: shop.status, to: SHOP_STATUS.REJECTED });

  const owner = await Shopkeeper.findById(shop.ownerId);
  if (!owner) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop owner not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  shop.status = SHOP_STATUS.REJECTED;
  shop.publicVisible = false;
  shop.isActive = false;
  shop.verification = {
    ...(shop.verification || {}),
    status: 'REJECTED',
  };

  await shop.save();

  await sendShopkeeperStatusSms({
    phone: owner.phone,
    status: 'REJECTED',
    shopName: shop.shopName,
    reason,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.SHOP_REJECTED,
    buildActorFromRequest(req),
    { type: 'SHOP', id: shop._id, name: shop.shopName },
    'REJECTED',
    {
      before: { status: SHOP_STATUS.PENDING, publicVisible: true, isActive: true },
      after: { status: shop.status, publicVisible: shop.publicVisible, isActive: shop.isActive },
    },
    reason || 'Shop rejected by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop rejected successfully.',
    data: { success: true, message: 'Shop rejected successfully.' },
  });
};

const suspendShop = async (req, res) => {
  const { shopId } = req.params;
  const reason = String(req.body.reason || '').trim();

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  assertTransition({ from: shop.status, to: SHOP_STATUS.SUSPENDED });

  const owner = await Shopkeeper.findById(shop.ownerId);
  if (!owner) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop owner not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  shop.status = SHOP_STATUS.SUSPENDED;
  shop.publicVisible = false;
  shop.isActive = false;
  await shop.save();

  await sendShopkeeperStatusSms({
    phone: owner.phone,
    status: 'SUSPENDED',
    shopName: shop.shopName,
    reason,
  });

  await logAudit(
    AUDIT_EVENT_TYPES.SHOP_SUSPENDED,
    buildActorFromRequest(req),
    { type: 'SHOP', id: shop._id, name: shop.shopName },
    'REJECTED',
    {
      before: { status: SHOP_STATUS.APPROVED, publicVisible: true, isActive: true },
      after: { status: shop.status, publicVisible: shop.publicVisible, isActive: shop.isActive },
    },
    reason || 'Shop suspended by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop suspended successfully.',
    data: { success: true, shop },
  });
};

const reactivateShop = async (req, res) => {
  const { shopId } = req.params;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  assertTransition({ from: shop.status, to: SHOP_STATUS.APPROVED });

  shop.status = SHOP_STATUS.APPROVED;
  shop.publicVisible = true;
  shop.isActive = true;
  await shop.save();

  await logAudit(
    AUDIT_EVENT_TYPES.SHOP_UPDATED,
    buildActorFromRequest(req),
    { type: 'SHOP', id: shop._id, name: shop.shopName },
    'UPDATED',
    {
      before: { status: SHOP_STATUS.SUSPENDED, publicVisible: false, isActive: false },
      after: { status: shop.status, publicVisible: shop.publicVisible, isActive: shop.isActive },
    },
    'Shop reactivated by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop reactivated successfully.',
    data: { success: true, shop },
  });
};

const togglePublic = async (req, res) => {
  const { shopId } = req.params;
  const { publicVisible } = req.body;

  const shop = await Shop.findById(shopId);
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  if (shop.status !== SHOP_STATUS.APPROVED && publicVisible === true) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Only APPROVED shops can be made public.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  shop.publicVisible = Boolean(publicVisible);
  await shop.save();

  await logAudit(
    AUDIT_EVENT_TYPES.SHOP_UPDATED,
    buildActorFromRequest(req),
    { type: 'SHOP', id: shop._id, name: shop.shopName },
    'UPDATED',
    { before: null, after: { publicVisible: shop.publicVisible } },
    'Shop public visibility changed by super admin.',
    buildMetadataFromRequest(req)
  );

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop visibility updated successfully.',
    data: { shop },
  });
};

const getShopOrders = async (req, res) => {
  const { shopId } = req.params;

  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const orders = await Order.find({ shopId: shop._id }).sort({ createdAt: -1 }).limit(200).lean();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop orders fetched successfully.',
    data: {
      orders,
    },
  });
};

const getShopEarnings = async (req, res) => {
  const { shopId } = req.params;

  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const owner = await Shopkeeper.findById(shop.ownerId).lean();
  if (!owner) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop owner not found.', ERROR_CODES.SHOPKEEPER_NOT_FOUND);
  }

  const filter = {
    shopId: shop._id,
    status: { $ne: ORDER_STATUS.CANCELLED },
  };

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) {
      filter.createdAt.$gte = new Date(req.query.from);
    }
    if (req.query.to) {
      filter.createdAt.$lte = new Date(req.query.to);
    }
  }

  const [revenueAgg, totalOrders] = await Promise.all([
    Order.aggregate([
      { $match: filter },
      { $group: { _id: null, totalEarnings: { $sum: '$pricing.total' } } },
    ]),
    Order.countDocuments(filter),
  ]);

  const totalEarnings = Number(Number(revenueAgg?.[0]?.totalEarnings || 0).toFixed(2));
  const commissionRate = Number(owner.commissionPreference?.percentage || 3);
  const commission = Number(((totalEarnings * commissionRate) / 100).toFixed(2));
  const payableAmount = Number((totalEarnings - commission).toFixed(2));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Shop earnings fetched successfully.',
    data: {
      totalOrders,
      totalEarnings,
      commission,
      payableAmount,
      payoutHistory: [],
    },
  });
};

module.exports = {
  listShops,
  getShopByIdForAdmin,
  approveShop,
  rejectShop,
  suspendShop,
  reactivateShop,
  togglePublic,
  getShopOrders,
  getShopEarnings,
};
