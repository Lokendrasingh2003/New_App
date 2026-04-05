const Joi = require('joi');
const { formatPhone } = require('./authHelpers');

const objectId = Joi.string().length(24).hex();

const indianPhoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
const otpRegex = /^\d{6}$/;
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const authSchemas = {
  sendOtp: Joi.object({
    phone: Joi.string().pattern(indianPhoneRegex).required(),
    purpose: Joi.string().valid('REGISTER', 'RESET_PASSWORD').optional(),
  }),
  verifyOtp: Joi.object({
    phone: Joi.string().pattern(indianPhoneRegex).required(),
    otp: Joi.string().pattern(otpRegex).required(),
    purpose: Joi.string().valid('REGISTER', 'RESET_PASSWORD').required(),
    name: Joi.when('purpose', {
      is: 'REGISTER',
      then: Joi.string().trim().min(2).max(100).required(),
      otherwise: Joi.forbidden(),
    }),
    password: Joi.when('purpose', {
      is: 'REGISTER',
      then: Joi.string().min(6).max(50).required(),
      otherwise: Joi.forbidden(),
    }),
    newPassword: Joi.when('purpose', {
      is: 'RESET_PASSWORD',
      then: Joi.string().min(6).max(50).required(),
      otherwise: Joi.forbidden(),
    }),
  }),
  passwordLogin: Joi.object({
    phone: Joi.string().pattern(indianPhoneRegex).required(),
    password: Joi.string().required(),
  }),
  refreshToken: Joi.object({
    refreshToken: Joi.string().min(20).required(),
  }),
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).max(50).required(),
  }),
  login: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().required(),
  }),
};

const userSchemas = {
  updateProfile: Joi.object({
    name: Joi.string().trim().max(100).allow('', null),
    email: Joi.string().email().allow('', null),
    profileImage: Joi.string().uri().allow('', null),
  }).min(1),
  createAddress: Joi.object({
    label: Joi.string().valid('home', 'work', 'other').required(),
    addressLine1: Joi.string().trim().max(100).required(),
    area: Joi.string().trim().max(50).required(),
    city: Joi.string().trim().max(50).required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
  }),
  updateAddress: Joi.object({
    label: Joi.string().valid('home', 'work', 'other').required(),
    addressLine1: Joi.string().trim().max(100).required(),
    area: Joi.string().trim().max(50).required(),
    city: Joi.string().trim().max(50).required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    isDefault: Joi.boolean().optional(),
  }),
  addressIdParam: Joi.object({
    addressId: Joi.string().trim().min(6).max(50).required(),
  }),
  shopRegistrationSubmit: Joi.object({
    shopName: Joi.string().trim().min(2).max(120).required(),
    description: Joi.string().trim().max(600).allow('', null),
    categoryId: objectId.required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
    openingTime: Joi.string().pattern(timeRegex).required(),
    closingTime: Joi.string().pattern(timeRegex).required(),
    // Allow URL, file path, or uploaded asset key from mobile clients.
    shopImageUrl: Joi.string().trim().min(3).max(500).required(),
    addressLine1: Joi.string().trim().min(5).max(160).required(),
    area: Joi.string().trim().min(2).max(80).required(),
    cityId: objectId.required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    businessProofUrl: Joi.string().trim().min(2).max(500).required(),
    identityProofUrl: Joi.string().trim().min(2).max(500).required(),
    gstNumber: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{6,20}$/).required(),
    accountHolderName: Joi.string().trim().min(2).max(120).required(),
    accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).required(),
    ifscCode: Joi.string().trim().uppercase().pattern(ifscRegex).required(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }),
  registrationIdParam: Joi.object({
    registrationId: objectId.required(),
  }),
};

const cartSchemas = {
  addItem: Joi.object({
    shopId: objectId.required(),
    productId: objectId.required(),
    variantId: Joi.string().trim().min(1).max(60).required(),
    quantity: Joi.number().integer().min(1).max(50).required(),
  }),
  updateItem: Joi.object({
    quantity: Joi.number().integer().min(0).max(50).required(),
    variantId: Joi.string().trim().min(1).max(60).optional(),
  }),
  itemParam: Joi.object({
    productId: objectId.required(),
  }),
  coupon: Joi.object({
    couponCode: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{4,20}$/).required(),
  }),
  shippingEstimateQuery: Joi.object({
    addressId: Joi.string().trim().min(6).max(60).required(),
  }),
};

