const { hashPassword } = require('../utils/password');
const { MODELS, ensureDbConnection, closeDbConnection, slugify } = require('./_shared');

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

const CITY_SEED = [
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    latitude: 18.5204,
    longitude: 73.8567,
  },
];

const CATEGORY_SEED = [
  {
    name: 'Groceries',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    subcategories: ['Rice & Flour', 'Daily Essentials'],
  },
  {
    name: 'Fruits & Vegetables',
    image: 'https://images.unsplash.com/photo-1615485925763-86786288908f?auto=format&fit=crop&w=1200&q=80',
    subcategories: ['Fresh Fruits', 'Fresh Vegetables'],
  },
];

const SHOP_IMAGE_BY_CITY = {
  mumbai:
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
  pune:
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
};

const PRODUCT_IMAGE_POOL = [
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1576186726115-4d51596775d1?auto=format&fit=crop&w=1200&q=80',
];

const clearCollections = async () => {
  await Promise.all([
    ProductReview.deleteMany({}),
    Offer.deleteMany({}),
    Order.deleteMany({}),
    Product.deleteMany({}),
    Shop.deleteMany({}),
    Shopkeeper.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    City.deleteMany({}),
  ]);
};

const seedCities = async () => {
  const docs = [];

  for (const city of CITY_SEED) {
    const slug = slugify(city.name);
    const doc = await City.create({
      name: city.name,
      slug,
      state: city.state,
      latitude: city.latitude,
      longitude: city.longitude,
      isActive: true,
      deliveryAvailable: true,
      description: `${city.name} service city`,
      populationEstimate: 1000000,
      publishedAt: new Date(),
    });

    docs.push(doc);
  }

  return docs;
};

const seedCategories = async () => {
  const docs = [];

  for (let index = 0; index < CATEGORY_SEED.length; index += 1) {
    const category = CATEGORY_SEED[index];
    const slug = slugify(category.name);

    const doc = await Category.create({
      name: category.name,
      slug,
      description: `${category.name} category`,
      image: category.image,
      icon: null,
      subcategories: category.subcategories.map((name, subIndex) => ({
        id: `sub-${slug}-${subIndex + 1}`,
        name,
        slug: slugify(name),
        isActive: true,
      })),
      isActive: true,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      displayOrder: index + 1,
    });

    docs.push(doc);
  }

  return docs;
};

const seedShopkeepersAndShops = async (cities) => {
  const passwordHash = await hashPassword('Shopkeeper@123');
  const shopkeepers = [];
  const shops = [];

  for (let index = 0; index < cities.length; index += 1) {
    const city = cities[index];
    const citySlug = slugify(city.name);
    const phone = `88880000${String(index + 1).padStart(2, '0')}`;

    const shopkeeper = await Shopkeeper.create({
      phone,
      password: passwordHash,
      email: `shopkeeper${index + 1}@cityconnect.local`,
      personalInfo: {
        name: `Shopkeeper ${index + 1}`,
        address: `${city.name} Main Road`,
        city: city.name,
        pincode: city.name === 'Mumbai' ? '400001' : '411001',
      },
      businessInfo: {
        businessName: `${city.name} Fresh Mart`,
        registrationType: 'PROPRIETOR',
        registrationNumber: `REG-${citySlug.toUpperCase()}-00${index + 1}`,
      },
      status: 'ACTIVE',
    });

    const latitude = city.latitude + 0.01;
    const longitude = city.longitude + 0.01;

    const shop = await Shop.create({
      ownerId: String(shopkeeper._id),
      cityId: city._id,
      shopName: `${city.name} Fresh Mart`,
      slug: `${citySlug}-fresh-mart`,
      publicUrl: `/shops/${citySlug}-fresh-mart`,
      imageUrl: SHOP_IMAGE_BY_CITY[citySlug] || null,
      description: `Fresh groceries and essentials in ${city.name}`,
      category: CATEGORY_SEED[0].name,
      phone: `77770000${String(index + 1).padStart(2, '0')}`,
      email: `shop${index + 1}@cityconnect.local`,
      addressLine1: `${city.name} Market Street ${index + 1}`,
      area: city.name === 'Mumbai' ? 'Andheri' : 'Shivajinagar',
      pincode: city.name === 'Mumbai' ? '400001' : '411001',
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
        chargeAmount: 20,
        serviceRadiusKm: 7,
        availableAreas: [city.name],
      },
      verification: {
        gstNumber: null,
        status: 'APPROVED',
        approvedAt: new Date(),
      },
      subscription: {
        plan: 'BASIC',
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
      status: 'APPROVED',
      publicVisible: true,
      isActive: true,
    });

    shopkeeper.shopId = shop._id;
    await shopkeeper.save();

    shopkeepers.push(shopkeeper);
    shops.push(shop);
  }

  return { shopkeepers, shops };
};

