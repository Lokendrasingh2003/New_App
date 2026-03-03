require('../helpers/envSetup');
require('../helpers/testSetup');

const { request, app, generateUserToken } = require('../helpers/testHelpers');
const { createCity, createUser, createShopkeeper, createShop, createCategory, createProduct } = require('../helpers/mockData');

describe('Shops routes', () => {
  test('GET /api/shops lists active shops by city', async () => {
    const city = await createCity({ slug: 'pune', name: 'Pune' });
    const owner = await createShopkeeper({ phone: '9999999996', email: 'shops-owner@test.local' });
    await createShop({ city, ownerId: owner._id, overrides: { shopName: 'Pune Store', slug: 'pune-store' } });

    const response = await request(app).get(`/api/shops?citySlug=${city.slug}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  test('GET /api/shops/:id/products returns products for authenticated user', async () => {
    const city = await createCity({ slug: 'nagpur', name: 'Nagpur' });
    const owner = await createShopkeeper({ phone: '9999999997', email: 'shops-owner2@test.local' });
    const category = await createCategory({ slug: 'snacks', name: 'Snacks' });
    const shop = await createShop({
      city,
      ownerId: owner._id,
      categoryName: category.name,
      overrides: { shopName: 'Nagpur Store', slug: 'nagpur-store' },
    });
    await createProduct({ shop, category, overrides: { name: 'Chips', slug: 'chips' } });

    const user = await createUser({ phone: '9999999998', referralCode: 'USRSHP01' });
    const token = generateUserToken(user._id, user.phone);

    const response = await request(app)
      .get(`/api/shops/${shop._id}/products`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data.items || response.body.data)).toBe(true);
  });
});
