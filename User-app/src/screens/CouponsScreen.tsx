import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Divider } from '../components/ui/Divider';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { MockCoupon, mockCoupons } from '../services/coupons/mockCoupons';

const isCouponExpired = (expiryDate: string) => new Date(expiryDate).getTime() < Date.now();

export function CouponsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'Coupons'>>();
  const { appliedCoupon, applyCoupon, clearCoupon } = useCart();

  const [query, setQuery] = useState('');
  const [isApplyingCode, setIsApplyingCode] = useState<string | null>(null);
  const [errorByCode, setErrorByCode] = useState<Record<string, string | undefined>>({});

  const filteredCoupons = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return mockCoupons;
    }

    return mockCoupons.filter((coupon) => {
      return (
        coupon.code.toLowerCase().includes(normalizedQuery) ||
        coupon.title.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  const handleApplyToCart = async (coupon: MockCoupon) => {
    setErrorByCode((previous) => ({ ...previous, [coupon.code]: undefined }));
    setIsApplyingCode(coupon.code);

    const result = await applyCoupon(coupon.code);

    setIsApplyingCode(null);

    if (!result.ok) {
      setErrorByCode((previous) => ({
        ...previous,
        [coupon.code]: result.message ?? 'Unable to apply coupon.',
      }));
      return;
    }

    if (route.params?.returnTo === 'checkout') {
      navigation.navigate('Home', { screen: 'Checkout' });
      return;
    }

    navigation.navigate('Cart');
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Coupons & Offers" />

      <View style={styles.searchWrap}>
        <AppInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by code or title"
          autoCapitalize="characters"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listWrap}>
        {filteredCoupons.map((coupon) => {
          const isApplied = appliedCoupon?.code === coupon.code;
          const expired = isCouponExpired(coupon.expiryDate);
          const active = coupon.isActive && !expired;

          return (
            <View key={coupon.id} style={styles.card}>
              <View style={styles.topRow}>
                <AppText style={styles.codeText}>{coupon.code}</AppText>
                <View style={[styles.badge, active ? styles.badgeActive : styles.badgeExpired]}>
                  <AppText style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextExpired]}>
                    {active ? 'Active' : 'Expired'}
                  </AppText>
                </View>
              </View>

              <AppText style={styles.titleText}>{coupon.title}</AppText>
              <AppText style={styles.descriptionText}>{coupon.description}</AppText>
              <AppText style={styles.metaText}>
                Min order: ₹{coupon.minOrderValue ?? 0} • Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
              </AppText>

              <Divider spacingVertical={8} />

              {isApplied ? (
                <View style={styles.appliedRow}>
                  <AppText style={styles.appliedLabel}>Applied</AppText>
                  <Pressable onPress={clearCoupon}>
                    <AppText style={styles.removeText}>Remove</AppText>
                  </Pressable>
                </View>
              ) : (
                <AppButton
                  title="Apply to Cart"
                  onPress={() => handleApplyToCart(coupon)}
                  loading={isApplyingCode === coupon.code}
                  disabled={!active}
                />
              )}

              {errorByCode[coupon.code] ? (
                <AppText style={styles.errorText}>{errorByCode[coupon.code]}</AppText>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginTop: 10,
  },
  listWrap: {
    marginTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeActive: {
    backgroundColor: '#DCFCE7',
  },
  badgeExpired: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#166534',
  },
  badgeTextExpired: {
    color: '#991B1B',
  },
  titleText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  descriptionText: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
  },
  metaText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  appliedRow: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#DC2626',
  },
});
