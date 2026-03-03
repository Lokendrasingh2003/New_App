import { ReactNode } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { AppText } from './AppText';

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
};

export function AppInput({ style, label, error, leftAddon, rightAddon, ...props }: AppInputProps) {
  return (
    <View>
      {label ? <AppText style={styles.label}>{label}</AppText> : null}

      <View style={[styles.inputContainer, error ? styles.inputContainerError : null]}>
        {leftAddon ? <View style={styles.addonLeft}>{leftAddon}</View> : null}

        <TextInput style={[styles.input, style]} placeholderTextColor="#9CA3AF" {...props} />

        {rightAddon ? <View style={styles.addonRight}>{rightAddon}</View> : null}
      </View>

      {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  inputContainer: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputContainerError: {
    borderColor: '#DC2626',
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 6,
    fontSize: 16,
    color: '#111827',
  },
  addonLeft: {
    marginRight: 4,
  },
  addonRight: {
    marginLeft: 4,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#DC2626',
  },
});
