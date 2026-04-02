import { ReviewTargetType } from '../types/review';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  OtpVerify:
    | {
        phone: string;
        mode: 'register';
        fullName: string;
        password: string;
      }
    | {
        phone: string;
        mode: 'forgotPassword';
      };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ShopDetails: { shopId: string };
  ProductDetail: { shopId: string; productId: string };
  CategoryShops: { categoryId: string };
  ShopListing: { categoryId?: string; title?: string } | undefined;
  SubcategoryProducts: { shopId: string; subcategoryId: string };
  AddressList: undefined;
  AddEditAddress: { addressId?: string; returnTo?: 'checkout' } | undefined;
  HelpCenter: undefined;
  Notifications: undefined;
  TermsAndPrivacy: undefined;
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
  Coupons: { returnTo?: 'cart' | 'checkout'; shopId?: string } | undefined;
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
