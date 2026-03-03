require('../helpers/envSetup');

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../../utils/jwt');
const { AUTH_ACTOR_TYPES } = require('../../config/constants');
const { passwordRegex } = require('../../utils/validators');

describe('Auth utilities', () => {
  test('generateToken and verifyToken work for user actor', () => {
    const payload = { sub: '507f1f77bcf86cd799439011', phone: '9999999990', sid: 'sid-1' };
    const token = generateToken(payload, AUTH_ACTOR_TYPES.USER);

    expect(typeof token).toBe('string');

    const decoded = verifyToken(token, AUTH_ACTOR_TYPES.USER);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.phone).toBe(payload.phone);
  });

  test('verifyToken throws for invalid token', () => {
    expect(() => verifyToken('invalid-token', AUTH_ACTOR_TYPES.USER)).toThrow(jwt.JsonWebTokenError);
  });

  test('passwordRegex validates complexity', () => {
    expect(passwordRegex.test('Strong@123')).toBe(true);
    expect(passwordRegex.test('weakpass')).toBe(false);
    expect(passwordRegex.test('NoSpecial123')).toBe(false);
  });
});
