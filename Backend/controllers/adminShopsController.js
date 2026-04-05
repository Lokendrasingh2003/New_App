const Shop = require('../models/Shop');
const Shopkeeper = require('../models/Shopkeeper');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const City = require('../models/City');
const ApiError = require('../utils/apiError');
const { decryptField } = require('../utils/secureField');
const { sendSuccess } = require('../utils/response');
const { sendUserNotification } = require('../services/userNotificationService');
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

const ensureUserPromotedToShopkeeper = async ({ user, shop, city }) => {
  const fullUser = await User.findById(user._id).select('+password');

  if (!fullUser) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  if (!fullUser.password) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'User password is missing. User must set password before shop approval.',
      ERROR_CODES.VALIDATION_ERROR
    );
  }

  let shopkeeper = await Shopkeeper.findOne({ phone: fullUser.phone });

  if (!shopkeeper) {
    shopkeeper = await Shopkeeper.create({
      phone: fullUser.phone,
      password: fullUser.password,
      email: null,
      personalInfo: {
        name: fullUser.name || shop.contactName || shop.shopName,
        address: shop.addressLine1 || null,
        city: city?.name || shop.area || 'Unknown',
        pincode: shop.pincode || null,
      },
      businessInfo: {
        businessName: shop.shopName,
        registrationType: 'PROPRIETOR',
        registrationNumber: null,
      },
      verification: {
        emailVerified: Boolean(fullUser.email),
        phoneVerified: fullUser.isVerified === true,
        gstVerified: Boolean(shop.verification?.gstNumber),
        businessDetailsVerified: true,
        bankDetailsVerified: false,
      },
      bankDetails: {
        accountHolderName: shop.registrationDetails?.bankAccountHolderName || null,
        accountNumber: null,
        ifscCode: shop.registrationDetails?.bankIfscCode || null,
        bankName: null,
      },
      status: 'ACTIVE',
      shopId: shop._id,
    });
  } else {
    shopkeeper.password = fullUser.password;
    shopkeeper.email = shopkeeper.email || null;
    shopkeeper.personalInfo = {
      ...(shopkeeper.personalInfo || {}),
      name: shopkeeper.personalInfo?.name || fullUser.name || shop.contactName || shop.shopName,
      address: shopkeeper.personalInfo?.address || shop.addressLine1 || null,
      city: shopkeeper.personalInfo?.city || city?.name || shop.area || 'Unknown',
      pincode: shopkeeper.personalInfo?.pincode || shop.pincode || null,
    };
    shopkeeper.businessInfo = {
      ...(shopkeeper.businessInfo || {}),
      businessName: shopkeeper.businessInfo?.businessName || shop.shopName,
      registrationType: shopkeeper.businessInfo?.registrationType || 'PROPRIETOR',
      registrationNumber: shopkeeper.businessInfo?.registrationNumber || null,
    };
    if (!shopkeeper.shopId) {
      shopkeeper.shopId = shop._id;
    }
    await shopkeeper.save();
  }

  fullUser.role = 'SHOPKEEPER';
  fullUser.shopkeeperId = shopkeeper._id;
  fullUser.shopId = shop._id;
  await fullUser.save();

  shop.ownerId = String(shopkeeper._id);
  shop.ownerType = 'SHOPKEEPER';
  shop.contactName = fullUser.name || shop.contactName || shop.shopName;
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

const mapUserOwner = (owner) => {
  if (!owner) {
    return null;
  }

  return {
    id: owner._id,
    phone: owner.phone,
    email: owner.email,
    name: owner.name || null,
    status: 'ACTIVE',
    verification: {
      phoneVerified: owner.isVerified === true,
      gstVerified: false,
      businessDetailsVerified: false,
    },
  };
};

const loadShopWithOwner = async (shopId) => {
  const shop = await Shop.findById(shopId).lean();
  if (!shop) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop not found.', ERROR_CODES.SHOP_NOT_FOUND);
  }

  const owner = await Shopkeeper.findById(shop.ownerId).lean();
  const userOwner = owner ? null : await User.findById(shop.ownerId).lean();
  const city = await City.findById(shop.cityId).lean();

  return { shop, owner, userOwner, city };
};

