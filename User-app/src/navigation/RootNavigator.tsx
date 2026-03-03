import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useCity } from '../contexts/CityContext';
import { AddEditAddressScreen } from '../screens/AddEditAddressScreen';
import { AddressListScreen } from '../screens/AddressListScreen';
import { CartScreen } from '../screens/CartScreen';
import { CategoryShopsScreen } from '../screens/CategoryShopsScreen';
import { CitySelectionScreen } from '../screens/CitySelectionScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { CouponsScreen } from '../screens/CouponsScreen';
import { HelpCenterScreen } from '../screens/HelpCenterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { InvoiceScreen } from '../screens/InvoiceScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NotificationCenterScreen } from '../screens/NotificationCenterScreen';
import { MyReviewsScreen } from '../screens/MyReviewsScreen';
import { OrderDetailsScreen } from '../screens/OrderDetailsScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { PaymentScreen } from '../screens/PaymentScreen';
import { OtpVerifyScreen } from '../screens/OtpVerifyScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddEditReviewScreen } from '../screens/AddEditReviewScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SellerOnboardingScreen } from '../screens/SellerOnboardingScreen';
import { SellerOnboardingSuccessScreen } from '../screens/SellerOnboardingSuccessScreen';
import { SellerStatusScreen } from '../screens/SellerStatusScreen';
import { SellerSubmissionDetailsScreen } from '../screens/SellerSubmissionDetailsScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { ShopRegistrationScreen } from '../screens/ShopRegistrationScreen';
import { ShopDetailsScreen } from '../screens/ShopDetailsScreen';
import { ShopListingScreen } from '../screens/ShopListingScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { SubcategoryProductsScreen } from '../screens/SubcategoryProductsScreen';
import { AuthStackParamList, HomeStackParamList, MainTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const CityStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="OtpVerify" component={OtpVerifyScreen} />
    </AuthStack.Navigator>
  );
}

function CityNavigator() {
  return (
    <CityStack.Navigator screenOptions={{ headerShown: false }}>
      <CityStack.Screen name="CitySelection" component={CitySelectionScreen} />
    </CityStack.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="CategoryShops" component={CategoryShopsScreen} />
      <HomeStack.Screen name="ShopListing" component={ShopListingScreen} />
      <HomeStack.Screen name="ShopDetails" component={ShopDetailsScreen} />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <HomeStack.Screen name="SubcategoryProducts" component={SubcategoryProductsScreen} />
      <HomeStack.Screen name="AddressList" component={AddressListScreen} />
      <HomeStack.Screen name="AddEditAddress" component={AddEditAddressScreen} />
      <HomeStack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationCenterScreen} />
      <HomeStack.Screen name="ShopRegistration" component={ShopRegistrationScreen} />
      <HomeStack.Screen name="SellerOnboarding" component={SellerOnboardingScreen} />
      <HomeStack.Screen
        name="SellerOnboardingSuccess"
        component={SellerOnboardingSuccessScreen}
      />
      <HomeStack.Screen name="SellerStatus" component={SellerStatusScreen} />
      <HomeStack.Screen
        name="SellerSubmissionDetails"
        component={SellerSubmissionDetailsScreen}
      />
      <HomeStack.Screen name="MyReviews" component={MyReviewsScreen} />
      <HomeStack.Screen name="AddEditReview" component={AddEditReviewScreen} />
      <HomeStack.Screen name="Checkout" component={CheckoutScreen} />
      <HomeStack.Screen name="Coupons" component={CouponsScreen} />
      <HomeStack.Screen name="Payment" component={PaymentScreen} />
      <HomeStack.Screen name="Invoice" component={InvoiceScreen} />
      <HomeStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
      <HomeStack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <HomeStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#22A55D',
        tabBarInactiveTintColor: '#6B7280',
        tabBarIcon: ({ color, size, focused }) => {
          const iconNameByRoute: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
            Home: focused ? 'home' : 'home-outline',
            Search: focused ? 'search' : 'search-outline',
            Cart: focused ? 'cart' : 'cart-outline',
            Orders: focused ? 'receipt' : 'receipt-outline',
            Profile: focused ? 'person' : 'person-outline',
          };

          const iconName = iconNameByRoute[route.name as keyof MainTabParamList] ?? 'ellipse';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeNavigator} />
      <Tabs.Screen name="Search" component={SearchScreen} />
      <Tabs.Screen name="Cart" component={CartScreen} />
      <Tabs.Screen name="Orders" component={OrdersScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { city, isHydrated: cityHydrated } = useCity();
  const { isAuthenticated, isHydrated: authHydrated } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash || !cityHydrated || !authHydrated) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {!city ? <CityNavigator /> : !isAuthenticated ? <AuthNavigator /> : <MainTabNavigator />}
    </NavigationContainer>
  );
}
