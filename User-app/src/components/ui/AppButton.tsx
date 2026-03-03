import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import { AppText } from './AppText';

type AppButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

const buttonVariantStyle: Record<NonNullable<AppButtonProps['variant']>, ViewStyle> = {
  primary: {
    backgroundColor: '#2563EB',
  },
  secondary: {
    backgroundColor: '#E5E7EB',
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
};

const textVariantStyle: Record<NonNullable<AppButtonProps['variant']>, TextStyle> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: '#111827' },
  ghost: { color: '#1F2937' },
};

const spinnerColorByVariant: Record<NonNullable<AppButtonProps['variant']>, string> = {
  primary: '#FFFFFF',
  secondary: '#111827',
  ghost: '#1F2937',
};

export function AppButton({
  title,
  variant = 'primary',
  disabled,
  loading = false,
  ...props
}: AppButtonProps) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      style={[styles.button, buttonVariantStyle[variant], isDisabled ? styles.disabled : null]}
      disabled={isDisabled}
      {...props}
    >
      <View style={styles.contentWrap}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={spinnerColorByVariant[variant]}
            style={styles.spinnerOverlay}
          />
        ) : null}
        <AppText
          style={[styles.buttonText, textVariantStyle[variant], loading ? styles.hiddenText : null]}
        >
          {title}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  contentWrap: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerOverlay: {
    position: 'absolute',
  },
  hiddenText: {
    opacity: 0,
  },
});
