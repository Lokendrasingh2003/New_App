const { ValidationError } = require('../utils/errors');
const {
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
} = require('../utils/validators');

const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = {};
      for (const item of error.details || []) {
        const field = Array.isArray(item.path) ? item.path.join('.') : String(item.path || 'unknown');
        details[field] = item.message;
      }

      return next(new ValidationError('Validation failed', details));
    }

    req[source] = value;
    return next();
  };
};

const validatePhone = () => validate(authSchemas.sendOtp);

const validateOtp = () => validate(authSchemas.verifyOtp);

const validateRefreshToken = () => validate(authSchemas.refreshToken);

const validateProfileUpdate = () => validate(userSchemas.updateProfile);

const validateCreateAddress = () => validate(userSchemas.createAddress);

const validateUpdateAddress = () => validate(userSchemas.updateAddress);

const validateAddressIdParam = () => validate(userSchemas.addressIdParam, 'params');

const validateCartAddItem = () => validate(cartSchemas.addItem);

const validateCartUpdateItem = () => validate(cartSchemas.updateItem);

const validateCartItemParam = () => validate(cartSchemas.itemParam, 'params');

const validateCartCoupon = () => validate(cartSchemas.coupon);

const validateCartShippingQuery = () => validate(cartSchemas.shippingEstimateQuery, 'query');

const validateOrderCreate = () => validate(orderSchemas.create);

const validateOrdersQuery = () => validate(orderSchemas.listQuery, 'query');

const validateOrderIdParam = () => validate(orderSchemas.orderIdParam, 'params');

const validateOrderCancel = () => validate(orderSchemas.cancel);

const validateOrderFeedback = () => validate(orderSchemas.feedback);

const validatePaymentVerify = () => validate(paymentSchemas.verify);

const validatePaymentRefund = () => validate(paymentSchemas.refund);

const validateReviewCreate = () => validate(reviewSchemas.create);

const validateReviewUpdate = () => validate(reviewSchemas.update);

const validateReviewListQuery = () => validate(reviewSchemas.listQuery, 'query');

const validateReviewIdParam = () => validate(reviewSchemas.reviewIdParam, 'params');

const validateProductIdParam = () => validate(reviewSchemas.productIdParam, 'params');

const validateReviewHelpful = () => validate(reviewSchemas.helpful);

const validateShopkeeperRegister = () => validate(shopkeeperSchemas.register);

const validateShopkeeperLogin = () => validate(shopkeeperSchemas.login);

const validateShopkeeperRefresh = () => validate(shopkeeperSchemas.refreshToken);

const validateShopkeeperProfile = () => validate(shopkeeperSchemas.profile);

const validateShopkeeperChangePassword = () => validate(shopkeeperSchemas.changePassword);

const validateShopkeeperVerifyEmail = () => validate(shopkeeperSchemas.verifyEmail);

const validateShopkeeperBankDetails = () => validate(shopkeeperSchemas.bankDetails);

const validateShopRegister = () => validate(shopManagementSchemas.register);

const validateShopSettings = () => validate(shopManagementSchemas.settings);

const validateShopBusinessHours = () => validate(shopManagementSchemas.businessHours);

const validateShopDeliveryConfig = () => validate(shopManagementSchemas.deliveryConfig);

const validateShopIdParam = () => validate(shopManagementSchemas.shopIdParam, 'params');

const validateProductManageCreate = () => validate(productManagementSchemas.createOrUpdate);

const validateProductManageListQuery = () => validate(productManagementSchemas.listQuery, 'query');

const validateProductManageIdParam = () => validate(productManagementSchemas.productIdParam, 'params');

const validateProductManageImageParam = () => validate(productManagementSchemas.productImageParam, 'params');

const validateProductManageStock = () => validate(productManagementSchemas.stockPatch);

const validateOfferCreate = () => validate(offerSchemas.createOrUpdate);

const validateOfferListQuery = () => validate(offerSchemas.listQuery, 'query');

const validateOfferIdParam = () => validate(offerSchemas.offerIdParam, 'params');

const validateOfferToggle = () => validate(offerSchemas.toggle);

const validateOfferApplicableQuery = () => validate(offerSchemas.applicableQuery, 'query');

const validateShopOrdersListQuery = () => validate(shopOrderSchemas.listQuery, 'query');