const orderSchemas = {
  create: Joi.object({
    cartId: objectId.required(),
    addressId: Joi.string().trim().min(6).max(60).required(),
    paymentMode: Joi.string().valid('COD', 'ONLINE', 'UPI', 'CARD', 'NETBANKING', 'WALLET').required(),
    couponCode: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{4,20}$/).optional(),
    specialInstructions: Joi.string().trim().max(500).allow('', null),
  }),
  listQuery: Joi.object({
    status: Joi.string()
      .valid('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED')
      .optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  orderIdParam: Joi.object({
    orderId: Joi.string().trim().pattern(/^#[US]-\d{5}$/).required(),
  }),
  cancel: Joi.object({
    reason: Joi.string().trim().max(300).required(),
  }),
  feedback: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().trim().max(1000).allow('', null),
  }),
};

const paymentSchemas = {
  verify: Joi.object({
    orderId: Joi.string().trim().pattern(/^#[US]-\d{5}$/).required(),
    paymentId: Joi.string().trim().min(4).max(120).required(),
    signature: Joi.string().trim().min(16).max(256).required(),
  }),
  refund: Joi.object({
    orderId: Joi.string().trim().pattern(/^#[US]-\d{5}$/).required(),
    reason: Joi.string().trim().max(300).required(),
  }),
};

const reviewSchemas = {
  create: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().min(5).max(100).required(),
    reviewText: Joi.string().trim().min(10).max(500).required(),
    images: Joi.array().items(Joi.string().uri()).max(3).optional(),
    orderId: objectId.required(),
  }),
  listQuery: Joi.object({
    sort: Joi.string().valid('helpful', 'recent', 'rating').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().min(5).max(100).required(),
    reviewText: Joi.string().trim().min(10).max(500).required(),
    images: Joi.array().items(Joi.string().uri()).max(3).optional(),
  }),
  reviewIdParam: Joi.object({
    reviewId: objectId.required(),
  }),
  productIdParam: Joi.object({
    productId: objectId.required(),
  }),
  helpful: Joi.object({
    helpful: Joi.boolean().required(),
  }),
};

const shopkeeperSchemas = {
  register: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().pattern(passwordRegex).required(),
    confirmPassword: Joi.string().required(),
    personalName: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().optional(),
    city: Joi.string().trim().min(2).max(60).required(),
    businessName: Joi.string().trim().min(2).max(120).required(),
    businessType: Joi.string().valid('PROPRIETOR', 'PARTNERSHIP', 'COMPANY').required(),
  }),
  login: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    password: Joi.string().required(),
  }),
  refreshToken: Joi.object({
    refreshToken: Joi.string().min(20).required(),
  }),
  profile: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().allow('', null),
    personalAddress: Joi.string().trim().max(200).allow('', null),
    city: Joi.string().trim().min(2).max(60).required(),
  }),
  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(passwordRegex).required(),
    confirmPassword: Joi.string().required(),
  }),
  verifyEmail: Joi.object({
    email: Joi.string().email().required(),
    verificationCode: Joi.string().trim().min(4).max(12).required(),
  }),
  bankDetails: Joi.object({
    accountHolderName: Joi.string().trim().min(2).max(120).required(),
    accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).required(),
    ifscCode: Joi.string().trim().uppercase().pattern(ifscRegex).required(),
    bankName: Joi.string().trim().min(2).max(120).required(),
  }),
};

