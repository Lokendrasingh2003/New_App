import { NavigationProp, ParamListBase, RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';
import { getOrderById, updateOrder } from '../services/orders/orderService';
import { getReviewByOrder } from '../services/reviews/reviewService';
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

const CANCELLABLE_STATUSES: OrderStatus[] = ['confirmed', 'accepted', 'preparing'];

export function OrderDetailsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'OrderDetails'>>();

  const [order, setOrder] = useState<Order | null>(null);
  const [shopReviewId, setShopReviewId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    const nextOrder = await getOrderById(route.params.orderId);
    setOrder(nextOrder);

    if (!nextOrder?.shopId) {
      setShopReviewId(null);
      return;
    }

    const existingReview = await getReviewByOrder(nextOrder.id, 'shop', nextOrder.shopId);
    setShopReviewId(existingReview?.id ?? null);
  }, [route.params.orderId]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const canCancel = useMemo(
    () => Boolean(order && CANCELLABLE_STATUSES.includes(order.status)),
    [order],
  );

  const showPayNow = order?.status === 'pending_payment';

  const handleCancelOrder = () => {
    if (!order || !canCancel) {
      return;
    }

    Alert.alert('Cancel order?', 'Do you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setIsUpdating(true);

          const nextStatus: OrderStatus = order.payment.status === 'paid' ? 'refunded' : 'cancelled';
          const nextPaymentStatus = order.payment.status === 'paid' ? 'paid' : 'failed';

          await updateOrder({
            ...order,
            status: nextStatus,
            payment: {
              ...order.payment,
              status: nextPaymentStatus,
            },
            updatedAt: new Date().toISOString(),
          });

          await loadOrder();
          setIsUpdating(false);
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title="Order Details" />

      {!order ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="Order not found" description="This order may have been removed." />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={[styles.statusChip, { backgroundColor: STATUS_STYLES[order.status].bg }]}>
                <AppText style={[styles.statusChipText, { color: STATUS_STYLES[order.status].text }]}>
                  {STATUS_LABELS[order.status]}
                </AppText>
              </View>
              <AppText style={styles.totalText}>₹{Math.max(order.total, 0)}</AppText>
            </View>

            <AppText style={styles.metaText}>Order ID: {order.id}</AppText>
            <AppText style={styles.metaText}>Placed: {formatOrderDate(order.createdAt)}</AppText>
            {order.status === 'refunded' ? (
              <AppText style={styles.noteText}>
                This order was paid and later cancelled, refund is marked in status.
              </AppText>
            ) : null}
          </View>

          <View style={styles.blockCard}>
            <AppText style={styles.blockTitle}>Delivery Address</AppText>
            <AppText style={styles.addressText}>
              {order.addressSnapshot.name ? `${order.addressSnapshot.name}\n` : ''}
              {order.addressSnapshot.fullName}
              {`\n${order.addressSnapshot.line1}`}
              {order.addressSnapshot.line2 ? `, ${order.addressSnapshot.line2}` : ''}
              {order.addressSnapshot.area ? `, ${order.addressSnapshot.area}` : ''}
              {order.addressSnapshot.landmark ? `, Landmark: ${order.addressSnapshot.landmark}` : ''}
              {`\n${order.addressSnapshot.city} - ${order.addressSnapshot.pincode}`}
              {`\nPhone: ${order.addressSnapshot.phone}`}
            </AppText>
          </View>

          <View style={styles.blockCard}>
            <AppText style={styles.blockTitle}>Items</AppText>
            {order.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <AppText style={styles.itemName} numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText style={styles.itemMeta}>Qty: {item.quantity}</AppText>
                </View>
                <AppText style={styles.itemPrice}>₹{Math.max(item.price * item.quantity, 0)}</AppText>
              </View>
            ))}
          </View>

          <View style={styles.blockCard}>
            <AppText style={styles.blockTitle}>Bill Details</AppText>
            <View style={styles.billRow}>
              <AppText style={styles.billLabel}>Subtotal</AppText>
              <AppText style={styles.billValue}>₹{Math.max(order.subtotal, 0)}</AppText>
            </View>
            <View style={styles.billRow}>
              <AppText style={styles.billLabel}>Delivery</AppText>
              <AppText style={styles.billValue}>₹{Math.max(order.deliveryCharge, 0)}</AppText>
            </View>
            <View style={styles.billRow}>
              <AppText style={styles.discountLabel}>Discount</AppText>
              <AppText style={styles.discountValue}>-₹{Math.max(order.discountAmount, 0)}</AppText>
            </View>
            <View style={styles.totalDivider} />
            <View style={styles.billRow}>
              <AppText style={styles.totalLabel}>Total</AppText>
              <AppText style={styles.totalValue}>₹{Math.max(order.total, 0)}</AppText>
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <AppButton
              title="Track Order"
              variant="secondary"
              onPress={() => navigation.navigate('OrderTracking', { orderId: order.id })}
            />

            <AppButton
              title="View Invoice"
              variant="secondary"
              onPress={() => navigation.navigate('Invoice', { orderId: order.id })}
            />

            {order.shopId ? (
              <AppButton
                title={shopReviewId ? 'Edit Review' : 'Rate Order'}
                variant="secondary"
                onPress={() =>
                  navigation.navigate('AddEditReview', {
                    reviewId: shopReviewId ?? undefined,
                    targetType: 'shop',
                    targetId: order.shopId,
                    orderId: order.id,
                  })
                }
              />
            ) : null}

            {showPayNow ? (
              <AppButton
                title="Pay Now"
                onPress={() => navigation.navigate('Payment', { orderId: order.id })}
              />
            ) : null}

            {canCancel ? (
              <Pressable onPress={handleCancelOrder} disabled={isUpdating}>
                <AppText style={styles.cancelText}>{isUpdating ? 'Updating...' : 'Cancel Order'}</AppText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    marginTop: 18,
  },
  contentWrap: {
    paddingBottom: 24,
    gap: 10,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  totalText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  noteText: {
    marginTop: 2,
    fontSize: 12,
    color: '#9D174D',
    fontWeight: '600',
  },
  blockCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 13,
    color: '#374151',
  },
  billValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
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
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  actionsWrap: {
    marginTop: 2,
    gap: 10,
  },
  cancelText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
});
