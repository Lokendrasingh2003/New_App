import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { digitsOnly, formatMaskedIndianPhone } from '../utils/format';
import { isValidOtp } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route, navigation }: Props) {
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const normalizedOtp = digitsOnly(otp).slice(0, 6);
  const isOtpValid = isValidOtp(normalizedOtp);
  const otpError = normalizedOtp.length > 0 && !isOtpValid ? 'Enter a valid 6-digit OTP' : '';

  const maskedPhone = useMemo(
    () => formatMaskedIndianPhone(route.params.phone),
    [route.params.phone],
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleVerify = async () => {
    if (!isOtpValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await verifyOtp(normalizedOtp);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleOtpChange = (value: string) => {
    setOtp(digitsOnly(value).slice(0, 6));
  };

  const handleResendOtp = () => {
    if (secondsLeft > 0) {
      return;
    }

    setOtp('');
    setSecondsLeft(30);
  };

  const resendText =
    secondsLeft > 0 ? `Resend in 0:${secondsLeft.toString().padStart(2, '0')}` : 'Resend OTP';

  return (
    <Screen scroll>
      <AppText style={styles.title}>Verify OTP</AppText>
      <AppText style={styles.subtitle}>OTP sent to {maskedPhone}</AppText>

      <View style={styles.formGroup}>
        <AppInput
          label="OTP"
          value={normalizedOtp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="Enter 6-digit OTP"
          error={otpError}
        />

        <AppButton
          title="Verify"
          onPress={handleVerify}
          disabled={!isOtpValid}
          loading={isSubmitting}
        />

        <Pressable
          onPress={handleResendOtp}
          disabled={secondsLeft > 0}
          style={styles.resendAction}
          accessibilityRole="button"
        >
          <AppText style={[styles.resendText, secondsLeft > 0 ? styles.resendDisabled : null]}>
            {resendText}
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    color: '#6B7280',
  },
  formGroup: {
    marginTop: 32,
    gap: 12,
  },
  resendAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  resendDisabled: {
    color: '#9CA3AF',
  },
});
