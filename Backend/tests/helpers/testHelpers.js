const request = require('supertest');
const app = require('../../app');
const { generateToken } = require('../../utils/jwt');
const { AUTH_ACTOR_TYPES } = require('../../config/constants');

const generateUserToken = (userId, phone = '9999999990') => {
  return generateToken(
    {
      sub: String(userId),
      phone,
      sid: `sid-${Date.now()}`,
    },
    AUTH_ACTOR_TYPES.USER
  );
};

const authenticatedRequest = (method, url, token) => {
  return request(app)[method](url).set('Authorization', `Bearer ${token}`);
};

const expectSuccessResponse = (response, statusCode) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
};

module.exports = {
  app,
  request,
  generateUserToken,
  authenticatedRequest,
  expectSuccessResponse,
};
