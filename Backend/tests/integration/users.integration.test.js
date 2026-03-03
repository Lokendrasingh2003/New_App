require('../helpers/envSetup');
require('../helpers/testSetup');

const { request, app, generateUserToken } = require('../helpers/testHelpers');
const { createUser } = require('../helpers/mockData');

describe('Users routes', () => {
  test('GET /api/users/me returns profile for authenticated user', async () => {
    const user = await createUser({ phone: '9999999994', referralCode: 'USRME01' });
    const token = generateUserToken(user._id, user.phone);

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('_id', String(user._id));
  });

  test('PUT /api/users/me updates profile fields', async () => {
    const user = await createUser({ phone: '9999999995', referralCode: 'USRME02' });
    const token = generateUserToken(user._id, user.phone);

    const response = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('name', 'Updated Name');
  });
});
