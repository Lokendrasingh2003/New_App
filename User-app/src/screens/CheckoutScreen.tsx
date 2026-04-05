import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { apiRequest } from '../services/api/httpClient';
import { getDefaultAddress } from '../services/address/addressService';
import { Address } from '../types/address';

type ShopDeliveryValidationPayload = {
  shop?: {
    delivery?: {
      availableAreas?: string[];
    };
  };
};

type CartPreflightPayload = {
  cart?: {
    id?: string | null;
    items?: unknown[];
  };
};

const normalizeArea = (value: string | undefined) => String(value || '').trim().toLowerCase();

export function CheckoutScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {
    items,
    itemCount,
    subtotal,
    totalMrp,
    savings,
    deliveryCharge,
    taxAmount,
    offerDiscountAmount,
    couponDiscountAmount,
    totalDiscountAmount,
    totalSavingsAmount,
    discountAmount,
    grandTotal,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    cartId,
  } = useCart();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | undefined>();
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const availableCoupons: Array<{ id: string; title: string; code: string; description: string; minOrderValue?: number; expiryDate: string }> = [];
  const activeShopId = items[0]?.shopId;

  const loadDefaultAddress = useCallback(async () => {
    const defaultAddress = await getDefaultAddress();
    setSelectedAddress(defaultAddress);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDefaultAddress();
    }, [loadDefaultAddress]),
  );

  const handleApplyCoupon = async (code?: string) => {
    const targetCode = (code ?? couponCodeInput).trim().toUpperCase();
    setCouponError(undefined);

    if (!targetCode) {
      setCouponError('Please enter coupon code.');
      return;
    }

    setIsApplyingCoupon(true);
    const result = await applyCoupon(targetCode);
    setIsApplyingCoupon(false);

    if (!result.ok) {
      setCouponError(result.message ?? 'Could not apply coupon.');
      return;
    }

    setCouponCodeInput(targetCode);
    setCouponError(undefined);
    setCouponModalVisible(false);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress || itemCount <= 0 || items.length === 0 || !cartId) {
      return;
    }

    try {
      setIsPlacingOrder(true);

      const latestCartResponse = await apiRequest<CartPreflightPayload>('/api/cart', {
        method: 'GET',
        auth: true,
        ignoreStatuses: [404],
      });

      const latestCartId = String(latestCartResponse.cart?.id || '').trim();
      const latestItems = Array.isArray(latestCartResponse.cart?.items) ? latestCartResponse.cart?.items : [];

      if (!latestCartId || latestItems.length === 0) {
        Alert.alert('Cart updated', 'Your cart is empty or expired. Please add items again.');
        navigation.navigate('Cart');
        return;
      }

      if (activeShopId && /^[a-f0-9]{24}$/i.test(activeShopId)) {
        const shopDetails = await apiRequest<ShopDeliveryValidationPayload>(`/api/shops/${activeShopId}`, {
          method: 'GET',
        });

        const availableAreas = (shopDetails.shop?.delivery?.availableAreas || [])
          .map((area) => normalizeArea(area))
          .filter(Boolean);

        if (availableAreas.length > 0) {
          const selectedArea = normalizeArea(selectedAddress.area);
          if (!selectedArea || !availableAreas.includes(selectedArea)) {
            Alert.alert(
              'Address not serviceable',
              'Selected address is outside this shop delivery area. Please choose a different address.',
              [{ text: 'Choose Address', onPress: () => navigation.navigate('AddressList') }, { text: 'OK' }],
            );
            return;
          }
        }
      }

      navigation.navigate('Payment', {
        cartId: latestCartId,
        addressId: selectedAddress.id,
        couponCode: appliedCoupon?.code ?? null,
        totalAmount: grandTotal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to place order. Please try again.';
      if (message.toLowerCase().includes('outside service area')) {
        Alert.alert(
          'Address not serviceable',
          'Selected address is outside this shop delivery area. Please choose a different address.',
          [{ text: 'Choose Address', onPress: () => navigation.navigate('AddressList') }, { text: 'OK' }],
        );
        return;
      }

      if (message.toLowerCase().includes('cart not found')) {
        Alert.alert('Cart updated', 'Your cart is empty or expired. Please add items again.');
        navigation.navigate('Cart');
        return;
      }

      Alert.alert('Unable to place order', message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const isPlaceOrderDisabled = itemCount <= 0 || items.length === 0 || !selectedAddress || !cartId || isPlacingOrder;

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Checkout" />

      <View style={styles.sectionCard}>
        <View style={styles.addressHeaderRow}>
          <AppText style={styles.sectionTitle}>Deliver To</AppText>
          {selectedAddress ? (
            <Pressable onPress={() => navigation.navigate('AddressList')}>
              <AppText style={styles.changeText}>Change</AppText>
            </Pressable>
          ) : null}
        </View>

        {selectedAddress ? (
          <>
            <View style={styles.addressTitleRow}>
              <AppText style={styles.addressName}>{selectedAddress.name}</AppText>
              <AppText style={styles.defaultBadge}>Default</AppText>
            </View>
            <AppText style={styles.addressBody}>
              {selectedAddress.fullName}
              {`\n${selectedAddress.line1}`}
              {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}
              {selectedAddress.area ? `, ${selectedAddress.area}` : ''}
              {selectedAddress.landmark ? `, Landmark: ${selectedAddress.landmark}` : ''}
              {`\n${selectedAddress.city} - ${selectedAddress.pincode}`}
              {`\nPhone: ${selectedAddress.phone}`}
            </AppText>
          </>
        ) : (
          <View style={styles.emptyAddressWrap}>
            <EmptyState
              title="No address selected"
              description="Add an address to place your order."
            />
            <AppButton
              title="Add Address"
              onPress={() => navigation.navigate('AddEditAddress', { returnTo: 'checkout' })}
            />
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <AppText style={styles.sectionTitle}>Coupon</AppText>

        {!appliedCoupon ? (
          <>
            <View style={styles.couponInputRow}>
              <View style={styles.couponInputWrap}>
                <AppInput
                  value={couponCodeInput}
                  onChangeText={setCouponCodeInput}
                  autoCapitalize="characters"
                  placeholder="Enter coupon code"
                  error={couponError}
                />
              </View>
              <View style={styles.couponApplyWrap}>
                <AppButton
                  title="Apply"
                  onPress={() => handleApplyCoupon()}
                  loading={isApplyingCoupon}
                />
              </View>
            </View>

            <Pressable onPress={() => setCouponModalVisible(true)}>
              <AppText style={styles.viewCouponsText}>View coupons</AppText>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Coupons', { returnTo: 'checkout' })}>
              <AppText style={styles.browseCouponsText}>Browse coupons</AppText>
            </Pressable>
          </>
        ) : (
          <View style={styles.appliedCouponRow}>
            <View>
              <AppText style={styles.appliedCode}>{appliedCoupon.code}</AppText>
              <AppText style={styles.appliedMeta}>Saved ₹{Math.max(discountAmount, 0)}</AppText>
            </View>
            <Pressable
              onPress={() => {
                clearCoupon();
                setCouponError(undefined);
              }}
            >
              <AppText style={styles.removeCouponText}>Remove</AppText>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Divider spacingVertical={2} />
        <AppText style={styles.sectionTitle}>Order Summary</AppText>

        <View style={styles.itemsWrap}>
          {items.map((item) => (
            <View key={item.product.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <AppText style={styles.itemName} numberOfLines={1}>
                  {item.product.name}
                </AppText>
                <AppText style={styles.itemMeta}>Qty: {item.quantity}</AppText>
              </View>
              <AppText style={styles.itemPrice}>₹{Math.max(item.product.price * item.quantity, 0)}</AppText>
            </View>
          ))}
        </View>

        <View style={styles.totalDivider} />

        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Item total (MRP)</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(totalMrp, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Selling price total</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(subtotal, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Product savings</AppText>
          <AppText style={styles.discountValue}>-₹{Math.max(savings, 0)}</AppText>
        </View>
        {offerDiscountAmount > 0 ? (
          <View style={styles.row}>
            <AppText style={styles.discountLabel}>Offer discount</AppText>
            <AppText style={styles.discountValue}>-₹{Math.max(offerDiscountAmount, 0)}</AppText>
          </View>
        ) : null}
        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Delivery</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(deliveryCharge, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.discountLabel}>Coupon discount</AppText>
          <AppText style={styles.discountValue}>-₹{Math.max(couponDiscountAmount || discountAmount, 0)}</AppText>
        </View>
        {totalDiscountAmount > 0 ? (
          <View style={styles.row}>
            <AppText style={styles.discountLabel}>Total discount</AppText>
            <AppText style={styles.discountValue}>-₹{Math.max(totalDiscountAmount, 0)}</AppText>
          </View>
        ) : null}
        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Taxes & charges</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(taxAmount, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.discountLabel}>Total savings</AppText>
          <AppText style={styles.discountValue}>₹{Math.max(totalSavingsAmount || savings + discountAmount, 0)}</AppText>
        </View>

        <View style={styles.totalDivider} />

        <View style={styles.row}>
          <AppText style={styles.totalLabel}>Total Payable</AppText>
          <AppText style={styles.totalValue}>₹{Math.max(grandTotal, 0)}</AppText>
        </View>
      </View>

      <View style={styles.placeOrderWrap}>
        <AppButton
          title="Place Order"
          onPress={handlePlaceOrder}
          disabled={isPlaceOrderDisabled}
          loading={isPlacingOrder}
        />
      </View>

      <Modal
        visible={couponModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCouponModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCouponModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeaderRow}>
              <AppText style={styles.modalTitle}>Available Coupons</AppText>
              <Pressable onPress={() => setCouponModalVisible(false)}>
                <AppText style={styles.modalClose}>✕</AppText>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {availableCoupons.map((coupon) => (
                <View key={coupon.id} style={styles.couponListCard}>
                  <View style={styles.couponListTopRow}>
                    <View>
                      <AppText style={styles.couponListTitle}>{coupon.title}</AppText>
                      <AppText style={styles.couponListCode}>{coupon.code}</AppText>
                    </View>
                    <AppButton
                      title="Apply"
                      onPress={() => {
                        setCouponCodeInput(coupon.code);
                        handleApplyCoupon(coupon.code);
                      }}
                    />
                  </View>

                  <AppText style={styles.couponListDesc}>{coupon.description}</AppText>
                  <AppText style={styles.couponListMeta}>
                    Min order: ₹{coupon.minOrderValue ?? 0} • Expires:{' '}
                    {new Date(coupon.expiryDate).toLocaleDateString()}
                  </AppText>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  changeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  addressBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  emptyAddressWrap: {
    gap: 12,
  },
  couponInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  couponInputWrap: {
    flex: 1,
  },
  couponApplyWrap: {
    width: 96,
  },
  viewCouponsText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#22A55D',
  },
  browseCouponsText: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  appliedCouponRow: {
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
  appliedCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  appliedMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#166534',
  },
  removeCouponText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  itemsWrap: {
    marginTop: 2,
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rowLabel: {
    fontSize: 13,
    color: '#374151',
  },
  rowValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  discountLabel: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  discountValue: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '700',
  },
  totalDivider: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  placeOrderWrap: {
    marginTop: 12,
    paddingBottom: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeaderRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  couponListCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 8,
  },
  couponListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  couponListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  couponListCode: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
  couponListDesc: {
    marginTop: 6,
    fontSize: 12,
    color: '#4B5563',
  },
  couponListMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
});
