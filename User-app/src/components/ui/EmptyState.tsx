import { StyleSheet, View } from 'react-native';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({ title, description, actionLabel, onActionPress }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.title}>{title}</AppText>
      <AppText style={styles.description}>{description}</AppText>

      {actionLabel && onActionPress ? (
        <View style={styles.actionWrap}>
          <AppButton title={actionLabel} onPress={onActionPress} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionWrap: {
    width: '100%',
    maxWidth: 220,
    marginTop: 16,
  },
});