const shopManagementSchemas = {
  register: Joi.object({
    shopName: Joi.string().trim().min(2).max(120).required(),
    ownerName: Joi.string().trim().min(2).max(100).optional(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{3,80}$/).optional(),
    category: Joi.string().trim().min(2).max(80).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    addressLine1: Joi.string().trim().min(5).max(160).required(),
    area: Joi.string().trim().min(2).max(80).required(),
    city: Joi.string().trim().min(2).max(60).required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    businessHours: Joi.object({
      open: Joi.string().pattern(timeRegex).required(),
      close: Joi.string().pattern(timeRegex).required(),
    }).required(),
    delivery: Joi.object({
      payer: Joi.string().valid('CUSTOMER', 'SHOP').required(),
      chargeAmount: Joi.number().min(0).max(500).required(),
      serviceRadiusKm: Joi.number().min(1).max(50).required(),
    }).required(),
  }),
  settings: Joi.object({
    shopName: Joi.string().trim().min(3).max(50).required(),
    ownerName: Joi.string().trim().min(2).max(100).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).required(),
    city: Joi.string().trim().min(2).max(60).required(),
    addressLine1: Joi.string().trim().min(5).max(160).required(),
    area: Joi.string().trim().min(2).max(80).required(),
    pincode: Joi.string().pattern(/^\d{6}$/).required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{3,80}$/).optional(),
    businessHours: Joi.object({
      open: Joi.string().pattern(timeRegex).required(),
      close: Joi.string().pattern(timeRegex).required(),
    }).required(),
    delivery: Joi.object({
      payer: Joi.string().valid('CUSTOMER', 'SHOP').required(),
      chargeAmount: Joi.number().min(0).max(500).required(),
      serviceRadiusKm: Joi.number().min(1).max(50).required(),
    }).required(),
  }),
  businessHours: Joi.object({
    open: Joi.string().pattern(timeRegex).required(),
    close: Joi.string().pattern(timeRegex).required(),
    closedDays: Joi.array()
      .items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      )
      .max(7)
      .optional(),
  }),
  deliveryConfig: Joi.object({
    payer: Joi.string().valid('CUSTOMER', 'SHOP').required(),
    chargeAmount: Joi.number().min(0).max(500).required(),
    serviceRadiusKm: Joi.number().min(1).max(50).required(),
  }),
  shopIdParam: Joi.object({
    shopId: objectId.required(),
  }),
};

const productManagementSchemas = {
  createOrUpdate: Joi.object({
    name: Joi.string().trim().min(3).max(100).required(),
    description: Joi.string().trim().max(1000).allow('', null),
    categoryId: objectId.required(),
    categoryName: Joi.string().trim().min(2).max(80).required(),
    subcategoryName: Joi.string().trim().max(80).allow('', null),
    images: Joi.array().items(Joi.string().uri()).max(10).required(),
    variants: Joi.array()
      .items(
        Joi.object({
          label: Joi.string().trim().max(50).required(),
          price: Joi.number().greater(0).required(),
          mrp: Joi.number().min(Joi.ref('price')).required(),
          inStock: Joi.boolean().required(),
          stockQty: Joi.number().integer().min(0).required(),
        })
      )
      .min(1)
      .max(20)
      .required(),
    active: Joi.boolean().required(),
  }),
  listQuery: Joi.object({
    search: Joi.string().trim().max(100).optional(),
    category: Joi.string().trim().max(80).optional(),
    active: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  productIdParam: Joi.object({
    shopId: objectId.required(),
    productId: objectId.required(),
  }),
  productImageParam: Joi.object({
    shopId: objectId.required(),
    productId: objectId.required(),
    imageId: Joi.string().trim().min(1).max(120).required(),
  }),
  stockPatch: Joi.object({
    variants: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().trim().min(1).max(60).required(),
          stockQty: Joi.number().integer().min(0).required(),
          inStock: Joi.boolean().required(),
        })
      )
      .min(1)
      .max(20)
      .required(),
  }),
};

