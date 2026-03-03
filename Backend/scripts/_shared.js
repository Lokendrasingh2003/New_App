const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');

const City = require('../models/City');
const Category = require('../models/Category');
const User = require('../models/User');
const Shopkeeper = require('../models/Shopkeeper');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Review = require('../models/Review');
const ProductReview = require('../models/ProductReview');
const Offer = require('../models/Offer');
const Coupon = require('../models/Coupon');
const AuditLog = require('../models/AuditLog');
const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const Payout = require('../models/Payout');
const Commission = require('../models/Commission');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const ShopSubscription = require('../models/ShopSubscription');
const Config = require('../models/Config');
const AuthSession = require('../models/AuthSession');

const MODELS = {
  City,
  Category,
  User,
  Shopkeeper,
  Shop,
  Product,
  Cart,
  Order,
  Review,
  ProductReview,
  Offer,
  Coupon,
  AuditLog,
  Payment,
  Refund,
  Payout,
  Commission,
  SubscriptionPlan,
  ShopSubscription,
  Config,
  AuthSession,
};

const COLLECTIONS = Object.values(MODELS).map((model) => model.collection.name);

const ensureDbConnection = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  return connectDatabase();
};

const closeDbConnection = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
};

const nowStamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const backupsRoot = path.join(process.cwd(), 'backups');
const ensureBackupsRoot = () => {
  if (!fs.existsSync(backupsRoot)) {
    fs.mkdirSync(backupsRoot, { recursive: true });
  }
  return backupsRoot;
};

const randomInt = (min, max) => {
  const start = Math.ceil(min);
  const end = Math.floor(max);
  return Math.floor(Math.random() * (end - start + 1)) + start;
};

const pickRandom = (arr) => arr[randomInt(0, arr.length - 1)];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const uniquePhone = (prefix, index) => {
  const normalizedPrefix = String(prefix || '99').replace(/\D/g, '').slice(0, 4).padEnd(4, '9');
  const suffix = String(index).padStart(6, '0');
  return `${normalizedPrefix}${suffix}`.slice(0, 10);
};

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
};

const readJson = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

module.exports = {
  mongoose,
  MODELS,
  COLLECTIONS,
  ensureDbConnection,
  closeDbConnection,
  nowStamp,
  ensureBackupsRoot,
  randomInt,
  pickRandom,
  slugify,
  uniquePhone,
  writeJson,
  readJson,
};