const validateShopOrderIdParam = () => validate(shopOrderSchemas.orderIdParam, 'params');

const validateShopOrderUpdate = () => validate(shopOrderSchemas.updateStatus);

const validateShopOrderReject = () => validate(shopOrderSchemas.reject);

const validateShopOrdersAnalyticsQuery = () => validate(shopOrderSchemas.analyticsQuery, 'query');

const validateShopkeeperIdParam = () => validate(shopkeeperPaymentSchemas.shopkeeperIdParam, 'params');

const validateShopkeeperPaymentIdParam = () => validate(shopkeeperPaymentSchemas.paymentIdParam, 'params');

const validateShopkeeperRefundIdParam = () => validate(shopkeeperPaymentSchemas.refundIdParam, 'params');

const validateShopkeeperPaymentQuery = () => validate(shopkeeperPaymentSchemas.paymentQuery, 'query');

const validateShopkeeperPaymentVerify = () => validate(shopkeeperPaymentSchemas.paymentVerify);

const validateShopkeeperPaymentBulkStatusUpdate = () => validate(shopkeeperPaymentSchemas.paymentBulkStatusUpdate);

const validateShopkeeperRefundQuery = () => validate(shopkeeperPaymentSchemas.refundQuery, 'query');

const validateShopkeeperRefundCreate = () => validate(shopkeeperPaymentSchemas.refundCreate);

const validateShopkeeperRefundUpdate = () => validate(shopkeeperPaymentSchemas.refundUpdate);

const validateShopkeeperRefundProcess = () => validate(shopkeeperPaymentSchemas.refundProcess);

const validateAdminCityCreate = () => validate(adminCitySchemas.createOrUpdate);

const validateAdminCityUpdate = () => validate(adminCitySchemas.createOrUpdate);

const validateAdminCitiesListQuery = () => validate(adminCitySchemas.listQuery, 'query');

const validateAdminCityIdParam = () => validate(adminCitySchemas.cityIdParam, 'params');

const validateAdminCityToggleActive = () => validate(adminCitySchemas.toggleActive);

const validateAdminCityToggleDelivery = () => validate(adminCitySchemas.toggleDelivery);

const validateAdminCategoryCreate = () => validate(adminCategorySchemas.createOrUpdate);

const validateAdminCategoryUpdate = () => validate(adminCategorySchemas.createOrUpdate);

const validateAdminCategoriesListQuery = () => validate(adminCategorySchemas.listQuery, 'query');

const validateAdminCategoryIdParam = () => validate(adminCategorySchemas.categoryIdParam, 'params');

const validateAdminCategoryToggleActive = () => validate(adminCategorySchemas.toggleActive);

const validateAdminSubcategoryCreate = () => validate(adminCategorySchemas.subcategoryCreate);

const validateAdminSubcategoryUpdate = () => validate(adminCategorySchemas.subcategoryUpdate);

const validateAdminSubcategoryParam = () => validate(adminCategorySchemas.subcategoryParam, 'params');

const validateAdminShopsListQuery = () => validate(adminShopSchemas.listQuery, 'query');

const validateAdminShopIdParam = () => validate(adminShopSchemas.shopIdParam, 'params');

const validateAdminShopApprove = () => validate(adminShopSchemas.approve);

const validateAdminShopReject = () => validate(adminShopSchemas.reject);

const validateAdminShopSuspend = () => validate(adminShopSchemas.suspend);

const validateAdminShopTogglePublic = () => validate(adminShopSchemas.togglePublic);

const validateAdminShopEarningsQuery = () => validate(adminShopSchemas.earningsQuery, 'query');

const validateAdminPaymentIdParam = () => validate(adminFinanceSchemas.paymentIdParam, 'params');

const validateAdminPaymentsListQuery = () => validate(adminFinanceSchemas.paymentsListQuery, 'query');

const validateAdminPaymentsStatsQuery = () => validate(adminFinanceSchemas.paymentsStatsQuery, 'query');

const validateAdminPaymentVerify = () => validate(adminFinanceSchemas.paymentVerify);

const validateAdminCommissionDefaultCreate = () => validate(adminFinanceSchemas.defaultCommissionCreate);

const validateAdminCommissionOverrideCreate = () => validate(adminFinanceSchemas.overrideCommissionCreate);

const validateAdminCommissionOverrideIdParam = () => validate(adminFinanceSchemas.overrideIdParam, 'params');

