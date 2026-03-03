import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getOrders } from '../services/orders/orderService';
import { Order, OrderStatus } from '../types/order';
import { formatOrderDate } from '../utils/date';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const STATUS_STYLES: Record<OrderStatus, { bg: string; text: string }> = {
  pending_payment: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  accepted: { bg: '#DBEAFE', text: '#1E40AF' },
  preparing: { bg: '#EDE9FE', text: '#5B21B6' },
  out_for_delivery: { bg: '#D1FAE5', text: '#065F46' },
  delivered: { bg: '#DCFCE7', text: '#166534' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  refunded: { bg: '#FCE7F3', text: '#9D174D' },
};

const toShortOrderId = (orderId: string) => orderId.slice(-6).toUpperCase();

export function OrdersScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = useCallback(async () => {
    const nextOrders = await getOrders();
    setOrders(nextOrders);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  return (
    <Screen>
      <AppHeader />

      <View style={styles.headerWrap}>
        <SectionHeader title="My Orders" />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No orders yet"
            description="Your orders will appear here once you place one."
          />
          <View style={styles.startButtonWrap}>
            <AppButton title="Start shopping" onPress={() => navigation.navigate('Home')} />
          </View>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusStyle = STATUS_STYLES[item.status];

            return (
              <View style={styles.orderCard}>
                <View style={styles.topRow}>
                  <AppText style={styles.orderIdText}>Order #{toShortOrderId(item.id)}</AppText>
                  <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
                    <AppText style={[styles.statusChipText, { color: statusStyle.text }]}>
                      {STATUS_LABELS[item.status]}
                    </AppText>
                  </View>
                </View>

                <AppText style={styles.metaText}>{formatOrderDate(item.createdAt)}</AppText>

                <View style={styles.infoRow}>
                  <AppText style={styles.infoText}>{item.itemCount} item(s)</AppText>
                  <AppText style={styles.totalText}>₹{Math.max(item.total, 0)}</AppText>
                </View>

                <Pressable
                  style={styles.detailsAction}
                  onPress={() => navigation.navigate('Home', { screen: 'OrderDetails', params: { orderId: item.id } })}
                >
                  <AppText style={styles.detailsActionText}>View details</AppText>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: 10,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -20,
  },
  startButtonWrap: {
    marginTop: 12,
  },
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
  },
  totalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  detailsAction: {
    alignSelf: 'flex-start',
  },
  detailsActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
});
