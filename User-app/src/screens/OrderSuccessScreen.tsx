import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';
import { getOrderById } from '../services/orders/orderService';
import { addNotification } from '../services/notifications/notificationService';
import { Order } from '../types/order';

export function OrderSuccessScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'OrderSuccess'>>();

  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      const nextOrder = await getOrderById(route.params.orderId);
      setOrder(nextOrder);

      if (nextOrder) {
        await addNotification({
          id: `order_success_${nextOrder.id}`,
          type: 'order',
          title: 'Order placed',
          message: `Your order ${nextOrder.id.slice(-6).toUpperCase()} has been placed successfully.`,
          createdAt: new Date().toISOString(),
          isRead: false,
          deepLink: {
            tab: 'Home',
            screen: 'OrderTracking',
            params: { orderId: nextOrder.id },
          },
        });
      }
    };

    loadOrder();
  }, [route.params.orderId]);

  const orderAmount = useMemo(() => Math.max(order?.total ?? 0, 0), [order?.total]);

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Order Success" />

      {!order ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="Order not found" description="Please check your orders tab." />
        </View>
      ) : (
        <View style={styles.card}>
          <AppText style={styles.successTitle}>Order placed successfully 🎉</AppText>
          <AppText style={styles.metaText}>Order ID: {order.id}</AppText>
          <AppText style={styles.amountText}>Amount Paid: ₹{orderAmount}</AppText>

          <View style={styles.actionsWrap}>
            <AppButton
              title="Track Order"
              variant="secondary"
              onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
            />
            <AppButton title="Go to Orders" variant="ghost" onPress={() => navigation.navigate('Orders')} />
            <AppButton title="Continue Shopping" onPress={() => navigation.navigate('Home')} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    marginTop: 18,
  },
  card: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    gap: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#166534',
  },
  metaText: {
    marginTop: 2,
    fontSize: 13,
    color: '#4B5563',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  actionsWrap: {
    marginTop: 8,
    gap: 10,
  },
});
