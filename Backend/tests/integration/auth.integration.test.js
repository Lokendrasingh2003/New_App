require('../helpers/envSetup');
require('../helpers/testSetup');

const bcrypt = require('bcryptjs');
const { request, app } = require('../helpers/testHelpers');
const User = require('../../models/User');

describe('Auth routes', () => {
  test('POST /api/auth/send-otp returns success for valid phone', async () => {
    const response = await request(app).post('/api/auth/send-otp').send({
      phone: '9999999990',
    });

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('success', true);
  });

  test('POST /api/auth/login/user returns token for verified user', async () => {
    await User.create({
      phone: '9999999992',
      name: 'Auth User',
      isVerified: true,
      referralCode: 'AUTHU01',
      addresses: [],
    });

    const response = await request(app).post('/api/auth/login/user').send({
      phone: '9999999992',
      otp: '123456',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('accessToken');
    expect(response.body.data).toHaveProperty('refreshToken');
  });

  test('POST /api/auth/login/shopkeeper returns token for active shopkeeper', async () => {
    const password = await bcrypt.hash('Strong@123', 10);
    const Shopkeeper = require('../../models/Shopkeeper');

    await Shopkeeper.create({
      phone: '9999999993',
      password,
      email: 'auth-shopkeeper@test.local',
      personalInfo: { name: 'Shopkeeper', address: 'Addr', city: 'Mumbai', pincode: '400001' },
      businessInfo: { businessName: 'Store', registrationType: 'PROPRIETOR', registrationNumber: 'REG100' },
      status: 'ACTIVE',
    });

    const response = await request(app).post('/api/auth/login/shopkeeper').send({
      phone: '9999999993',
      password: 'Strong@123',
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('accessToken');
  });
});
