import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function SectionHeader({ title, actionLabel, onActionPress }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <AppText style={styles.title}>{title}</AppText>

      {actionLabel && onActionPress ? (
        <Pressable
          onPress={onActionPress}
          accessibilityRole="button"
          style={styles.actionPressable}
        >
          <AppText style={styles.action}>{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  actionPressable: {
    minHeight: 32,
    justifyContent: 'center',
  },
  action: {
    color: '#22A55D',
    fontSize: 14,
    fontWeight: '600',
  },
});