const resolveOwnerForShop = async (shop) => {
  const shopkeeperOwner = await Shopkeeper.findById(shop.ownerId);
  if (shopkeeperOwner) {
    return {
      kind: 'SHOPKEEPER',
      shopkeeperOwner,
      userOwner: null,
      phone: shopkeeperOwner.phone || shop.phone,
      displayOwner: mapOwner(shopkeeperOwner.toObject()),
    };
  }

  const userOwner = await User.findById(shop.ownerId);
  if (userOwner) {
    return {
      kind: 'USER',
      shopkeeperOwner: null,
      userOwner,
      phone: userOwner.phone || shop.phone,
      displayOwner: mapUserOwner(userOwner.toObject()),
    };
  }

  throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Shop owner not found.', ERROR_CODES.USER_NOT_FOUND);
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

  const userMatches = await User.find(
    {
      $or: [
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ],
    },
    { _id: 1 }
  )
    .lean()
    .then((rows) => rows.map((row) => String(row._id)));

  if (userMatches.length > 0) {
    filter.$or.push({ ownerId: { $in: userMatches } });
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
  const userOwners = await User.find({ _id: { $in: ownerIds } }).lean();
  const ownerMap = new Map(owners.map((owner) => [String(owner._id), owner]));
  const userOwnerMap = new Map(userOwners.map((owner) => [String(owner._id), owner]));

  const payload = shops.map((shop) => ({
    id: shop._id,
    shopName: shop.shopName,
    status: shop.status,
    cityId: shop.cityId,
    createdAt: shop.createdAt,
    owner: mapOwner(ownerMap.get(String(shop.ownerId))) || mapUserOwner(userOwnerMap.get(String(shop.ownerId))),
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
  const { shop, owner, userOwner, city } = await loadShopWithOwner(req.params.shopId);

  const earningsFilter = {
    shopId: shop._id,
    status: ORDER_STATUS.DELIVERED,
  };

  const [totalOrders, productCount, earningsAgg] = await Promise.all([
    Order.countDocuments({ shopId: shop._id }),
    Product.countDocuments({ shopId: shop._id, isDeleted: false }),
    Order.aggregate([
      { $match: earningsFilter },
      { $group: { _id: null, totalEarnings: { $sum: '$pricing.total' } } },
    ]),
  ]);

  const activeSubscriptions = shop.subscription?.isActive ? 1 : 0;
  const totalEarnings = Number(Number(earningsAgg?.[0]?.totalEarnings ?? shop.stats?.totalEarnings ?? 0).toFixed(2));
  const commissionRate = Number(owner?.commissionPreference?.percentage || 3);
  const commission = Number(((totalEarnings * commissionRate) / 100).toFixed(2));
  const payableAmount = Number((totalEarnings - commission).toFixed(2));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Admin shop details fetched successfully.',
    data: {
      shop,
      owner: mapOwner(owner) || mapUserOwner(userOwner),
      city,
      registration: {
        businessProofUrl: shop.registrationDetails?.businessProofUrl || null,
        identityProofUrl: shop.registrationDetails?.identityProofUrl || null,
        gstNumber: shop.verification?.gstNumber || null,
        bankAccountHolderName: shop.registrationDetails?.bankAccountHolderName || null,
        bankIfscCode: shop.registrationDetails?.bankIfscCode || null,
        bankAccountNumberMasked: (() => {
          const value = decryptField(shop.registrationDetails?.bankAccountNumberEncrypted || '');
          if (!value) {
            return null;
          }
          if (value.length <= 4) {
            return value;
          }
          return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
        })(),
        submittedAt: shop.registrationDetails?.submittedAt || null,
        reviewedAt: shop.registrationDetails?.reviewedAt || null,
        reviewStatus: shop.registrationDetails?.reviewStatus || null,
        rejectionReason: shop.registrationDetails?.rejectionReason || null,
      },
      stats: {
        totalOrders,
        earnings: totalEarnings,
        commission,
        payableAmount,
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

  const resolvedOwner = await resolveOwnerForShop(shop);

  if (resolvedOwner.kind === 'SHOPKEEPER') {
    ensureApprovalVerification(resolvedOwner.shopkeeperOwner);
  }

  if (resolvedOwner.kind === 'USER') {
    const city = await City.findById(shop.cityId).lean();
    await ensureUserPromotedToShopkeeper({
      user: resolvedOwner.userOwner,
      shop,
      city,
    });
  }

  shop.status = SHOP_STATUS.APPROVED;
  shop.publicVisible = true;
  shop.isActive = true;
  shop.verification = {
    ...(shop.verification || {}),
    status: 'APPROVED',
    approvedAt: new Date(),
  };
  shop.registrationDetails = {
    ...(shop.registrationDetails || {}),
    reviewStatus: 'APPROVED',
    reviewedAt: new Date(),
    rejectionReason: null,
  };

  await shop.save();

  await sendShopkeeperStatusSms({
    phone: resolvedOwner.phone,
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

  const resolvedOwner = await resolveOwnerForShop(shop);

  shop.status = SHOP_STATUS.REJECTED;
  shop.publicVisible = false;
  shop.isActive = false;
  shop.verification = {
    ...(shop.verification || {}),
    status: 'REJECTED',
  };
  shop.registrationDetails = {
    ...(shop.registrationDetails || {}),
    reviewStatus: 'REJECTED',
    reviewedAt: new Date(),
    rejectionReason: reason || null,
  };

  await shop.save();

  await sendShopkeeperStatusSms({
    phone: resolvedOwner.phone,
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

  const resolvedOwner = await resolveOwnerForShop(shop);

  shop.status = SHOP_STATUS.SUSPENDED;
  shop.publicVisible = false;
  shop.isActive = false;
  await shop.save();


  await sendShopkeeperStatusSms({
    phone: resolvedOwner.phone,
    status: 'SUSPENDED',
    shopName: shop.shopName,
    reason,
  });

  // Send notification to shop owner
  await sendUserNotification({
    userId: resolvedOwner._id,
    type: 'status',
    title: 'Shop Suspended',
    message: reason || 'Your shop has been suspended by admin. Please contact support.',
    deepLink: { screen: 'ShopRegistration' },
    meta: { shopId: shop._id, status: 'SUSPENDED' },
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

  const filter = {
    shopId: shop._id,
    status: ORDER_STATUS.DELIVERED,
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
