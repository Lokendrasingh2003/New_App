import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/ui/AppHeader';
import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Divider } from '../components/ui/Divider';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { getDefaultAddress } from '../services/address/addressService';
import { mockCoupons } from '../services/coupons/mockCoupons';

export function CartScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const {
    items,
    itemCount,
    subtotal,
    savings,
    totalMrp,
    deliveryCharge,
    discountAmount,
    grandTotal,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    incrementQuantity,
    decrementQuantity,
    removeItem,
  } = useCart();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | undefined>();
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [nowTimestamp] = useState(() => Date.now());

  const availableCoupons = useMemo(
    () =>
      mockCoupons.filter(
        (coupon) => coupon.isActive && new Date(coupon.expiryDate).getTime() > nowTimestamp,
      ),
    [nowTimestamp],
  );

  const displaySavings = Math.max(savings + discountAmount, 0);

  const handleProceed = async () => {
    const defaultAddress = await getDefaultAddress();

    if (!defaultAddress) {
      navigation.navigate('Home', { screen: 'AddressList' });
      return;
    }

    navigation.navigate('Home', { screen: 'Checkout' });
  };

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

  return (
    <Screen>
      <AppHeader />

      <View style={styles.pageHeaderRow}>
        <SectionHeader title="My Cart" />
        <AppText style={styles.itemCountText}>{itemCount} items</AppText>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyStateWrap}>
          <EmptyState
            title="Your cart is empty"
            description="Add products from shops to place your order."
          />
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {items.map((item) => (
              <View key={item.product.id} style={styles.itemCard}>
                <Image
                  source={{
                    uri:
                      item.product.imageUrl ??
                      item.product.image ??
                      `https://picsum.photos/seed/${item.product.id}/220/220`,
                  }}
                  style={styles.itemImage}
                  resizeMode="cover"
                />

                <View style={styles.itemInfo}>
                  <AppText style={styles.itemName} numberOfLines={1}>
                    {item.product.name}
                  </AppText>
                  <AppText style={styles.itemMeta} numberOfLines={1}>
                    {item.product.brand ?? 'Local shop item'}
                    {item.product.unit ? ` • ${item.product.unit}` : ''}
                  </AppText>

                  <View style={styles.priceRow}>
                    <AppText style={styles.currentPrice}>₹{item.product.price}</AppText>
                    <AppText style={styles.oldPrice}>
                      ₹{item.product.mrp ?? item.product.price}
                    </AppText>
                  </View>

                  <View style={styles.controlsRow}>
                    <View style={styles.quantityWrap}>
                      <Pressable
                        style={styles.quantityButton}
                        onPress={() => decrementQuantity(item.product.id)}
                      >
                        <AppText style={styles.quantityButtonText}>−</AppText>
                      </Pressable>

                      <AppText style={styles.quantityText}>{item.quantity}</AppText>

                      <Pressable
                        style={styles.quantityButton}
                        onPress={() => incrementQuantity(item.product.id)}
                      >
                        <AppText style={styles.quantityButtonText}>+</AppText>
                      </Pressable>
                    </View>

                    <Pressable onPress={() => removeItem(item.product.id)}>
                      <AppText style={styles.removeText}>Remove</AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.couponCard}>
              <AppText style={styles.couponTitle}>Apply Coupon</AppText>

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
                    <AppText style={styles.viewCouponsText}>View available coupons</AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => navigation.navigate('Home', { screen: 'Coupons', params: { returnTo: 'cart' } })}
                  >
                    <AppText style={styles.browseCouponsText}>Browse coupons</AppText>
                  </Pressable>
                </>
              ) : (
                <View style={styles.appliedCouponRow}>
                  <View>
                    <AppText style={styles.appliedCode}>{appliedCoupon.code}</AppText>
                    <AppText style={styles.appliedMeta}>
                      Saved ₹{appliedCoupon.discountAmount}
                    </AppText>
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

            <View style={styles.billCard}>
              <Divider spacingVertical={2} />
              <AppText style={styles.billTitle}>Bill Details</AppText>

              <View style={styles.billRow}>
                <AppText style={styles.billLabel}>Item total (MRP)</AppText>
                <AppText style={styles.billValue}>₹{Math.max(totalMrp, 0)}</AppText>
              </View>
              <View style={styles.billRow}>
                <AppText style={styles.billLabel}>Product total</AppText>
                <AppText style={styles.billValue}>₹{Math.max(subtotal, 0)}</AppText>
              </View>
              <View style={styles.billRow}>
                <AppText style={styles.billLabel}>Delivery charge</AppText>
                <AppText style={styles.billValue}>₹{Math.max(deliveryCharge, 0)}</AppText>
              </View>
              {appliedCoupon ? (
                <View style={styles.billRow}>
                  <AppText style={styles.couponDiscountLabel}>Coupon discount</AppText>
                  <AppText style={styles.couponDiscountValue}>
                    -₹{Math.max(discountAmount, 0)}
                  </AppText>
                </View>
              ) : null}
              <View style={styles.billRow}>
                <AppText style={styles.savingLabel}>You Save</AppText>
                <AppText style={styles.savingValue}>₹{displaySavings}</AppText>
              </View>

              <View style={styles.totalDivider} />

              <View style={styles.billRow}>
                <AppText style={styles.grandLabel}>To Pay</AppText>
                <AppText style={styles.grandValue}>₹{Math.max(grandTotal, 0)}</AppText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.checkoutBar}>
            <View>
              <AppText style={styles.checkoutAmount}>₹{Math.max(grandTotal, 0)}</AppText>
              <AppText style={styles.checkoutText}>Including delivery</AppText>
            </View>
            <View style={styles.checkoutButtonWrap}>
              <AppButton title="Proceed" onPress={handleProceed} />
            </View>
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
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeaderRow: {
    marginTop: -4,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCountText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyStateWrap: {
    flex: 1,
    marginTop: -24,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 10,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  priceRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  oldPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  controlsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  quantityText: {
    width: 32,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  removeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  couponCard: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
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
  billCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  billLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  billValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  couponDiscountLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  couponDiscountValue: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '700',
  },
  savingLabel: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  savingValue: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '700',
  },
  totalDivider: {
    marginTop: 8,
    marginBottom: 6,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  grandLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  grandValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '800',
  },
  checkoutBar: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  checkoutAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  checkoutText: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  checkoutButtonWrap: {
    width: 140,
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
