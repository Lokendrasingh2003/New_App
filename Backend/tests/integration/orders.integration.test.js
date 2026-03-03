require('../helpers/envSetup');
require('../helpers/testSetup');

const { request, app, generateUserToken } = require('../helpers/testHelpers');
const {
  createCity,
  createUser,
  createShopkeeper,
  createCategory,
  createShop,
  createProduct,
  createCart,
} = require('../helpers/mockData');

describe('Orders routes', () => {
  test('POST /api/orders creates order from cart', async () => {
    const city = await createCity({ slug: 'nashik', name: 'Nashik' });
    const owner = await createShopkeeper({ phone: '9999999980', email: 'order-owner@test.local' });
    const category = await createCategory({ slug: 'dairy', name: 'Dairy' });
    const shop = await createShop({ city, ownerId: owner._id, categoryName: category.name, overrides: { slug: 'nashik-store' } });
    const product = await createProduct({ shop, category, overrides: { slug: 'milk-1l', name: 'Milk 1L' } });
    const user = await createUser({ phone: '9999999981', referralCode: 'ORDUSR1' });
    await createCart({ user, shop, product });

    const token = generateUserToken(user._id, user.phone);

    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        addressId: user.addresses[0].id,
        paymentMethod: 'COD',
      });

    expect([200, 201]).toContain(response.status);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body.data).toHaveProperty('_id');
  });

  test('GET /api/orders returns user order history', async () => {
    const user = await createUser({ phone: '9999999982', referralCode: 'ORDUSR2' });
    const token = generateUserToken(user._id, user.phone);

    const response = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data.items || response.body.data)).toBe(true);
  });
});
