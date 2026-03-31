import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';
import { getOrderById, updateOrder } from '../services/orders/orderService';
import { Order, OrderStatus } from '../types/order';

const PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: 'pending_payment', label: 'Pending Payment' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'accepted', label: 'Accepted by Shop' },
  { key: 'preparing', label: 'Preparing Order' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const TIMELINE_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  accepted: 'Accepted by Shop',
  preparing: 'Preparing Order',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const NEXT_STATUS_MAP: Partial<Record<OrderStatus, OrderStatus>> = {
  pending_payment: 'confirmed',
  confirmed: 'accepted',
  accepted: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered',
};

export function OrderTrackingScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'OrderTracking'>>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrder = useCallback(async () => {
    const nextOrder = await getOrderById(route.params.orderId);
    setOrder(nextOrder);
  }, [route.params.orderId]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const timelineSteps = useMemo(() => {
    if (!order) {
      return [] as { key: OrderStatus; label: string; state: 'completed' | 'current' | 'upcoming' }[];
    }

    if (order.status === 'cancelled' || order.status === 'refunded') {
      return [
        ...PROGRESS_STEPS.map((step) => ({
          key: step.key,
          label: step.label,
          state: step.key === 'pending_payment' ? ('completed' as const) : ('upcoming' as const),
        })),
        {
          key: order.status,
          label: TIMELINE_LABELS[order.status],
          state: 'current' as const,
        },
      ];
    }

    const currentIndex = PROGRESS_STEPS.findIndex((step) => step.key === order.status);

    return PROGRESS_STEPS.map((step, index) => {
      if (index < currentIndex) {
        return { ...step, state: 'completed' as const };
      }

      if (index === currentIndex) {
        return { ...step, state: 'current' as const };
      }

      return { ...step, state: 'upcoming' as const };
    });
  }, [order]);

  const handleSimulateNext = async () => {
    if (!order) {
      return;
    }

    const nextStatus = NEXT_STATUS_MAP[order.status];

    if (!nextStatus) {
      return;
    }

    setIsUpdating(true);
    await updateOrder({
      ...order,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    await loadOrder();
    setIsUpdating(false);
  };

  const canSimulate = Boolean(order && NEXT_STATUS_MAP[order.status]);

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title="Order Tracking" />

      {!order ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="Order not found" description="Unable to load tracking details." />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
          <View style={styles.summaryCard}>
            <AppText style={styles.summaryTitle}>Order #{order.id.slice(-6).toUpperCase()}</AppText>
            <AppText style={styles.summaryMeta}>Current status: {TIMELINE_LABELS[order.status]}</AppText>
            <AppText style={styles.etaText}>ETA: 25-35 mins (mock)</AppText>
          </View>

          <View style={styles.timelineCard}>
            {timelineSteps.map((step, index) => {
              const isLast = index === timelineSteps.length - 1;
              const circleStyle =
                step.state === 'completed'
                  ? styles.circleCompleted
                  : step.state === 'current'
                    ? styles.circleCurrent
                    : styles.circleUpcoming;

              const labelStyle =
                step.state === 'upcoming' ? styles.stepLabelUpcoming : styles.stepLabelActive;

              return (
                <View key={`${step.key}_${index}`} style={styles.stepRow}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.circleBase, circleStyle]} />
                    {!isLast ? <View style={styles.connector} /> : null}
                  </View>
                  <View style={styles.stepBody}>
                    <AppText style={[styles.stepLabel, labelStyle]}>{step.label}</AppText>
                    {step.state === 'current' ? (
                      <AppText style={styles.stepCurrentHint}>Current stage</AppText>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.buttonWrap}>
            <AppButton
              title="Simulate Next Status"
              onPress={handleSimulateNext}
              disabled={!canSimulate}
              loading={isUpdating}
            />
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
    gap: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  summaryMeta: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  etaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  timelineCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  circleBase: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
  },
  circleCompleted: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  circleCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: '#2563EB',
  },
  circleUpcoming: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  connector: {
    width: 2,
    minHeight: 28,
    backgroundColor: '#D1D5DB',
    marginTop: 2,
    marginBottom: 2,
  },
  stepBody: {
    flex: 1,
    paddingBottom: 12,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: '#111827',
  },
  stepLabelUpcoming: {
    color: '#9CA3AF',
  },
  stepCurrentHint: {
    marginTop: 2,
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
  },
  buttonWrap: {
    marginTop: 2,
  },
});
