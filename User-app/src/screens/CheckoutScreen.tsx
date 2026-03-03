import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { useCity } from '../contexts/CityContext';
import { getDefaultAddress } from '../services/address/addressService';
import { mockCoupons } from '../services/coupons/mockCoupons';
import { createOrder } from '../services/orders/orderService';
import { Address } from '../types/address';
import { Order } from '../types/order';

export function CheckoutScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { city } = useCity();
  const {
    items,
    itemCount,
    subtotal,
    deliveryCharge,
    discountAmount,
    grandTotal,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
  } = useCart();

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | undefined>();
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [nowTimestamp] = useState(() => Date.now());

  const availableCoupons = useMemo(
    () =>
      mockCoupons.filter(
        (coupon) => coupon.isActive && new Date(coupon.expiryDate).getTime() > nowTimestamp,
      ),
    [nowTimestamp],
  );

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
    if (!selectedAddress || itemCount <= 0 || items.length === 0) {
      return;
    }

    setIsPlacingOrder(true);

    const safeSubtotal = Math.max(subtotal, 0);
    const safeDeliveryCharge = Math.max(deliveryCharge, 0);
    const safeDiscount = Math.max(discountAmount, 0);
    const safeTotal = Math.max(grandTotal, 0);

    const orderId = `ord_${Date.now()}`;
    const nowIso = new Date().toISOString();

    const orderItems = items.map((item, index) => ({
      id: `${orderId}_${index + 1}`,
      productId: item.product.id,
      name: item.product.name,
      unit: item.product.unit,
      quantity: Math.max(item.quantity, 0),
      price: Math.max(item.product.price, 0),
      mrp: item.product.mrp,
      imageUrl: item.product.imageUrl ?? item.product.image,
    }));

    const order: Order = {
      id: orderId,
      createdAt: nowIso,
      updatedAt: nowIso,
      cityId: city?.city_id,
      shopId: items[0]?.shopId,
      status: 'pending_payment',
      items: orderItems,
      itemCount: Math.max(itemCount, 0),
      subtotal: safeSubtotal,
      deliveryCharge: safeDeliveryCharge,
      couponCode: appliedCoupon?.code ?? null,
      discountAmount: safeDiscount,
      total: safeTotal,
      addressSnapshot: {
        name: selectedAddress.name,
        fullName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        line1: selectedAddress.line1,
        line2: selectedAddress.line2,
        landmark: selectedAddress.landmark,
        area: selectedAddress.area,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
      },
      payment: {
        status: 'unpaid',
      },
    };

    await createOrder(order);
    setIsPlacingOrder(false);

    navigation.navigate('Payment', { orderId });
  };

  const isPlaceOrderDisabled = itemCount <= 0 || items.length === 0 || !selectedAddress || isPlacingOrder;

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
              onPress={() => navigation.navigate('AddEditAddress')}
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
          <AppText style={styles.rowLabel}>Subtotal</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(subtotal, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.rowLabel}>Delivery</AppText>
          <AppText style={styles.rowValue}>₹{Math.max(deliveryCharge, 0)}</AppText>
        </View>
        <View style={styles.row}>
          <AppText style={styles.discountLabel}>Discount</AppText>
          <AppText style={styles.discountValue}>-₹{Math.max(discountAmount, 0)}</AppText>
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
