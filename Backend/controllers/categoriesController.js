const Category = require('../models/Category');
const { sendSuccess } = require('../utils/response');
const { HTTP_STATUS } = require('../config/constants');

const toInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const getCategories = async (req, res) => {
  const limit = Math.min(toInteger(req.query.limit, 100), 200);
  const offset = toInteger(req.query.offset, 0);

  const query = { isActive: true, status: 'PUBLISHED' };

  const [categories, total] = await Promise.all([
    Category.find(query)
      .sort({ displayOrder: 1, name: 1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Category.countDocuments(query),
  ]);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Categories fetched successfully.',
    data: {
      categories,
      pagination: {
        total,
        limit,
        offset,
      },
    },
  });
};

module.exports = {
  getCategories,
};
