const sendSuccess = (res, { statusCode = 200, message = 'Success', data = {} }) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
};

module.exports = {
  sendSuccess,
};