const seedProducts = async (shops, categories) => {
  const docs = [];

  for (let shopIndex = 0; shopIndex < shops.length; shopIndex += 1) {
    const shop = shops[shopIndex];

    for (let itemIndex = 0; itemIndex < 2; itemIndex += 1) {
      const category = categories[itemIndex % categories.length];
      const subcategory = category.subcategories[itemIndex % category.subcategories.length];
      const name = itemIndex === 0 ? `Premium Rice ${shopIndex + 1}` : `Farm Fresh Basket ${shopIndex + 1}`;
      const basePrice = itemIndex === 0 ? 95 : 120;
      const baseMrp = itemIndex === 0 ? 115 : 150;

      const doc = await Product.create({
        shopId: shop._id,
        shopName: shop.shopName,
        name,
        slug: slugify(`${name}-${shop._id}`),
        description: `${name} from ${shop.shopName}`,
        categoryId: category._id,
        categoryName: category.name,
        subcategoryName: subcategory?.name || null,
        images: [PRODUCT_IMAGE_POOL[(shopIndex * 2 + itemIndex) % PRODUCT_IMAGE_POOL.length]],
        variants: [
          {
            id: 'v1',
            label: itemIndex === 0 ? '1 kg' : '1 pack',
            price: basePrice,
            mrp: baseMrp,
            inStock: true,
            stockQty: 40,
            lockedQty: 0,
          },
          {
            id: 'v2',
            label: itemIndex === 0 ? '5 kg' : '2 pack',
            price: basePrice * 4,
            mrp: baseMrp * 4,
            inStock: true,
            stockQty: 20,
            lockedQty: 0,
          },
        ],
        active: true,
        isDeleted: false,
      });

      docs.push(doc);
    }
  }

  return docs;
};

const seedUsers = async (cities) => {
  const docs = [];

  for (let index = 0; index < 2; index += 1) {
    const city = cities[index % cities.length];

    const doc = await User.create({
      phone: `66660000${String(index + 1).padStart(2, '0')}`,
      otp: null,
      otpExpiresAt: null,
      isVerified: true,
      name: `User ${index + 1}`,
      email: `user${index + 1}@cityconnect.local`,
      cityId: city._id,
      referralCode: `CCU0000${index + 1}`,
      referredBy: null,
      addresses: [
        {
          id: `addr-${index + 1}`,
          userId: `seed-user-${index + 1}`,
          label: 'home',
          addressLine1: `${city.name} Apartment ${index + 1}`,
          area: city.name === 'Mumbai' ? 'Andheri' : 'Kothrud',
          city: city.name,
          pincode: city.name === 'Mumbai' ? '400001' : '411001',
          phone: `66660000${String(index + 1).padStart(2, '0')}`,
          isDefault: true,
        },
      ],
    });

    docs.push(doc);
  }

  return docs;
};

