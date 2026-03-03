const { hashPassword } = require('../utils/password');
const {
  MODELS,
  ensureDbConnection,
  closeDbConnection,
  randomInt,
  pickRandom,
  slugify,
  uniquePhone,
} = require('./_shared');

const {
  City,
  Category,
  User,
  Shopkeeper,
  Shop,
  Product,
  Order,
  ProductReview,
  Offer,
  Config,
} = MODELS;

const CITY_NAMES = [
  ['Mumbai', 'Maharashtra'],
  ['Pune', 'Maharashtra'],
  ['Bengaluru', 'Karnataka'],
  ['Hyderabad', 'Telangana'],
  ['Chennai', 'Tamil Nadu'],
  ['Delhi', 'Delhi'],
  ['Ahmedabad', 'Gujarat'],
  ['Kolkata', 'West Bengal'],
  ['Jaipur', 'Rajasthan'],
  ['Lucknow', 'Uttar Pradesh'],
];

const CATEGORY_DEFS = [
  'Groceries',
  'Fruits & Vegetables',
  'Dairy & Eggs',
  'Bakery',
  'Beverages',
  'Snacks',
  'Personal Care',
  'Home Cleaning',
  'Stationery',
  'Pet Supplies',
  'Organic',
  'Frozen Foods',
  'Household Essentials',
  'Baby Care',
  'Health & Wellness',
];

const PRODUCT_NAMES = [
  'Premium Rice',
  'Whole Wheat Flour',
  'Cold Pressed Oil',
  'Fresh Milk',
  'Brown Bread',
  'Green Tea',
  'Bath Soap',
  'Dish Wash Liquid',
  'Notebook Pack',
  'Pet Food',
  'Organic Honey',
  'Frozen Peas',
  'Toothpaste',
  'Baby Wipes',
  'Protein Oats',
  'Cashews',
  'Almond Milk',
  'Shampoo',
  'Floor Cleaner',
  'Mineral Water',
];

const createSubcategories = (categoryName) => {
  const count = randomInt(5, 8);
  return Array.from({ length: count }).map((_, index) => {
    const subName = `${categoryName} Sub ${index + 1}`;
    return {
      id: `sub-${slugify(categoryName)}-${index + 1}`,
      name: subName,
      slug: slugify(subName),
      isActive: true,
    };
  });
};

const seedCities = async () => {
  const target = randomInt(5, 10);
  const picked = CITY_NAMES.slice(0, target);
  const docs = [];

  for (let index = 0; index < picked.length; index += 1) {
    const [name, state] = picked[index];
    const slug = slugify(name);
    const latitude = 8 + index * 1.4;
    const longitude = 72 + index * 1.1;

    const city = await City.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          state,
          latitude,
          longitude,
          isActive: true,
          deliveryAvailable: true,
          populationEstimate: 500000 + index * 150000,
          description: `${name} demo city`,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(city);
  }

  return docs;
};

const seedCategories = async () => {
  const target = randomInt(10, 15);
  const picked = CATEGORY_DEFS.slice(0, target);
  const docs = [];

  for (let index = 0; index < picked.length; index += 1) {
    const name = picked[index];
    const slug = slugify(name);

    const category = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name,
          slug,
          description: `${name} category`,
          image: null,
          icon: null,
          subcategories: createSubcategories(name),
          isActive: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          displayOrder: index + 1,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(category);
  }

  return docs;
};

