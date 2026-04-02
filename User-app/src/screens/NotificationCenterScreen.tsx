import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, SectionList, StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';

import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import {
  clearAll,
  getNotifications,
  markAllAsRead,
  markAsRead,
  seedNotificationsIfEmpty,
} from '../services/notifications/notificationService';
import { AppNotification, NotificationType } from '../types/notification';

const TYPE_ICON: Record<NotificationType, string> = {
  order: '📦',
  payment: '💳',
  coupon: '🏷️',
  promo: '🎉',
  system: '⚙️',
};

const TYPE_COLORS: Record<NotificationType, { bg: string; border: string }> = {
  order: { bg: '#EFF6FF', border: '#BFDBFE' },
  payment: { bg: '#F0FDF4', border: '#BBFBBC' },
  coupon: { bg: '#FEF3C7', border: '#FDE68A' },
  promo: { bg: '#FCE7F3', border: '#FBCFE8' },
  system: { bg: '#F3F4F6', border: '#E5E7EB' },
};

const getRelativeTimeLabel = (iso: string) => {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  return `${diffDays}d ago`;
};

const groupNotificationsByDate = (notifications: AppNotification[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sections: Array<{
    title: string;
    data: AppNotification[];
  }> = [
    { title: 'Today', data: [] },
    { title: 'Yesterday', data: [] },
    { title: 'Older', data: [] },
  ];

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.createdAt);
    notifDate.setHours(0, 0, 0, 0);

    if (notifDate.getTime() === today.getTime()) {
      sections[0].data.push(notif);
    } else if (notifDate.getTime() === yesterday.getTime()) {
      sections[1].data.push(notif);
    } else {
      sections[2].data.push(notif);
    }
  });

  return sections.filter((section) => section.data.length > 0);
};

export function NotificationCenterScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isClearing, setIsClearing] = useState(false);

  const loadNotifications = useCallback(async () => {
    await seedNotificationsIfEmpty();
    const nextNotifications = await getNotifications();
    setNotifications(nextNotifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(notifications),
    [notifications],
  );

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    await loadNotifications();
  };

  const handleClearAll = () => {
    Alert.alert('Clear all notifications?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsClearing(true);
            await clearAll();
            setNotifications([]);
            setIsClearing(false);
          } catch (error) {
            setIsClearing(false);
            Alert.alert('Error', 'Failed to clear notifications. Please try again.');
            console.error('Clear notifications error:', error);
          }
        },
      },
    ]);
  };

  const handleNotificationPress = async (item: AppNotification) => {
    await markAsRead(item.id);
    await loadNotifications();

    const deepLink = item.deepLink;

    if (!deepLink) {
      return;
    }

    try {
      if (deepLink.tab && deepLink.screen) {
        navigation.navigate(deepLink.tab, {
          screen: deepLink.screen,
          params: deepLink.params,
        });
        return;
      }

      if (deepLink.tab) {
        navigation.navigate(deepLink.tab, deepLink.params);
        return;
      }

      if (deepLink.screen) {
        navigation.navigate(deepLink.screen, deepLink.params);
      }
    } catch {
      return;
    }
  };

  return (
    <Screen>
      <AppHeader />

      {/* Header with title and unread badge */}
      <View style={styles.headerContainer}>
        <View>
          <AppText style={styles.headerTitle}>Notifications</AppText>
          {unreadCount > 0 && (
            <AppText style={styles.headerSubtitle}>
              {unreadCount} unread
            </AppText>
          )}
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <AppText style={styles.unreadBadgeText}>{unreadCount}</AppText>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, unreadCount === 0 && styles.actionButtonDisabled]}
            onPress={handleMarkAllRead}
            disabled={unreadCount === 0 || isClearing}
          >
            <AppText style={[styles.actionButtonText, unreadCount === 0 && styles.actionButtonTextDisabled]}>
              ✓ Mark all read
            </AppText>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.actionButtonDanger, isClearing && styles.actionButtonDisabled]}
            onPress={handleClearAll}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <AppText style={styles.actionButtonTextDanger}>🗑 Clear all</AppText>
            )}
          </Pressable>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState title="No notifications yet" description="You're all caught up! Check back later for updates." />
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderSectionHeader={({ section: { title } }) => (
            <AppText style={styles.sectionHeader}>{title}</AppText>
          )}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.notificationCard,
                {
                  backgroundColor: TYPE_COLORS[item.type].bg,
                  borderColor: TYPE_COLORS[item.type].border,
                },
                !item.isRead && styles.notificationCardUnread,
              ]}
              onPress={() => handleNotificationPress(item)}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <AppText style={styles.icon}>{TYPE_ICON[item.type]}</AppText>
                </View>

                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <AppText style={styles.title} numberOfLines={1}>
                      {item.title}
                    </AppText>
                    {!item.isRead && <View style={styles.unreadIndicator} />}
                  </View>
                  <AppText style={styles.message} numberOfLines={2}>
                    {item.message}
                  </AppText>
                  <AppText style={styles.timestamp}>
                    {getRelativeTimeLabel(item.createdAt)}
                  </AppText>
                </View>
              </View>

              <View style={styles.cardAction}>
                <AppText style={styles.actionArrow}>›</AppText>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 999,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionButtonTextDisabled: {
    color: '#9CA3AF',
  },
  actionButtonDanger: {
    borderColor: '#FECACA',
  },
  actionButtonTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  notificationCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationCardUnread: {
    opacity: 1,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  unreadIndicator: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#2563EB',
    flexShrink: 0,
  },
  message: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 4,
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontWeight: '500',
  },
  cardAction: {
    marginLeft: 8,
  },
  actionArrow: {
    fontSize: 24,
    color: '#D1D5DB',
    fontWeight: '300',
  },
});