const seedOrders = async (users, shops, products) => {
  const docs = [];

  for (let index = 0; index < 2; index += 1) {
    const user = users[index % users.length];
    const shop = shops[index % shops.length];
    const product = products.find((item) => String(item.shopId) === String(shop._id)) || products[0];

    const quantity = 2;
    const itemPrice = Number(product.basePrice || product.variants?.[0]?.price || 0);
    const subtotal = quantity * itemPrice;
    const deliveryCharge = Number(shop.delivery?.chargeAmount || 20);
    const tax = Number((subtotal * 0.05).toFixed(2));
    const total = Number((subtotal + deliveryCharge + tax).toFixed(2));

    const doc = await Order.create({
      orderId: `#US-2000${index + 1}`,
      userId: user._id,
      shopId: shop._id,
      cityId: shop.cityId,
      items: [
        {
          productId: product._id,
          productName: product.name,
          variantId: product.variants?.[0]?.id || 'v1',
          variantLabel: product.variants?.[0]?.label || 'Default',
          quantity,
          price: itemPrice,
          image: Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
        },
      ],
      deliveryAddress: {
        addressLine1: user.addresses?.[0]?.addressLine1 || 'Address Line 1',
        area: user.addresses?.[0]?.area || 'Area',
        city: user.addresses?.[0]?.city || 'City',
        pincode: user.addresses?.[0]?.pincode || '400001',
        phone: user.phone,
      },
      pricing: {
        subtotal,
        discount: 0,
        deliveryCharge,
        tax,
        total,
      },
      payment: {
        mode: index % 2 === 0 ? 'COD' : 'ONLINE',
        status: 'SUCCESS',
        transactionId: index % 2 === 0 ? null : `txn-seed-${index + 1}`,
      },
      status: index % 2 === 0 ? 'NEW' : 'DELIVERED',
      statusHistory: [
        {
          status: 'NEW',
          note: 'Order placed',
          timestamp: new Date(),
        },
      ],
      inventoryState: 'DEDUCTED',
    });

    docs.push(doc);
  }

  return docs;
};

const seedOffers = async (shops, categories) => {
  const docs = [];
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  for (let index = 0; index < 2; index += 1) {
    const shop = shops[index % shops.length];
    const category = categories[index % categories.length];

    const doc = await Offer.create({
      shopId: shop._id,
      name: `${shop.shopName} Offer ${index + 1}`,
      description: `Save more at ${shop.shopName}`,
      type: index % 2 === 0 ? 'PERCENT' : 'FLAT',
      value: index % 2 === 0 ? 15 : 40,
      scope: 'CATEGORIES',
      categoryIds: [String(category._id)],
      productIds: [],
      conditions: {
        minOrderValue: 200,
        maxDiscount: 120,
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
    });

    docs.push(doc);
  }

  return docs;
};

const seedAdminCredentialConfig = async () => {
  await Config.findOneAndUpdate(
    { key: 'DEMO_ADMIN_CREDENTIALS' },
    {
      $set: {
        category: 'GENERAL',
        description: 'Admin credentials for local setup',
        value: {
          email: 'admin@cityconnect.local',
          password: 'Admin@123',
        },
        lastModifiedAt: new Date(),
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
};

const seedMinimalDatabase = async () => {
  await ensureDbConnection();

  await clearCollections();

  const cities = await seedCities();
  const categories = await seedCategories();
  const { shopkeepers, shops } = await seedShopkeepersAndShops(cities);
  const products = await seedProducts(shops, categories);
  const users = await seedUsers(cities);
  const orders = await seedOrders(users, shops, products);
  const offers = await seedOffers(shops, categories);
  await seedAdminCredentialConfig();

  return {
    cities: cities.length,
    categories: categories.length,
    shopkeepers: shopkeepers.length,
    shops: shops.length,
    products: products.length,
    users: users.length,
    orders: orders.length,
    offers: offers.length,
    credentials: {
      shopkeeperPassword: 'Shopkeeper@123',
      admin: 'admin@cityconnect.local / Admin@123',
    },
  };
};

if (require.main === module) {
  seedMinimalDatabase()
    .then((summary) => {
      console.log('Minimal seed completed successfully');
      console.table(summary);
    })
    .catch((error) => {
      console.error('Minimal seed failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDbConnection();
    });
}

module.exports = {
  seedMinimalDatabase,
};