const offerSchemas = {
  createOrUpdate: Joi.object({
    name: Joi.string().trim().min(5).max(100).required(),
    description: Joi.string().trim().max(1000).allow('', null),
    type: Joi.string().valid('PERCENT', 'FLAT').required(),
    value: Joi.number().greater(0).required(),
    scope: Joi.string().valid('SHOP', 'CATEGORIES', 'PRODUCTS').required(),
    categoryIds: Joi.when('scope', {
      is: 'CATEGORIES',
      then: Joi.array().items(Joi.string().trim().min(1).max(120)).min(1).max(100).required(),
      otherwise: Joi.array().items(Joi.string().trim().min(1).max(120)).max(100).optional(),
    }),
    productIds: Joi.when('scope', {
      is: 'PRODUCTS',
      then: Joi.array().items(objectId).min(1).max(500).required(),
      otherwise: Joi.array().items(objectId).max(500).optional(),
    }),
    minOrderValue: Joi.number().min(50).optional(),
    maxDiscount: Joi.number().min(0).optional(),
    applicableDays: Joi.array()
      .items(Joi.string().valid('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'))
      .max(7)
      .optional(),
    applicableHours: Joi.object({
      from: Joi.string().pattern(timeRegex).required(),
      to: Joi.string().pattern(timeRegex).required(),
    }).optional(),
    startsAt: Joi.date().required(),
    endsAt: Joi.date().required(),
    enabled: Joi.boolean().optional(),
  }),
  listQuery: Joi.object({
    active: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  offerIdParam: Joi.object({
    shopId: objectId.required(),
    offerId: objectId.required(),
  }),
  toggle: Joi.object({
    enabled: Joi.boolean().required(),
  }),
  applicableQuery: Joi.object({
    cartTotal: Joi.number().min(0).optional(),
    categoryIds: Joi.alternatives().try(Joi.array().items(objectId), Joi.string().allow('')).optional(),
    productIds: Joi.alternatives().try(Joi.array().items(objectId), Joi.string().allow('')).optional(),
    shopId: objectId.optional(),
    timestamp: Joi.date().optional(),
  }),
};

const shopOrderSchemas = {
  listQuery: Joi.object({
    status: Joi.string()
      .valid('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED')
      .optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    search: Joi.string().trim().max(100).optional(),
    sort: Joi.string().valid('recent', 'price', 'status').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  orderIdParam: Joi.object({
    shopId: objectId.required(),
    orderId: Joi.string().trim().min(3).max(30).required(),
  }),
  updateStatus: Joi.object({
    status: Joi.string()
      .valid('ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED')
      .required(),
    note: Joi.string().trim().max(400).allow('', null),
  }),
  reject: Joi.object({
    reason: Joi.string().trim().min(3).max(300).required(),
  }),
  analyticsQuery: Joi.object({
    from: Joi.date().required(),
    to: Joi.date().required(),
    groupBy: Joi.string().valid('daily', 'weekly').optional(),
  }),
};

const shopkeeperPaymentSchemas = {
  shopkeeperIdParam: Joi.object({
    shopkeeperId: objectId.required(),
  }),
  paymentIdParam: Joi.object({
    shopkeeperId: objectId.required(),
    paymentId: objectId.required(),
  }),
  refundIdParam: Joi.object({
    shopkeeperId: objectId.required(),
    refundId: objectId.required(),
  }),
  paymentQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    search: Joi.string().trim().max(120).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  paymentVerify: Joi.object({
    transactionDetails: Joi.object({
      transactionId: Joi.string().trim().min(3).max(120).optional(),
      note: Joi.string().trim().max(500).allow('', null),
    }).optional(),
  }),
  paymentBulkStatusUpdate: Joi.object({
    paymentIds: Joi.array().items(objectId).min(1).required(),
    status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').required(),
  }),
  refundQuery: Joi.object({
    status: Joi.string().valid('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    search: Joi.string().trim().max(120).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  refundCreate: Joi.object({
    paymentId: objectId.required(),
    orderId: objectId.required(),
    reason: Joi.string().trim().min(3).max(500).required(),
    refundAmount: Joi.number().greater(0).required(),
    refundMode: Joi.string().valid('BANK_TRANSFER', 'UPI', 'WALLET').required(),
  }),
  refundUpdate: Joi.object({
    status: Joi.string().valid('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED').required(),
    note: Joi.string().trim().max(500).allow('', null),
    bankDetails: Joi.object({
      accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).optional(),
      ifscCode: Joi.string().trim().uppercase().pattern(ifscRegex).optional(),
      bankName: Joi.string().trim().min(2).max(120).optional(),
    }).optional(),
  }),
  refundProcess: Joi.object({
    bankDetails: Joi.object({
      accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).required(),
      ifscCode: Joi.string().trim().uppercase().pattern(ifscRegex).required(),
      bankName: Joi.string().trim().min(2).max(120).required(),
    }).required(),
    transactionRef: Joi.string().trim().min(3).max(120).allow('', null),
    note: Joi.string().trim().max(500).allow('', null),
  }),
};

const adminCitySchemas = {
  createOrUpdate: Joi.object({
    name: Joi.string().trim().min(3).max(50).required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{3,50}$/).optional(),
    description: Joi.string().trim().max(300).allow('', null),
    state: Joi.string().trim().min(2).max(80).required(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    isActive: Joi.boolean().optional(),
    deliveryAvailable: Joi.boolean().required(),
    populationEstimate: Joi.number().integer().min(0).allow(null).optional(),
  }),
  listQuery: Joi.object({
    search: Joi.string().trim().max(100).optional(),
    active: Joi.boolean().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  cityIdParam: Joi.object({
    cityId: objectId.required(),
  }),
  toggleActive: Joi.object({
    isActive: Joi.boolean().required(),
  }),
  toggleDelivery: Joi.object({
    deliveryAvailable: Joi.boolean().required(),
  }),
};

const adminCategorySchemas = {
  createOrUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{2,80}$/).optional(),
    description: Joi.string().trim().max(300).allow('', null).required(),
    image: Joi.string().uri().allow('', null).required(),
    icon: Joi.string().uri().allow('', null).required(),
    displayOrder: Joi.number().integer().min(0).required(),
    subcategories: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().trim().min(2).max(80).optional(),
          name: Joi.string().trim().min(2).max(80).required(),
          slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{2,80}$/).optional(),
          isActive: Joi.boolean().optional(),
        })
      )
      .max(8)
      .required(),
  }),
  listQuery: Joi.object({
    search: Joi.string().trim().max(100).optional(),
    status: Joi.string().valid('DRAFT', 'PUBLISHED').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  categoryIdParam: Joi.object({
    categoryId: objectId.required(),
  }),
  toggleActive: Joi.object({
    isActive: Joi.boolean().required(),
  }),
  subcategoryCreate: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{2,80}$/).optional(),
  }),
  subcategoryUpdate: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{2,80}$/).optional(),
  }),
  subcategoryParam: Joi.object({
    categoryId: objectId.required(),
    subcatId: Joi.string().trim().min(2).max(100).required(),
  }),
};

