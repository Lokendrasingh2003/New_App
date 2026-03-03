const City = require('../../models/City');
const User = require('../../models/User');
const Shopkeeper = require('../../models/Shopkeeper');
const Shop = require('../../models/Shop');
const Category = require('../../models/Category');
const Product = require('../../models/Product');
const Cart = require('../../models/Cart');

const createCity = async (overrides = {}) => {
  return City.create({
    name: 'Mumbai',
    slug: 'mumbai',
    state: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    isActive: true,
    deliveryAvailable: true,
    ...overrides,
  });
};

const createUser = async (overrides = {}) => {
  return User.create({
    phone: '9999999990',
    isVerified: true,
    referralCode: 'CCUSER01',
    name: 'Test User',
    addresses: [
      {
        id: 'addr-1',
        userId: 'temp',
        label: 'home',
        addressLine1: 'Test Address',
        area: 'Andheri',
        city: 'Mumbai',
        pincode: '400001',
        phone: '9999999990',
        isDefault: true,
      },
    ],
    ...overrides,
  }).then(async (user) => {
    user.addresses = user.addresses.map((address) => ({ ...address, userId: String(user._id) }));
    await user.save();
    return user;
  });
};

const createShopkeeper = async (overrides = {}) => {
  return Shopkeeper.create({
    phone: '9999999991',
    password: 'hashed-password',
    email: 'shopkeeper@test.local',
    personalInfo: {
      name: 'Test Shopkeeper',
      address: 'Address',
      city: 'Mumbai',
      pincode: '400001',
    },
    businessInfo: {
      businessName: 'Test Store',
      registrationType: 'PROPRIETOR',
      registrationNumber: 'REG1',
    },
    status: 'ACTIVE',
    ...overrides,
  });
};

const createCategory = async (overrides = {}) => {
  return Category.create({
    name: 'Groceries',
    slug: 'groceries',
    description: 'Test category',
    subcategories: [
      { id: 'sub-1', name: 'Rice', slug: 'rice', isActive: true },
      { id: 'sub-2', name: 'Wheat', slug: 'wheat', isActive: true },
      { id: 'sub-3', name: 'Pulses', slug: 'pulses', isActive: true },
      { id: 'sub-4', name: 'Oil', slug: 'oil', isActive: true },
      { id: 'sub-5', name: 'Spices', slug: 'spices', isActive: true },
    ],
    status: 'PUBLISHED',
    isActive: true,
    ...overrides,
  });
};

const createShop = async ({ city, ownerId, categoryName = 'Groceries', overrides = {} }) => {
  return Shop.create({
    ownerId: String(ownerId),
    cityId: city._id,
    shopName: 'Test Shop',
    slug: `test-shop-${Date.now()}`,
    publicUrl: '/shops/test-shop',
    category: categoryName,
    phone: '8888888888',
    email: 'shop@test.local',
    addressLine1: 'Street 1',
    area: 'Andheri',
    pincode: '400001',
    latitude: city.latitude,
    longitude: city.longitude,
    businessHours: { open: '09:00', close: '21:00', closedDays: [] },
    delivery: { payer: 'CUSTOMER', chargeAmount: 20, serviceRadiusKm: 5, availableAreas: ['Andheri'] },
    status: 'APPROVED',
    publicVisible: true,
    isActive: true,
    subscription: {
      plan: 'BASIC',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    ...overrides,
  });
};

const createProduct = async ({ shop, category, overrides = {} }) => {
  return Product.create({
    shopId: shop._id,
    shopName: shop.shopName,
    name: 'Test Product',
    slug: `test-product-${Date.now()}`,
    description: 'Test product',
    categoryId: category._id,
    categoryName: category.name,
    subcategoryName: category.subcategories?.[0]?.name || null,
    variants: [
      {
        id: 'v1',
        label: 'Default',
        price: 120,
        mrp: 150,
        inStock: true,
        stockQty: 25,
        lockedQty: 0,
      },
    ],
    active: true,
    ...overrides,
  });
};

const createCart = async ({ user, shop, product, overrides = {} }) => {
  return Cart.create({
    userId: user._id,
    shopId: shop._id,
    items: [
      {
        productId: product._id,
        productName: product.name,
        variantId: 'v1',
        variantLabel: 'Default',
        quantity: 1,
        price: 120,
        mrp: 150,
      },
    ],
    subtotal: 120,
    discount: 0,
    deliveryCharge: 20,
    tax: 6,
    total: 146,
    ...overrides,
  });
};

module.exports = {
  createCity,
  createUser,
  createShopkeeper,
  createCategory,
  createShop,
  createProduct,
  createCart,
};
