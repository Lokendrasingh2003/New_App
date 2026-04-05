import { NavigationProp, ParamListBase, RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';
import { getOrderById } from '../services/orders/orderService';
import { Order } from '../types/order';
import { formatOrderDate } from '../utils/date';

const toShortOrderId = (orderId: string) => orderId.slice(-6).toUpperCase();

export function InvoiceScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'Invoice'>>();

  const [order, setOrder] = useState<Order | null>(null);

  const loadOrder = useCallback(async () => {
    const nextOrder = await getOrderById(route.params.orderId);
    setOrder(nextOrder);
  }, [route.params.orderId]);

  useFocusEffect(
    useCallback(() => {
      loadOrder();
    }, [loadOrder]),
  );

  const mrpTotal = useMemo(() => {
    if (!order) {
      return 0;
    }

    return Math.max(
      order.items.reduce((sum, item) => sum + (item.mrp ?? item.price) * item.quantity, 0),
      0,
    );
  }, [order]);

  if (!order || order.status !== 'delivered') {
    return (
      <Screen>
        <AppHeader />
        <SectionHeader title="Invoice" />
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Invoice not available"
            description={
              !order
                ? 'This invoice is not available.'
                : 'Invoice will be available after the order is delivered.'
            }
          />
        </View>
      </Screen>
    );
  }

  // Helper to generate invoice HTML
  const getInvoiceHtml = () => {
    return `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            .card { border: 1px solid #E5E7EB; border-radius: 12px; background: #FFF; padding: 12px; margin-bottom: 12px; }
            .top-row, .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .block-title { font-weight: bold; margin-bottom: 4px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .table th, .table td { border: 1px solid #E5E7EB; padding: 6px; font-size: 12px; }
            .table th { background: #F3F4F6; }
            .total-label { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>Invoice</h2>
          <div class="card">
            <div class="top-row"><span>Order ID</span><span>#${toShortOrderId(order.id)}</span></div>
            <div class="top-row"><span>Date</span><span>${formatOrderDate(order.createdAt)}</span></div>
          </div>
          <div class="card">
            <div class="block-title">Customer</div>
            <div>${order.addressSnapshot.fullName}</div>
            <div>Phone: ${order.addressSnapshot.phone}</div>
          </div>
          <div class="card">
            <div class="block-title">Delivery Address</div>
            <div>${order.addressSnapshot.line1}
              ${order.addressSnapshot.line2 ? `, ${order.addressSnapshot.line2}` : ''}
              ${order.addressSnapshot.area ? `, ${order.addressSnapshot.area}` : ''}
              ${order.addressSnapshot.landmark ? `, Landmark: ${order.addressSnapshot.landmark}` : ''}
              <br/>${order.addressSnapshot.city} - ${order.addressSnapshot.pincode}
            </div>
          </div>
          <div class="card">
            <div class="block-title">Items</div>
            <table class="table">
              <thead>
                <tr><th>Item</th><th>Unit</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.name} × ${item.quantity}</td>
                    <td>₹${Math.max(item.price, 0)}</td>
                    <td>₹${Math.max(item.price * item.quantity, 0)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="card">
            <div class="block-title">Totals</div>
            <div class="total-row"><span>MRP total</span><span>₹${mrpTotal}</span></div>
            <div class="total-row"><span>Subtotal</span><span>₹${Math.max(order.subtotal, 0)}</span></div>
            <div class="total-row"><span>Delivery charge</span><span>₹${Math.max(order.deliveryCharge, 0)}</span></div>
            <div class="total-row"><span>Coupon discount</span><span>-₹${Math.max(order.discountAmount, 0)}</span></div>
            <div class="total-row"><span class="total-label">Total paid</span><span class="total-label">₹${Math.max(order.total, 0)}</span></div>
          </div>
        </body>
      </html>
    `;
  };

  // Handler for download/share using expo-print and expo-sharing
  const handleDownloadShare = async () => {
    try {
      const html = getInvoiceHtml();
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      if (!uri) throw new Error('PDF not generated');

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Invoice PDF',
        });
      } else {
        Alert.alert('Sharing not available', 'PDF saved at: ' + uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Invoice download/share failed.');
    }
  };

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title="Invoice" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
        <View style={styles.card}>
          <View style={styles.topRow}>
            <AppText style={styles.label}>Order ID</AppText>
            <AppText style={styles.value}>#{toShortOrderId(order.id)}</AppText>
          </View>
          <View style={styles.topRow}>
            <AppText style={styles.label}>Date</AppText>
            <AppText style={styles.value}>{formatOrderDate(order.createdAt)}</AppText>
          </View>
        </View>

        <View style={styles.card}>
          <AppText style={styles.blockTitle}>Customer</AppText>
          <AppText style={styles.bodyText}>{order.addressSnapshot.fullName}</AppText>
          <AppText style={styles.bodyText}>Phone: {order.addressSnapshot.phone}</AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.blockTitle}>Delivery Address</AppText>
          <AppText style={styles.bodyText}>
            {order.addressSnapshot.line1}
            {order.addressSnapshot.line2 ? `, ${order.addressSnapshot.line2}` : ''}
            {order.addressSnapshot.area ? `, ${order.addressSnapshot.area}` : ''}
            {order.addressSnapshot.landmark ? `, Landmark: ${order.addressSnapshot.landmark}` : ''}
            {`\n${order.addressSnapshot.city} - ${order.addressSnapshot.pincode}`}
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.blockTitle}>Items</AppText>

          <View style={styles.tableHeaderRow}>
            <AppText style={[styles.tableHeaderCell, styles.itemHeader]}>Item</AppText>
            <AppText style={[styles.tableHeaderCell, styles.unitHeader]}>Unit</AppText>
            <AppText style={[styles.tableHeaderCell, styles.totalHeader]}>Total</AppText>
          </View>

          {order.items.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.itemCol}>
                <AppText style={styles.itemName} numberOfLines={2}>
                  {item.name} × {item.quantity}
                </AppText>
              </View>
              <View style={styles.unitCol}>
                <AppText style={styles.tableText}>₹{Math.max(item.price, 0)}</AppText>
              </View>
              <View style={styles.totalCol}>
                <AppText style={styles.tableText}>₹{Math.max(item.price * item.quantity, 0)}</AppText>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <AppText style={styles.blockTitle}>Totals</AppText>

          <View style={styles.totalRow}>
            <AppText style={styles.totalLabel}>MRP total</AppText>
            <AppText style={styles.totalValue}>₹{mrpTotal}</AppText>
          </View>
          <View style={styles.totalRow}>
            <AppText style={styles.totalLabel}>Subtotal</AppText>
            <AppText style={styles.totalValue}>₹{Math.max(order.subtotal, 0)}</AppText>
          </View>
          <View style={styles.totalRow}>
            <AppText style={styles.totalLabel}>Delivery charge</AppText>
            <AppText style={styles.totalValue}>₹{Math.max(order.deliveryCharge, 0)}</AppText>
          </View>
          <View style={styles.totalRow}>
            <AppText style={styles.discountLabel}>Coupon discount</AppText>
            <AppText style={styles.discountValue}>-₹{Math.max(order.discountAmount, 0)}</AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <AppText style={styles.totalPaidLabel}>Total paid</AppText>
            <AppText style={styles.totalPaidValue}>₹{Math.max(order.total, 0)}</AppText>
          </View>
        </View>

        {order.status === 'delivered' && (
          <AppButton title="Download / Share Invoice" onPress={handleDownloadShare} />
        )}
      </ScrollView>
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
  card: {
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
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
  },
  value: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  bodyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  tableHeaderCell: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  itemHeader: {
    flex: 1,
  },
  unitHeader: {
    width: 70,
    textAlign: 'right',
  },
  totalHeader: {
    width: 78,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemCol: {
    flex: 1,
    paddingRight: 8,
  },
  unitCol: {
    width: 70,
  },
  totalCol: {
    width: 78,
  },
  itemName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  tableText: {
    fontSize: 12,
    color: '#111827',
    textAlign: 'right',
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: '#374151',
  },
  totalValue: {
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
  divider: {
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 8,
  },
  totalPaidLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  totalPaidValue: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '800',
  },
});
