import { ReviewTargetType } from '../types/review';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OtpVerify: { phone: string };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ShopDetails: { shopId: string };
  ProductDetail: { shopId: string; productId: string };
  CategoryShops: { categoryId: string };
  ShopListing: { categoryId?: string; title?: string } | undefined;
  SubcategoryProducts: { shopId: string; subcategoryId: string };
  AddressList: undefined;
  AddEditAddress: { addressId?: string } | undefined;
  HelpCenter: undefined;
  Notifications: undefined;
  ShopRegistration: undefined;
  SellerOnboarding: undefined;
  SellerOnboardingSuccess: { registrationId: string };
  SellerStatus: undefined;
  SellerSubmissionDetails: { registrationId: string };
  MyReviews: undefined;
  AddEditReview:
    | {
        reviewId?: string;
        targetType?: ReviewTargetType;
        targetId?: string;
        orderId?: string;
      }
    | undefined;
  Checkout: undefined;
  Coupons: { returnTo?: 'cart' | 'checkout' } | undefined;
  Payment: { orderId: string };
  Invoice: { orderId: string };
  OrderSuccess: { orderId: string };
  OrderDetails: { orderId: string };
  OrderTracking: { orderId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined;
};
