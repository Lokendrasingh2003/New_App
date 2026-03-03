const { HTTP_STATUS } = require('../config/constants');

const healthController = (_req, res) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),
    },
    message: 'API is running',
  });
};

module.exports = {
  healthController,
};
