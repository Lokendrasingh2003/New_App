const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const City = require('../models/City');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const parseIntSafe = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const toObjectId = (value) => {
  if (!value || !mongoose.isValidObjectId(String(value))) {
    return null;
  }

  return new mongoose.Types.ObjectId(String(value));
};

const buildListFilter = ({ search, verified, cityId, createdFrom, createdTo }) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { phone: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { referralCode: { $regex: search, $options: 'i' } },
    ];
  }

  if (verified !== undefined) {
    filter.isVerified = String(verified).toLowerCase() === 'true';
  }

  const cityObjectId = toObjectId(cityId);
  if (cityObjectId) {
    filter.cityId = cityObjectId;
  }

  if (createdFrom || createdTo) {
    filter.createdAt = {};

    if (createdFrom) {
      filter.createdAt.$gte = new Date(createdFrom);
    }

    if (createdTo) {
      filter.createdAt.$lte = new Date(createdTo);
    }
  }

  return filter;
};

const listUsers = async (req, res) => {
  const limit = Math.min(parseIntSafe(req.query.limit, 20), 100);
  const offset = parseIntSafe(req.query.offset, 0);
  const filter = buildListFilter({
    search: String(req.query.search || '').trim(),
    verified: req.query.verified,
    cityId: req.query.cityId,
    createdFrom: req.query.createdFrom,
    createdTo: req.query.createdTo,
  });

  const [users, total] = await Promise.all([
    User.find(filter)
      .select({
        phone: 1,
        isVerified: 1,
        name: 1,
        email: 1,
        cityId: 1,
        addresses: 1,
        savedPaymentMethods: 1,
        referralCode: 1,
        referredBy: 1,
        role: 1,
        shopkeeperId: 1,
        shopId: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const userObjectIds = users.map((user) => user._id);
  const userIdStrings = users.map((user) => String(user._id));
  const cityObjectIds = users.map((user) => user.cityId).filter(Boolean);

  const [ordersAgg, shopsAgg, cities] = await Promise.all([
    userObjectIds.length
      ? Order.aggregate([
          { $match: { userId: { $in: userObjectIds }, status: 'DELIVERED' } },
          {
            $group: {
              _id: '$userId',
              orderCount: { $sum: 1 },
              totalSpent: { $sum: '$pricing.total' },
              lastOrderAt: { $max: '$createdAt' },
            },
          },
        ])
      : [],
    userIdStrings.length
      ? Shop.aggregate([
          {
            $match: {
              ownerType: 'USER',
              ownerId: { $in: userIdStrings },
            },
          },
          {
            $group: {
              _id: '$ownerId',
              applications: { $sum: 1 },
              approved: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0],
                },
              },
              pending: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'PENDING_APPROVAL'] }, 1, 0],
                },
              },
              rejected: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0],
                },
              },
            },
          },
        ])
      : [],
    cityObjectIds.length ? City.find({ _id: { $in: cityObjectIds } }, { _id: 1, name: 1 }).lean() : [],
  ]);

  const orderMap = new Map(ordersAgg.map((item) => [String(item._id), item]));
  const shopMap = new Map(shopsAgg.map((item) => [String(item._id), item]));
  const cityMap = new Map(cities.map((city) => [String(city._id), city.name]));

  const payload = users.map((user) => {
    const orderStats = orderMap.get(String(user._id));
    const shopStats = shopMap.get(String(user._id));
    const defaultAddress = Array.isArray(user.addresses)
      ? user.addresses.find((address) => address.isDefault) || user.addresses[0]
      : null;

    return {
      id: user._id,
      phone: user.phone,
      isVerified: user.isVerified,
      name: user.name,
      email: user.email,
      cityId: user.cityId || null,
      cityName: user.cityId ? cityMap.get(String(user.cityId)) || null : null,
      referralCode: user.referralCode || null,
      referredBy: user.referredBy || null,
      role: user.role || 'USER',
      shopkeeperId: user.shopkeeperId || null,
      shopId: user.shopId || null,
      defaultAddress,
      addressesCount: Array.isArray(user.addresses) ? user.addresses.length : 0,
      savedPaymentMethodsCount: Array.isArray(user.savedPaymentMethods) ? user.savedPaymentMethods.length : 0,
      orderStats: {
        count: Number(orderStats?.orderCount || 0),
        totalSpent: Number(Number(orderStats?.totalSpent || 0).toFixed(2)),
        lastOrderAt: orderStats?.lastOrderAt || null,
      },
      shopRegistrationStats: {
        applications: Number(shopStats?.applications || 0),
        approved: Number(shopStats?.approved || 0),
        pending: Number(shopStats?.pending || 0),
        rejected: Number(shopStats?.rejected || 0),
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  });

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Users fetched successfully.',
    data: {
      users: payload,
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

const getUserById = async (req, res) => {
  const user = await User.findById(req.params.userId)
    .select({
      phone: 1,
      isVerified: 1,
      name: 1,
      email: 1,
      cityId: 1,
      profileImage: 1,
      addresses: 1,
      savedPaymentMethods: 1,
      referralCode: 1,
      referredBy: 1,
      role: 1,
      shopkeeperId: 1,
      shopId: 1,
      createdAt: 1,
      updatedAt: 1,
    })
    .lean();

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  const [city, orders, ordersAgg, registrations] = await Promise.all([
    user.cityId ? City.findById(user.cityId, { _id: 1, name: 1 }).lean() : null,
    Order.find({ userId: user._id }, { orderId: 1, status: 1, pricing: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    Order.aggregate([
      { $match: { userId: user._id, status: 'DELIVERED' } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]),
    Shop.find(
      { ownerType: 'USER', ownerId: String(user._id) },
      { _id: 1, shopName: 1, status: 1, createdAt: 1, registrationDetails: 1 }
    )
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const orderStats = ordersAgg[0] || {};

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'User details fetched successfully.',
    data: {
      user: {
        id: user._id,
        phone: user.phone,
        isVerified: user.isVerified,
        name: user.name,
        email: user.email,
        cityId: user.cityId || null,
        cityName: city?.name || null,
        profileImage: user.profileImage || null,
        addresses: user.addresses || [],
        savedPaymentMethods: user.savedPaymentMethods || [],
        referralCode: user.referralCode || null,
        referredBy: user.referredBy || null,
        role: user.role || 'USER',
        shopkeeperId: user.shopkeeperId || null,
        shopId: user.shopId || null,
        orderStats: {
          count: Number(orderStats.orderCount || 0),
          totalSpent: Number(Number(orderStats.totalSpent || 0).toFixed(2)),
          lastOrderAt: orderStats.lastOrderAt || null,
        },
        recentOrders: orders.map((order) => ({
          id: order._id,
          orderId: order.orderId,
          status: order.status,
          total: Number(order.pricing?.total || 0),
          createdAt: order.createdAt,
        })),
        shopRegistrations: registrations.map((shop) => ({
          id: shop._id,
          shopName: shop.shopName,
          status: shop.status,
          submittedAt: shop.registrationDetails?.submittedAt || shop.createdAt,
          reviewedAt: shop.registrationDetails?.reviewedAt || null,
          rejectionReason: shop.registrationDetails?.rejectionReason || null,
        })),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
};

module.exports = {
  listUsers,
  getUserById,
};
