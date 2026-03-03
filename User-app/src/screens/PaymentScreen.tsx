import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { getOrderById, updateOrder } from '../services/orders/orderService';
import { Order } from '../types/order';

type PaymentMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'netbanking', label: 'NetBanking' },
  { key: 'wallet', label: 'Wallet' },
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
    const loadOrder = async () => {
      const nextOrder = await getOrderById(route.params.orderId);
      setOrder(nextOrder);
    };

    loadOrder();
  }, [route.params.orderId]);

  const payableAmount = useMemo(() => Math.max(order?.total ?? 0, 0), [order?.total]);

  const handlePayNow = async () => {
    if (!order) {
      return;
    }

    setIsPaying(true);
    await wait(800);

    const updatedOrder: Order = {
      ...order,
      status: 'confirmed',
      updatedAt: new Date().toISOString(),
      payment: {
        method: selectedMethod,
        status: 'paid',
      },
    };

    await updateOrder(updatedOrder);
    clearCart();
    setIsPaying(false);

    navigation.navigate('OrderSuccess', { orderId: order.id });
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Payment" />

      {!order ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="Order not found" description="Please place order again from checkout." />
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryTitle}>Order Details</AppText>
            <AppText style={styles.summaryText}>Order ID: {order.id}</AppText>
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
            <AppButton title="Pay Now" onPress={handlePayNow} loading={isPaying} />
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