const validateAdminPayoutsListQuery = () => validate(adminFinanceSchemas.payoutsListQuery, 'query');

const validateAdminPayoutIdParam = () => validate(adminFinanceSchemas.payoutIdParam, 'params');

const validateAdminPayoutApprove = () => validate(adminFinanceSchemas.payoutApprove);

const validateAdminPayoutReject = () => validate(adminFinanceSchemas.payoutReject);

const validateAdminPayoutComplete = () => validate(adminFinanceSchemas.payoutComplete);

const validateAdminPayoutGenerate = () => validate(adminFinanceSchemas.payoutGenerate);

const validateAdminOrderIdParam = () => validate(adminOrderSchemas.orderIdParam, 'params');

const validateAdminOrdersListQuery = () => validate(adminOrderSchemas.ordersListQuery, 'query');

const validateAdminOrderForceCancel = () => validate(adminOrderSchemas.orderForceCancel);

const validateAdminOrderStatsQuery = () => validate(adminOrderSchemas.orderStatsQuery, 'query');

const validateAdminRefundIdParam = () => validate(adminRefundSchemas.refundIdParam, 'params');

const validateAdminRefundsListQuery = () => validate(adminRefundSchemas.refundsListQuery, 'query');

const validateAdminRefundCreate = () => validate(adminRefundSchemas.refundCreate);

const validateAdminRefundProcess = () => validate(adminRefundSchemas.refundProcess);

const validateAdminRefundComplete = () => validate(adminRefundSchemas.refundComplete);

const validateAdminRefundFail = () => validate(adminRefundSchemas.refundFail);

const validateAdminCouponIdParam = () => validate(adminCouponSchemas.couponIdParam, 'params');

const validateAdminCouponsListQuery = () => validate(adminCouponSchemas.couponsListQuery, 'query');

const validateAdminCouponCreate = () => validate(adminCouponSchemas.createOrUpdate);

const validateAdminCouponUpdate = () => validate(adminCouponSchemas.createOrUpdate);

const validateAdminCouponToggle = () => validate(adminCouponSchemas.toggleActive);

const validateAdminSubscriptionPlanIdParam = () => validate(adminSubscriptionSchemas.planIdParam, 'params');

const validateAdminSubscriptionIdParam = () => validate(adminSubscriptionSchemas.subscriptionIdParam, 'params');

const validateAdminSubscriptionPlanListQuery = () => validate(adminSubscriptionSchemas.plansListQuery, 'query');

const validateAdminSubscriptionsListQuery = () => validate(adminSubscriptionSchemas.subscriptionsListQuery, 'query');

const validateAdminSubscriptionPlanCreate = () => validate(adminSubscriptionSchemas.planCreateOrUpdate);

const validateAdminSubscriptionPlanUpdate = () => validate(adminSubscriptionSchemas.planCreateOrUpdate);

const validateAdminSubscriptionPlanToggle = () => validate(adminSubscriptionSchemas.planToggle);

const validateCouponPublicQuery = () => validate(couponPublicSchemas.validateQuery, 'query');

const validateAdminAuditLogIdParam = () => validate(adminAuditSchemas.logIdParam, 'params');

const validateAdminAuditLogsListQuery = () => validate(adminAuditSchemas.logsListQuery, 'query');

const validateAdminAuditAnalyticsQuery = () => validate(adminAuditSchemas.analyticsQuery, 'query');

const validateAdminAuditExportQuery = () => validate(adminAuditSchemas.exportQuery, 'query');

const validateAdminConfigListQuery = () => validate(adminConfigSchemas.listQuery, 'query');

const validateAdminConfigKeyParam = () => validate(adminConfigSchemas.keyParam, 'params');

const validateAdminConfigUpdate = () => validate(adminConfigSchemas.update);

const validateAdminConfigReset = () => validate(adminConfigSchemas.reset);

