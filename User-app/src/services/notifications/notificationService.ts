import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { AppNotification } from '../../types/notification';

const readNotifications = async (): Promise<AppNotification[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AppNotification[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

const writeNotifications = async (notifications: AppNotification[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
};

const getSeedNotifications = (): AppNotification[] => {
  const now = Date.now();

  return [
    {
      id: 'seed_order_1',
      type: 'order',
      title: 'Order delivered',
      message: 'Your last order was delivered successfully.',
      createdAt: new Date(now - 1000 * 60 * 60).toISOString(),
      isRead: false,
      deepLink: { tab: 'Orders' },
    },
    {
      id: 'seed_payment_1',
      type: 'payment',
      title: 'Payment received',
      message: 'Payment for order #A1B2C3 was successful.',
      createdAt: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      isRead: false,
      deepLink: { tab: 'Orders' },
    },
    {
      id: 'seed_coupon_1',
      type: 'coupon',
      title: 'New coupon unlocked',
      message: 'Use SAVE10 and get up to ₹80 discount.',
      createdAt: new Date(now - 1000 * 60 * 60 * 6).toISOString(),
      isRead: true,
      deepLink: { tab: 'Home', screen: 'Coupons' },
    },
    {
      id: 'seed_promo_1',
      type: 'promo',
      title: 'Weekend deal',
      message: 'Free delivery on select shops this weekend.',
      createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      isRead: false,
      deepLink: { tab: 'Home' },
    },
    {
      id: 'seed_system_1',
      type: 'system',
      title: 'Profile updated',
      message: 'Your account preferences were saved.',
      createdAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
      isRead: true,
    },
    {
      id: 'seed_order_2',
      type: 'order',
      title: 'Order accepted',
      message: 'Your order is now accepted by the shop.',
      createdAt: new Date(now - 1000 * 60 * 60 * 22).toISOString(),
      isRead: false,
      deepLink: { tab: 'Orders' },
    },
    {
      id: 'seed_payment_2',
      type: 'payment',
      title: 'Refund initiated',
      message: 'Refund has been initiated for cancelled order.',
      createdAt: new Date(now - 1000 * 60 * 60 * 30).toISOString(),
      isRead: false,
      deepLink: { tab: 'Orders' },
    },
    {
      id: 'seed_coupon_2',
      type: 'coupon',
      title: 'FLAT50 available',
      message: 'Apply FLAT50 on orders above ₹299.',
      createdAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
      isRead: true,
      deepLink: { tab: 'Home', screen: 'Coupons' },
    },
    {
      id: 'seed_promo_2',
      type: 'promo',
      title: 'Top picks in your city',
      message: 'Explore popular shops near you now.',
      createdAt: new Date(now - 1000 * 60 * 60 * 42).toISOString(),
      isRead: true,
      deepLink: { tab: 'Home' },
    },
    {
      id: 'seed_system_2',
      type: 'system',
      title: 'Welcome to User App',
      message: 'Your notifications will appear here.',
      createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(),
      isRead: true,
    },
  ];
};

export async function seedNotificationsIfEmpty(): Promise<void> {
  const existing = await readNotifications();

  if (existing.length > 0) {
    return;
  }

  await writeNotifications(getSeedNotifications());
}

export async function getNotifications(): Promise<AppNotification[]> {
  const notifications = await readNotifications();

  return [...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function addNotification(notification: AppNotification): Promise<void> {
  const existing = await readNotifications();
  const next = [notification, ...existing.filter((item) => item.id !== notification.id)];

  await writeNotifications(next);
}

export async function markAsRead(id: string): Promise<void> {
  const existing = await readNotifications();

  await writeNotifications(
    existing.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
  );
}

export async function markAllAsRead(): Promise<void> {
  const existing = await readNotifications();

  await writeNotifications(existing.map((item) => ({ ...item, isRead: true })));
}

export async function clearAll(): Promise<void> {
  await writeNotifications([]);
}

export async function getUnreadCount(): Promise<number> {
  const existing = await readNotifications();

  return existing.filter((item) => !item.isRead).length;
}