const seedShopkeepersAndShops = async (cities) => {
  const shopkeeperTarget = randomInt(5, 10);
  const shopTarget = randomInt(10, 20);

  const demoPassword = await hashPassword('Shopkeeper@123');

  const demoShopkeeper = await Shopkeeper.findOneAndUpdate(
    { phone: '9999999991' },
    {
      $set: {
        phone: '9999999991',
        password: demoPassword,
        email: 'demo.shopkeeper@cityconnect.local',
        personalInfo: {
          name: 'Demo Shopkeeper',
          address: 'Demo Address',
          city: cities[0]?.name || 'Mumbai',
          pincode: '400001',
        },
        businessInfo: {
          businessName: 'Demo Super Store',
          registrationType: 'PROPRIETOR',
          registrationNumber: 'REG-DEMO-001',
        },
        status: 'ACTIVE',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const shopkeepers = [demoShopkeeper];

  for (let index = 0; index < shopkeeperTarget - 1; index += 1) {
    const city = pickRandom(cities);
    const phone = uniquePhone('8888', index + 1);
    const email = `shopkeeper${index + 1}@demo.local`;

    const shopkeeper = await Shopkeeper.findOneAndUpdate(
      { phone },
      {
        $set: {
          phone,
          password: demoPassword,
          email,
          personalInfo: {
            name: `Shopkeeper ${index + 1}`,
            address: `Address ${index + 1}`,
            city: city.name,
            pincode: '400001',
          },
          businessInfo: {
            businessName: `Business ${index + 1}`,
            registrationType: 'PROPRIETOR',
            registrationNumber: `REG-${index + 1}`,
          },
          status: 'ACTIVE',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    shopkeepers.push(shopkeeper);
  }

  const shops = [];
  for (let index = 0; index < shopTarget; index += 1) {
    const city = pickRandom(cities);
    const owner = pickRandom(shopkeepers);
    const slug = slugify(`shop-${city.slug}-${index + 1}`);
    const latitude = city.latitude + randomInt(1, 20) / 100;
    const longitude = city.longitude + randomInt(1, 20) / 100;

    const shop = await Shop.findOneAndUpdate(
      { cityId: city._id, slug },
      {
        $set: {
          ownerId: String(owner._id),
          cityId: city._id,
          shopName: `Shop ${index + 1} ${city.name}`,
          slug,
          publicUrl: `/shops/${slug}`,
          description: `Demo shop ${index + 1} in ${city.name}`,
          category: pickRandom(CATEGORY_DEFS),
          phone: uniquePhone('7777', index + 1),
          email: `shop${index + 1}@demo.local`,
          addressLine1: `Shop Street ${index + 1}`,
          area: `Area ${randomInt(1, 12)}`,
          pincode: String(400000 + randomInt(1, 999)).padStart(6, '0'),
          latitude,
          longitude,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          businessHours: {
            open: '09:00',
            close: '21:00',
            closedDays: [],
          },
          delivery: {
            payer: 'CUSTOMER',
            chargeAmount: randomInt(10, 50),
            serviceRadiusKm: randomInt(3, 12),
            availableAreas: [city.name],
          },
          status: 'APPROVED',
          publicVisible: true,
          isActive: true,
          subscription: {
            plan: 'BASIC',
            startDate: new Date(),
            endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            isActive: true,
          },
          verification: {
            gstNumber: null,
            status: 'APPROVED',
            approvedAt: new Date(),
          },
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!owner.shopId || String(owner.shopId) !== String(shop._id)) {
      owner.shopId = shop._id;
      await owner.save();
    }

    shops.push(shop);
  }

  return { shopkeepers, shops };
};

const seedProducts = async (shops, categories) => {
  const target = randomInt(50, 100);
  const docs = [];

  for (let index = 0; index < target; index += 1) {
    const shop = pickRandom(shops);
    const category = pickRandom(categories);
    const productName = `${pickRandom(PRODUCT_NAMES)} ${index + 1}`;
    const slug = slugify(productName);
    const base = randomInt(40, 500);

    const product = await Product.findOneAndUpdate(
      { shopId: shop._id, slug },
      {
        $set: {
          shopId: shop._id,
          shopName: shop.shopName,
          name: productName,
          slug,
          description: `${productName} description`,
          categoryId: category._id,
          categoryName: category.name,
          subcategoryName: pickRandom(category.subcategories || [])?.name || null,
          images: [],
          variants: [
            {
              id: 'v1',
              label: 'Default',
              price: base,
              mrp: base + randomInt(10, 80),
              inStock: true,
              stockQty: randomInt(5, 60),
              lockedQty: 0,
            },
          ],
          active: true,
          isDeleted: false,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(product);
  }

  return docs;
};

const seedUsers = async (cities) => {
  const target = randomInt(20, 30);
  const users = [];

  const demoUser = await User.findOneAndUpdate(
    { phone: '9999999990' },
    {
      $set: {
        phone: '9999999990',
        isVerified: true,
        otp: null,
        otpExpiresAt: null,
        referralCode: 'CCDEMO90',
        name: 'Demo User',
        cityId: cities[0]?._id || null,
        email: 'demo.user@cityconnect.local',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  users.push(demoUser);

  for (let index = 0; index < target - 1; index += 1) {
    const phone = uniquePhone('6666', index + 1);
    const city = pickRandom(cities);

    const user = await User.findOneAndUpdate(
      { phone },
      {
        $set: {
          phone,
          isVerified: true,
          otp: null,
          otpExpiresAt: null,
          referralCode: `CCU${String(index + 1).padStart(5, '0')}`,
          name: `User ${index + 1}`,
          cityId: city._id,
          email: `user${index + 1}@demo.local`,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    users.push(user);
  }

  return users;
};

const seedOrders = async (users, shops, products) => {
  const target = randomInt(25, 40);
  const docs = [];

  for (let index = 0; index < target; index += 1) {
    const user = pickRandom(users);
    const shop = pickRandom(shops);
    const shopProducts = products.filter((item) => String(item.shopId) === String(shop._id));
    const product = pickRandom(shopProducts.length > 0 ? shopProducts : products);

    const qty = randomInt(1, 3);
    const price = Number(product.basePrice || product.variants?.[0]?.price || 50);
    const subtotal = price * qty;
    const deliveryCharge = Number(shop.delivery?.chargeAmount || 20);
    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + deliveryCharge + tax).toFixed(2));

    const orderId = `#US-${String(10000 + index)}`;

    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          orderId,
          userId: user._id,
          shopId: shop._id,
          cityId: shop.cityId,
          items: [
            {
              productId: product._id,
              productName: product.name,
              variantId: 'v1',
              variantLabel: 'Default',
              quantity: qty,
              price,
              image: null,
            },
          ],
          deliveryAddress: {
            addressLine1: 'Demo Address Line',
            area: shop.area,
            city: 'Demo City',
            pincode: '400001',
            phone: user.phone,
          },
          pricing: {
            subtotal,
            discount: 0,
            deliveryCharge,
            tax,
            total,
          },
          status: pickRandom(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED']),
          statusHistory: [
            {
              status: 'NEW',
              note: 'Order placed',
              timestamp: new Date(),
            },
          ],
          payment: {
            mode: pickRandom(['COD', 'ONLINE']),
            status: 'SUCCESS',
          },
          inventoryState: 'DEDUCTED',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(order);
  }

  return docs;
};

const seedReviews = async (orders) => {
  const target = Math.min(orders.length, randomInt(20, 35));
  const docs = [];

  for (let index = 0; index < target; index += 1) {
    const order = orders[index];
    const item = order.items?.[0];
    if (!item?.productId) {
      continue;
    }

    const review = await ProductReview.findOneAndUpdate(
      { orderId: order._id, productId: item.productId },
      {
        $set: {
          productId: item.productId,
          shopId: order.shopId,
          userId: order.userId,
          orderId: order._id,
          userName: `User-${String(order.userId).slice(-4)}`,
          rating: randomInt(3, 5),
          title: `Great product ${index + 1}`,
          reviewText: 'This demo review is generated during seed and looks realistic enough.',
          images: [],
          verified: true,
          isPublished: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(review);
  }

  return docs;
};

const seedOffers = async (shops, categories, products) => {
  const target = randomInt(12, 20);
  const docs = [];

  for (let index = 0; index < target; index += 1) {
    const shop = pickRandom(shops);
    const scope = pickRandom(['SHOP', 'CATEGORIES', 'PRODUCTS']);
    const category = pickRandom(categories);
    const shopProducts = products.filter((p) => String(p.shopId) === String(shop._id));
    const product = pickRandom(shopProducts.length > 0 ? shopProducts : products);

    const startsAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endsAt = new Date(Date.now() + randomInt(3, 25) * 24 * 60 * 60 * 1000);

    const name = `Offer ${index + 1} ${shop.slug}`;

    const offer = await Offer.findOneAndUpdate(
      { shopId: shop._id, name },
      {
        $set: {
          shopId: shop._id,
          name,
          description: 'Seeded demo offer',
          type: pickRandom(['PERCENT', 'FLAT']),
          value: randomInt(5, 30),
          scope,
          categoryIds: scope === 'CATEGORIES' ? [category._id] : [],
          productIds: scope === 'PRODUCTS' ? [product._id] : [],
          conditions: {
            minOrderValue: randomInt(50, 500),
            maxDiscount: randomInt(50, 200),
            applicableDays: [],
            applicableHours: {
              from: '09:00',
              to: '21:00',
            },
          },
          validity: {
            startsAt,
            endsAt,
          },
          enabled: true,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    docs.push(offer);
  }

  return docs;
};

const seedAdminCredentialConfig = async () => {
  await Config.findOneAndUpdate(
    { key: 'DEMO_ADMIN_CREDENTIALS' },
    {
      $set: {
        category: 'GENERAL',
        description: 'Demo admin credentials for local/dev setup',
        value: {
          email: 'admin@cityconnect.local',
          password: 'Admin@123',
        },
        lastModifiedAt: new Date(),
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const validateSeedData = async () => {
  const [orphanOrdersUser, orphanOrdersShop, orphanProductsShop, orphanReviewsProduct, orphanReviewsOrder] = await Promise.all([
    Order.countDocuments({ userId: { $nin: await User.distinct('_id') } }),
    Order.countDocuments({ shopId: { $nin: await Shop.distinct('_id') } }),
    Product.countDocuments({ shopId: { $nin: await Shop.distinct('_id') } }),
    ProductReview.countDocuments({ productId: { $nin: await Product.distinct('_id') } }),
    ProductReview.countDocuments({ orderId: { $nin: await Order.distinct('_id') } }),
  ]);

  const duplicateCitySlugs = await City.aggregate([
    { $group: { _id: '$slug', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $count: 'count' },
  ]);

  return {
    orphanOrdersUser,
    orphanOrdersShop,
    orphanProductsShop,
    orphanReviewsProduct,
    orphanReviewsOrder,
    duplicateCitySlugs: Number(duplicateCitySlugs?.[0]?.count || 0),
  };
};

const seedDatabase = async ({ mode = process.env.NODE_ENV || 'development' } = {}) => {
  await ensureDbConnection();

  const cities = await seedCities();
  const categories = await seedCategories();
  const { shopkeepers, shops } = await seedShopkeepersAndShops(cities);
  const products = await seedProducts(shops, categories);
  const users = await seedUsers(cities);
  const orders = await seedOrders(users, shops, products);
  const productReviews = await seedReviews(orders);
  const offers = await seedOffers(shops, categories, products);
  await seedAdminCredentialConfig();

  const validation = await validateSeedData();

  const summary = {
    mode,
    cities: cities.length,
    categories: categories.length,
    shopkeepers: shopkeepers.length,
    shops: shops.length,
    products: products.length,
    users: users.length,
    orders: orders.length,
    productReviews: productReviews.length,
    offers: offers.length,
    demoCredentials: {
      user: '9999999990',
      shopkeeper: '9999999991 / Shopkeeper@123',
      admin: 'admin@cityconnect.local / Admin@123',
    },
    validation,
  };

  return summary;
};

if (require.main === module) {
  seedDatabase()
    .then((summary) => {
      console.log('Seed completed successfully');
      console.table(summary);
    })
    .catch((error) => {
      console.error('Seed failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  seedDatabase,
  validateSeedData,
};