module.exports = {
  validate,
  validatePhone,
  validateOtp,
  validateRefreshToken,
  validateProfileUpdate,
  validateCreateAddress,
  validateUpdateAddress,
  validateAddressIdParam,
  validateCartAddItem,
  validateCartUpdateItem,
  validateCartItemParam,
  validateCartCoupon,
  validateCartShippingQuery,
  validateOrderCreate,
  validateOrdersQuery,
  validateOrderIdParam,
  validateOrderCancel,
  validateOrderFeedback,
  validatePaymentVerify,
  validatePaymentRefund,
  validateReviewCreate,
  validateReviewUpdate,
  validateReviewListQuery,
  validateReviewIdParam,
  validateProductIdParam,
  validateReviewHelpful,
  validateShopkeeperRegister,
  validateShopkeeperLogin,
  validateShopkeeperRefresh,
  validateShopkeeperProfile,
  validateShopkeeperChangePassword,
  validateShopkeeperVerifyEmail,
  validateShopkeeperBankDetails,
  validateShopRegister,
  validateShopSettings,
  validateShopBusinessHours,
  validateShopDeliveryConfig,
  validateShopIdParam,
  validateProductManageCreate,
  validateProductManageListQuery,
  validateProductManageIdParam,
  validateProductManageImageParam,
  validateProductManageStock,
  validateOfferCreate,
  validateOfferListQuery,
  validateOfferIdParam,
  validateOfferToggle,
  validateOfferApplicableQuery,
  validateShopOrdersListQuery,
  validateShopOrderIdParam,
  validateShopOrderUpdate,
  validateShopOrderReject,
  validateShopOrdersAnalyticsQuery,
  validateShopkeeperIdParam,
  validateShopkeeperPaymentIdParam,
  validateShopkeeperRefundIdParam,
  validateShopkeeperPaymentQuery,
  validateShopkeeperPaymentVerify,
  validateShopkeeperPaymentBulkStatusUpdate,
  validateShopkeeperRefundQuery,
  validateShopkeeperRefundCreate,
  validateShopkeeperRefundUpdate,
  validateShopkeeperRefundProcess,
  validateAdminCityCreate,
  validateAdminCityUpdate,
  validateAdminCitiesListQuery,
  validateAdminCityIdParam,
  validateAdminCityToggleActive,
  validateAdminCityToggleDelivery,
  validateAdminCategoryCreate,
  validateAdminCategoryUpdate,
  validateAdminCategoriesListQuery,
  validateAdminCategoryIdParam,
  validateAdminCategoryToggleActive,
  validateAdminSubcategoryCreate,
  validateAdminSubcategoryUpdate,
  validateAdminSubcategoryParam,
  validateAdminShopsListQuery,
  validateAdminShopIdParam,
  validateAdminShopApprove,
  validateAdminShopReject,
  validateAdminShopSuspend,
  validateAdminShopTogglePublic,
  validateAdminShopEarningsQuery,
  validateAdminPaymentIdParam,
  validateAdminPaymentsListQuery,
  validateAdminPaymentsStatsQuery,
  validateAdminPaymentVerify,
  validateAdminCommissionDefaultCreate,
  validateAdminCommissionOverrideCreate,
  validateAdminCommissionOverrideIdParam,
  validateAdminPayoutsListQuery,
  validateAdminPayoutIdParam,
  validateAdminPayoutApprove,
  validateAdminPayoutReject,
  validateAdminPayoutComplete,
  validateAdminPayoutGenerate,
  validateAdminOrderIdParam,
  validateAdminOrdersListQuery,
  validateAdminOrderForceCancel,
  validateAdminOrderStatsQuery,
  validateAdminRefundIdParam,
  validateAdminRefundsListQuery,
  validateAdminRefundCreate,
  validateAdminRefundProcess,
  validateAdminRefundComplete,
  validateAdminRefundFail,
  validateAdminCouponIdParam,
  validateAdminCouponsListQuery,
  validateAdminCouponCreate,
  validateAdminCouponUpdate,
  validateAdminCouponToggle,
  validateAdminSubscriptionPlanIdParam,
  validateAdminSubscriptionIdParam,
  validateAdminSubscriptionPlanListQuery,
  validateAdminSubscriptionsListQuery,
  validateAdminSubscriptionPlanCreate,
  validateAdminSubscriptionPlanUpdate,
  validateAdminSubscriptionPlanToggle,
  validateCouponPublicQuery,
  validateAdminAuditLogIdParam,
  validateAdminAuditLogsListQuery,
  validateAdminAuditAnalyticsQuery,
  validateAdminAuditExportQuery,
  validateAdminConfigListQuery,
  validateAdminConfigKeyParam,
  validateAdminConfigUpdate,
  validateAdminConfigReset,
};
