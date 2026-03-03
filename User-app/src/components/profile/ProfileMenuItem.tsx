import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';

type ProfileMenuItemProps = {
  title: string;
  subtitle?: string;
  leftIcon?: string;
  onPress: () => void;
  rightText?: string;
  destructive?: boolean;
};

export function ProfileMenuItem({
  title,
  subtitle,
  leftIcon,
  onPress,
  rightText,
  destructive = false,
}: ProfileMenuItemProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.leftWrap}>
        <View style={styles.iconWrap}>
          <AppText style={styles.iconText}>{leftIcon ?? '•'}</AppText>
        </View>

        <View style={styles.textWrap}>
          <AppText style={[styles.title, destructive ? styles.titleDestructive : null]}>{title}</AppText>
          {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
        </View>
      </View>

      <View style={styles.rightWrap}>
        {rightText ? <AppText style={styles.rightText}>{rightText}</AppText> : null}
        <AppText style={styles.chevron}>›</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  leftWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 14,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  titleDestructive: {
    color: '#DC2626',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  rightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rightText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 20,
    color: '#9CA3AF',
    lineHeight: 20,
  },
});
