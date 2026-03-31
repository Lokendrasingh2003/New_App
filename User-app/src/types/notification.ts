export type NotificationType = 'order' | 'payment' | 'coupon' | 'promo' | 'system';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  deepLink?: {
    tab?: 'Home' | 'Search' | 'Cart' | 'Orders' | 'Profile';
    screen?: string;
    params?: any;
  };
};
