import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ProfileMenuItem } from '../components/profile/ProfileMenuItem';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Divider } from '../components/ui/Divider';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCity } from '../contexts/CityContext';
import { getUnreadCount, seedNotificationsIfEmpty } from '../services/notifications/notificationService';

const maskPhone = (value?: string) => {
  if (!value) {
    return null;
  }

  const digits = value.replace(/[^\d]/g, '');

  if (digits.length < 10) {
    return null;
  }

  return `+91 ******${digits.slice(-4)}`;
};

const tokenIdentity = (token: string | null) => {
  if (!token) {
    return 'Guest user';
  }

  const maybePhone = maskPhone(token);
  if (maybePhone) {
    return maybePhone;
  }

  if (token.length <= 8) {
    return `ID: ${token}`;
  }

  return `ID: ${token.slice(0, 4)}•••${token.slice(-3)}`;
};

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { city, clearCity } = useCity();
  const { token, isAuthenticated, logout } = useAuth();
  const { clearCart, clearCoupon } = useCart();
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const userIdentity = useMemo(() => tokenIdentity(token), [token]);

  const loadUnreadNotifications = useCallback(async () => {
    await seedNotificationsIfEmpty();
    const unreadCount = await getUnreadCount();
    setUnreadNotifications(unreadCount);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUnreadNotifications();
    }, [loadUnreadNotifications]),
  );

  const handleAddressList = () => {
    navigation.navigate('Home', { screen: 'AddressList' });
  };

  const handleCoupons = () => {
    navigation.navigate('Home', { screen: 'Coupons' });
  };

  const handleNotifications = () => {
    navigation.navigate('Home', { screen: 'Notifications' });
  };

  const handleMyReviews = () => {
    navigation.navigate('Home', { screen: 'MyReviews' });
  };

  const handleHelpCenter = () => {
    navigation.navigate('Home', { screen: 'HelpCenter' });
  };

  const handleOrders = () => {
    navigation.navigate('Orders');
  };

  const handleCart = () => {
    navigation.navigate('Cart');
  };

  const handleChangeCity = () => {
    Alert.alert('Change city?', 'You will need to select city again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Change',
        onPress: async () => {
          clearCoupon();
          clearCart();
          await clearCity();
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          clearCoupon();
          clearCart();
          await logout();
        },
      },
    ]);
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, 'Coming soon');
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="My Account" />

      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <AppText style={styles.avatarText}>U</AppText>
        </View>

        <View style={styles.profileTextWrap}>
          <AppText style={styles.profileTitle}>My Account</AppText>
          <AppText style={styles.profileStatus}>{isAuthenticated ? 'Logged in' : 'Not logged in'}</AppText>
          <AppText style={styles.profileIdentity}>{userIdentity}</AppText>
        </View>
      </View>

      <View style={styles.quickActionsRow}>
        <Pressable style={styles.quickTile} onPress={handleOrders}>
          <AppText style={styles.quickTileIcon}>📦</AppText>
          <AppText style={styles.quickTileText}>My Orders</AppText>
        </Pressable>

        <Pressable style={styles.quickTile} onPress={handleCart}>
          <AppText style={styles.quickTileIcon}>🛒</AppText>
          <AppText style={styles.quickTileText}>My Cart</AppText>
        </Pressable>

        <Pressable style={styles.quickTile} onPress={handleAddressList}>
          <AppText style={styles.quickTileIcon}>📍</AppText>
          <AppText style={styles.quickTileText}>Addresses</AppText>
        </Pressable>
      </View>

      <View style={styles.sectionWrap}>
        <AppText style={styles.sectionLabel}>Shopping</AppText>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            leftIcon="🏠"
            title="Saved Addresses"
            subtitle="Manage delivery addresses"
            onPress={handleAddressList}
          />
          <Divider spacingVertical={0} />
          <ProfileMenuItem
            leftIcon="🏷️"
            title="Coupons & Offers"
            subtitle="View latest deals"
            onPress={handleCoupons}
          />
          <Divider spacingVertical={0} />
          <ProfileMenuItem
            leftIcon="🔔"
            title="Notifications"
            subtitle="Order and app alerts"
            onPress={handleNotifications}
            rightText={unreadNotifications > 0 ? String(unreadNotifications) : undefined}
          />
          <Divider spacingVertical={0} />
          <ProfileMenuItem
            leftIcon="⭐"
            title="My Reviews"
            subtitle="View and edit your ratings"
            onPress={handleMyReviews}
          />
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <AppText style={styles.sectionLabel}>Support</AppText>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            leftIcon="🛟"
            title="Help Center"
            subtitle="FAQs and support"
            onPress={handleHelpCenter}
          />
        </View>
      </View>

      <View style={styles.sectionWrap}>
        <AppText style={styles.sectionLabel}>Settings</AppText>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            leftIcon="🏙️"
            title="Change City"
            subtitle={city?.name ? `Current: ${city.name}` : 'Select your city'}
            onPress={handleChangeCity}
          />
          <Divider spacingVertical={0} />
          <ProfileMenuItem
            leftIcon="🚪"
            title="Logout"
            subtitle="Sign out from this device"
            destructive
            onPress={handleLogout}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#3730A3',
  },
  profileTextWrap: {
    flex: 1,
    gap: 2,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  profileStatus: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '700',
  },
  profileIdentity: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  quickTile: {
    flex: 1,
    minHeight: 74,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  quickTileIcon: {
    fontSize: 18,
  },
  quickTileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  sectionWrap: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
});
