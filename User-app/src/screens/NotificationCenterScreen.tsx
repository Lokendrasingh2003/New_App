import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
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

const getRelativeTimeLabel = (iso: string) => {
  const timestamp = new Date(iso).getTime();

  if (Number.isNaN(timestamp)) {
    return 'Just now';
  }

  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Today';
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export function NotificationCenterScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
          await clearAll();
          await loadNotifications();
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
      <SectionHeader title="Notifications" />

      <View style={styles.topActionsRow}>
        <Pressable onPress={handleMarkAllRead} disabled={unreadCount === 0}>
          <AppText style={[styles.actionText, unreadCount === 0 ? styles.actionDisabled : null]}>
            Mark all read
          </AppText>
        </Pressable>
        <Pressable onPress={handleClearAll} disabled={notifications.length === 0}>
          <AppText
            style={[styles.actionTextDanger, notifications.length === 0 ? styles.actionDisabled : null]}
          >
            Clear all
          </AppText>
        </Pressable>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="No notifications" description="You’re all caught up for now." />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => handleNotificationPress(item)}>
              <View style={styles.leftBlock}>
                <View style={styles.iconWrap}>
                  <AppText style={styles.iconText}>{TYPE_ICON[item.type]}</AppText>
                </View>

                <View style={styles.textWrap}>
                  <AppText style={styles.titleText} numberOfLines={1}>
                    {item.title}
                  </AppText>
                  <AppText style={styles.messageText} numberOfLines={2}>
                    {item.message}
                  </AppText>
                  <AppText style={styles.timeText}>{getRelativeTimeLabel(item.createdAt)}</AppText>
                </View>
              </View>

              {!item.isRead ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          )}
        />
      )}

    </Screen>
  );
}

const styles = StyleSheet.create({
  topActionsRow: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionTextDanger: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionDisabled: {
    opacity: 0.4,
  },
  emptyWrap: {
    flex: 1,
    marginTop: -20,
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 20,
    gap: 8,
  },
  card: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  leftBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 15,
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  messageText: {
    marginTop: 2,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 17,
  },
  timeText: {
    marginTop: 4,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
});
