import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { AuthStackParamList } from '../navigation/types';
import { digitsOnly } from '../utils/format';
import { isValidIndianPhone } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = digitsOnly(phone).slice(0, 10);
  const isPhoneValid = isValidIndianPhone(normalizedPhone);
  const phoneError =
    normalizedPhone.length > 0 && !isPhoneValid ? 'Enter a valid 10-digit mobile number' : '';

  const handlePhoneChange = (value: string) => {
    setPhone(digitsOnly(value).slice(0, 10));
  };

  const handleSendOtp = async () => {
    if (!isPhoneValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    navigation.navigate('OtpVerify', { phone: normalizedPhone });
  };

  const handleCreateAccount = () => {
    navigation.navigate('Signup');
  };

  return (
    <Screen scroll>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <AppText style={styles.title}>Welcome back</AppText>
          <AppText style={styles.subtitle}>Login with your mobile number</AppText>

          <View style={styles.formGroup}>
            <AppInput
              label="Mobile Number"
              value={normalizedPhone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
              error={phoneError}
              autoFocus
              leftAddon={
                <View style={styles.codeBadge}>
                  <AppText style={styles.codeText}>+91</AppText>
                </View>
              }
            />

            <AppText style={styles.helperText}>We will send you a 6-digit OTP</AppText>

            <AppButton
              title="Send OTP"
              onPress={handleSendOtp}
              disabled={!isPhoneValid || isSubmitting}
              loading={isSubmitting}
            />

            <Pressable style={styles.secondaryAction} onPress={handleCreateAccount}>
              <AppText style={styles.secondaryActionText}>New here? Create account</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  formGroup: {
    marginTop: 20,
    gap: 12,
  },
  codeBadge: {
    minHeight: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 999,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
  },
  helperText: {
    marginTop: -4,
    fontSize: 12,
    color: '#6B7280',
  },
  secondaryAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22A55D',
  },
});