const adminShopSchemas = {
  listQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED').optional(),
    search: Joi.string().trim().max(120).optional(),
    cityId: objectId.optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  shopIdParam: Joi.object({
    shopId: objectId.required(),
  }),
  approve: Joi.object({
    notes: Joi.string().trim().max(500).allow('', null),
  }),
  reject: Joi.object({
    reason: Joi.string().trim().min(3).max(400).required(),
  }),
  suspend: Joi.object({
    reason: Joi.string().trim().min(3).max(400).required(),
  }),
  togglePublic: Joi.object({
    publicVisible: Joi.boolean().required(),
  }),
  earningsQuery: Joi.object({
    from: Joi.date().optional(),
    to: Joi.date().optional(),
  }),
};

const adminFinanceSchemas = {
  paymentIdParam: Joi.object({
    paymentId: objectId.required(),
  }),
  paymentsListQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED').optional(),
    method: Joi.string().valid('COD', 'ONLINE').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  paymentsStatsQuery: Joi.object({
    dateFrom: Joi.date().required(),
    dateTo: Joi.date().required(),
  }),
  paymentVerify: Joi.object({
    verificationCode: Joi.string().trim().min(4).max(20).required(),
  }),
  defaultCommissionCreate: Joi.object({
    percentage: Joi.number().min(1).max(100).required(),
  }),
  overrideCommissionCreate: Joi.object({
    shopId: objectId.required(),
    percentage: Joi.number().min(1).max(100).required(),
    effectiveFrom: Joi.date().optional(),
    effectiveTill: Joi.date().optional(),
  }),
  overrideIdParam: Joi.object({
    overrideId: objectId.required(),
  }),
  payoutsListQuery: Joi.object({
    status: Joi.string().valid('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED').optional(),
    shopId: objectId.optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  payoutIdParam: Joi.object({
    payoutId: objectId.required(),
  }),
  payoutApprove: Joi.object({
    notes: Joi.string().trim().max(500).allow('', null),
  }),
  payoutReject: Joi.object({
    reason: Joi.string().trim().min(3).max(500).required(),
  }),
  payoutComplete: Joi.object({
    transactionRef: Joi.string().trim().min(3).max(120).required(),
  }),
  payoutGenerate: Joi.object({
    forDate: Joi.date().required(),
  }),
};

const adminOrderSchemas = {
  orderIdParam: Joi.object({
    orderId: Joi.string().trim().min(3).max(80).required(),
  }),
  ordersListQuery: Joi.object({
    status: Joi.string().valid('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED').optional(),
    cityId: objectId.optional(),
    shopId: objectId.optional(),
    userId: objectId.optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    paymentStatus: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED').optional(),
    search: Joi.string().trim().max(120).optional(),
    sort: Joi.string().valid('recent', 'value').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  orderForceCancel: Joi.object({
    reason: Joi.string().trim().min(3).max(500).required(),
  }),
  orderStatsQuery: Joi.object({
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    groupBy: Joi.string().valid('daily', 'hourly').optional(),
  }),
};

const adminRefundSchemas = {
  refundIdParam: Joi.object({
    refundId: objectId.required(),
  }),
  refundsListQuery: Joi.object({
    status: Joi.string().valid('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED').optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    shopId: objectId.optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  refundCreate: Joi.object({
    orderId: Joi.string().trim().min(3).max(80).required(),
    reason: Joi.string().trim().min(3).max(500).required(),
  }),
  refundProcess: Joi.object({
    notes: Joi.string().trim().max(500).allow('', null),
    bankDetails: Joi.object({
      accountNumber: Joi.string().trim().pattern(/^\d{9,18}$/).required(),
      ifscCode: Joi.string().trim().uppercase().pattern(ifscRegex).required(),
      bankName: Joi.string().trim().min(2).max(120).required(),
    }).optional(),
  }),
  refundComplete: Joi.object({
    transactionRef: Joi.string().trim().min(3).max(120).required(),
  }),
  refundFail: Joi.object({
    reason: Joi.string().trim().min(3).max(500).required(),
  }),
};

const adminCouponSchemas = {
  couponIdParam: Joi.object({
    couponId: objectId.required(),
  }),
  couponsListQuery: Joi.object({
    active: Joi.boolean().optional(),
    search: Joi.string().trim().max(120).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  createOrUpdate: Joi.object({
    code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{3,20}$/).optional(),
    description: Joi.string().trim().max(300).allow('', null),
    discountType: Joi.string().valid('PERCENT', 'FLAT').required(),
    discountValue: Joi.number().greater(0).required(),
    maxDiscount: Joi.number().greater(0).allow(null).optional(),
    minOrderValue: Joi.number().min(0).required(),
    maxUsageLimit: Joi.number().integer().min(1).required(),
    maxUsagePerUser: Joi.number().integer().min(1).required(),
    validFrom: Joi.date().required(),
    validTill: Joi.date().required(),
    applicableCity: objectId.allow(null).optional(),
    applicableShops: Joi.array().items(objectId).optional(),
    applicableCategories: Joi.array().items(objectId).optional(),
    isActive: Joi.boolean().optional(),
  }),
  toggleActive: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};

const adminSubscriptionSchemas = {
  planIdParam: Joi.object({
    planId: objectId.required(),
  }),
  subscriptionIdParam: Joi.object({
    subscriptionId: objectId.required(),
  }),
  plansListQuery: Joi.object({
    active: Joi.boolean().optional(),
  }),
  subscriptionsListQuery: Joi.object({
    status: Joi.string().valid('ACTIVE', 'EXPIRED', 'CANCELLED').optional(),
    planId: objectId.optional(),
    cityId: objectId.optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  planCreateOrUpdate: Joi.object({
    name: Joi.string().valid('BASIC', 'PREMIUM', 'PLATINUM').required(),
    slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]{3,80}$/).optional(),
    description: Joi.string().trim().max(500).allow('', null),
    pricing: Joi.object({
      monthlyPrice: Joi.number().min(0).required(),
      yearlyPrice: Joi.number().min(0).required(),
      freePeriodMonths: Joi.number().integer().min(0).required(),
    }).required(),
    features: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().trim().min(1).max(80).required(),
          name: Joi.string().trim().min(1).max(120).required(),
          icon: Joi.string().trim().max(120).allow('', null),
          description: Joi.string().trim().max(250).allow('', null),
        })
      )
      .optional(),
    limits: Joi.object({
      maxProducts: Joi.number().integer().min(0).required(),
      maxOffers: Joi.number().integer().min(0).required(),
      maxImages: Joi.number().integer().min(0).required(),
      storageGb: Joi.number().min(0).required(),
    }).required(),
    benefits: Joi.object({
      priorityListing: Joi.boolean().required(),
      analyticsAccess: Joi.boolean().required(),
      apiAccess: Joi.boolean().required(),
      dedicatedSupport: Joi.boolean().required(),
    }).required(),
    displayOrder: Joi.number().integer().min(0).required(),
    isActive: Joi.boolean().optional(),
  }),
  planToggle: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};

const couponPublicSchemas = {
  validateQuery: Joi.object({
    code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9]{3,20}$/).required(),
    cartTotal: Joi.number().min(0).optional(),
    cityId: objectId.optional(),
    shopId: objectId.optional(),
  }),
};

const adminAuditSchemas = {
  logIdParam: Joi.object({
    logId: objectId.required(),
  }),
  logsListQuery: Joi.object({
    eventType: Joi.string().trim().max(80).optional(),
    actorId: objectId.optional(),
    resourceType: Joi.string().trim().max(80).optional(),
    action: Joi.string().trim().max(80).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    search: Joi.string().trim().max(120).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  analyticsQuery: Joi.object({
    dateFrom: Joi.date().required(),
    dateTo: Joi.date().required(),
  }),
  exportQuery: Joi.object({
    dateFrom: Joi.date().required(),
    dateTo: Joi.date().required(),
    eventType: Joi.string().trim().max(80).optional(),
    actorId: objectId.optional(),
    resourceType: Joi.string().trim().max(80).optional(),
    action: Joi.string().trim().max(80).optional(),
    search: Joi.string().trim().max(120).optional(),
  }),
};

const adminConfigSchemas = {
  listQuery: Joi.object({
    category: Joi.string()
      .valid('GENERAL', 'PAYMENT', 'COMMISSION', 'DELIVERY', 'SUBSCRIPTION', 'OTP', 'CART', 'REVIEW', 'ORDER', 'REFUND')
      .optional(),
  }),
  keyParam: Joi.object({
    key: Joi.string().trim().min(3).max(120).required(),
  }),
  update: Joi.object({
    value: Joi.any().required(),
  }),
  reset: Joi.object({
    key: Joi.string().trim().min(3).max(120).required(),
  }),
};

const adminUserSchemas = {
  listQuery: Joi.object({
    search: Joi.string().trim().max(120).optional(),
    verified: Joi.boolean().optional(),
    cityId: objectId.optional(),
    createdFrom: Joi.date().optional(),
    createdTo: Joi.date().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
  }),
  userIdParam: Joi.object({
    userId: objectId.required(),
  }),
};

const adminBannerSchemas = {
  createOrUpdate: Joi.object({
    title: Joi.string().trim().min(3).max(100).required(),
    imageUrl: Joi.string().trim().min(1).required(), // Accept both absolute URIs and relative paths
    redirectUrl: Joi.string().uri().allow('', null).optional(),
    description: Joi.string().trim().max(300).allow('', null).optional(),
    position: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    bannerType: Joi.string().valid('PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED').optional(),
    targetAudience: Joi.string().valid('ALL', 'NEW_USERS', 'RETURNING_USERS').optional(),
    startDate: Joi.date().allow(null).optional(),
    endDate: Joi.date().allow(null).optional(),
  }),
  listQuery: Joi.object({
    isActive: Joi.boolean().optional(),
    bannerType: Joi.string().valid('PROMOTIONAL', 'SEASONAL', 'GENERAL', 'FEATURED').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
    sortBy: Joi.string().valid('position', 'createdAt', 'updatedAt').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  }),
  bannerIdParam: Joi.object({
    bannerId: objectId.required(),
  }),
  toggleActive: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};

module.exports = {
  objectId,
  authSchemas,
  userSchemas,
  cartSchemas,
  orderSchemas,
  paymentSchemas,
  reviewSchemas,
  shopkeeperSchemas,
  shopManagementSchemas,
  productManagementSchemas,
  offerSchemas,
  shopOrderSchemas,
  shopkeeperPaymentSchemas,
  adminCitySchemas,
  adminCategorySchemas,
  adminShopSchemas,
  adminFinanceSchemas,
  adminOrderSchemas,
  adminRefundSchemas,
  adminCouponSchemas,
  adminSubscriptionSchemas,
  couponPublicSchemas,
  adminAuditSchemas,
  adminConfigSchemas,
  adminUserSchemas,
  adminBannerSchemas,
  indianPhoneRegex,
  otpRegex,
  passwordRegex,
  timeRegex,
  ifscRegex,
  formatPhone,
};
