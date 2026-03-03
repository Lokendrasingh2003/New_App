import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '../ui/AppText';

type Props = {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disableIncrement?: boolean;
};

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
  disableIncrement = false,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.button} onPress={onDecrement}>
        <AppText style={styles.buttonText}>−</AppText>
      </Pressable>

      <AppText style={styles.quantityText}>{quantity}</AppText>

      <Pressable
        style={[styles.button, disableIncrement ? styles.buttonDisabled : null]}
        onPress={onIncrement}
        disabled={disableIncrement}
      >
        <AppText style={[styles.buttonText, disableIncrement ? styles.buttonTextDisabled : null]}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 92,
    height: 32,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  button: {
    width: 30,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  buttonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
});
