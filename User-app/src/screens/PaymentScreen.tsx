import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { apiRequest } from '../services/api/httpClient';
import { getOrderById } from '../services/orders/orderService';
import { Order } from '../types/order';

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'netbanking', label: 'NetBanking' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'cod', label: 'Cash on Delivery' },
];

const wait = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs));

export function PaymentScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'Payment'>>();
  const { clearCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const existingOrderId = route.params?.orderId;

    if (!existingOrderId) {
      setOrder(null);
      return;
    }

    const loadOrder = async () => {
      const nextOrder = await getOrderById(existingOrderId);
      setOrder(nextOrder);
    };

    loadOrder();
  }, [route.params?.orderId]);

  const payableAmount = useMemo(
    () => Math.max(order?.total ?? route.params?.totalAmount ?? 0, 0),
    [order?.total, route.params?.totalAmount],
  );

  const handlePayNow = async () => {
    let finalOrderId = order?.id ?? route.params?.orderId;

    try {
      setIsPaying(true);

      const normalizedPaymentMode = selectedMethod === 'cod' ? 'COD' : 'ONLINE';

      if (!finalOrderId) {
        const cartId = route.params?.cartId;
        const addressId = route.params?.addressId;

        if (!cartId || !addressId) {
          Alert.alert('Unable to continue', 'Order information is missing. Please go back to checkout and try again.');
          return;
        }

        const response = await apiRequest<{ orderId: string }>('/api/orders/create', {
          method: 'POST',
          auth: true,
          body: {
            cartId,
            addressId,
            paymentMode: normalizedPaymentMode,
            couponCode: route.params?.couponCode ?? undefined,
          },
        });

        finalOrderId = response.orderId;
      }

      if (selectedMethod !== 'cod' && finalOrderId) {
        await wait(800);
        await apiRequest('/api/payments/verify', {
          method: 'POST',
          auth: true,
          body: {
            orderId: finalOrderId,
            paymentId: `mock_${Date.now()}`,
            signature: 'MOCK_PAYMENT_SUCCESS_SIGNATURE',
          },
        });
      } else {
        await wait(800);
      }

      clearCart();
      navigation.navigate('OrderSuccess', { orderId: finalOrderId });
    } catch (error) {
      if (selectedMethod !== 'cod' && finalOrderId) {
        try {
          await apiRequest(`/api/orders/${encodeURIComponent(finalOrderId)}/cancel`, {
            method: 'POST',
            auth: true,
            body: {
              reason: 'Online payment failed or was not completed.',
            },
          });
        } catch {
          // ignore cleanup failure and still show the original payment error
        }
      }

      const message = error instanceof Error ? error.message : 'Unable to complete payment. Please try again.';
      Alert.alert('Payment failed', `${message}\n\nThe order has been cancelled.`);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Payment" />

      {!order && !route.params?.cartId ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="Order not found" description="Please place order again from checkout." />
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryTitle}>Order Details</AppText>
            <AppText style={styles.summaryText}>Order ID: {order?.id ?? 'Will be generated after payment'}</AppText>
            <AppText style={styles.summaryAmount}>₹{payableAmount}</AppText>
          </View>

          <View style={styles.methodsCard}>
            <AppText style={styles.methodsTitle}>Select payment method</AppText>
            {PAYMENT_METHODS.map((method) => {
              const selected = selectedMethod === method.key;

              return (
                <Pressable
                  key={method.key}
                  style={styles.methodRow}
                  onPress={() => setSelectedMethod(method.key)}
                >
                  <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
                    {selected ? <View style={styles.radioInner} /> : null}
                  </View>
                  <AppText style={styles.methodLabel}>{method.label}</AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.payButtonWrap}>
            <AppButton
              title={selectedMethod === 'cod' ? 'Place Order (COD)' : 'Pay Now'}
              onPress={handlePayNow}
              loading={isPaying}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    marginTop: 18,
  },
  summaryCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  summaryText: {
    fontSize: 13,
    color: '#4B5563',
  },
  summaryAmount: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  methodsCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  methodRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  payButtonWrap: {
    marginTop: 12,
    paddingBottom: 24,
  },
});
