import { Pressable, PressableProps, StyleSheet, TextStyle, ViewStyle } from 'react-native';

import { AppText } from './AppText';

type ChipProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'default' | 'selected' | 'disabled';
};

const chipVariantStyle: Record<NonNullable<ChipProps['variant']>, ViewStyle> = {
  default: {
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  selected: {
    borderColor: '#22A55D',
    backgroundColor: '#ECFDF3',
  },
  disabled: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
};

const chipTextStyle: Record<NonNullable<ChipProps['variant']>, TextStyle> = {
  default: {
    color: '#374151',
  },
  selected: {
    color: '#166534',
  },
  disabled: {
    color: '#9CA3AF',
  },
};

export function Chip({ label, variant = 'default', disabled, ...props }: ChipProps) {
  const isDisabled = disabled || variant === 'disabled';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={[styles.chip, chipVariantStyle[variant], isDisabled ? styles.disabled : null]}
      {...props}
    >
      <AppText style={[styles.label, chipTextStyle[variant]]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.9,
  },
});
