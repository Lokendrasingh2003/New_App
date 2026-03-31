import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { AuthStackParamList } from '../navigation/types';
import { sendOtp, verifyOtp } from '../services/auth/authService';
import { digitsOnly, formatMaskedIndianPhone } from '../utils/format';
import { isValidOtp, isValidPassword } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerify'>;

export function OtpVerifyScreen({ route, navigation }: Props) {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const isRegisterFlow = route.params.mode === 'register';
  const normalizedOtp = digitsOnly(otp).slice(0, 6);
  const isOtpValid = isValidOtp(normalizedOtp);
  const otpError = normalizedOtp.length > 0 && !isOtpValid ? 'Enter a valid 6-digit OTP' : '';
  const isForgotPasswordFlow = route.params.mode === 'forgotPassword';
  const isNewPasswordValid = isValidPassword(newPassword);
  const isConfirmPasswordValid = confirmPassword.length > 0 && confirmPassword === newPassword;
  const newPasswordError =
    isForgotPasswordFlow && newPassword.length > 0 && !isNewPasswordValid
      ? 'Password must be at least 6 characters'
      : '';
  const confirmPasswordError =
    isForgotPasswordFlow && confirmPassword.length > 0 && !isConfirmPasswordValid
      ? 'Passwords do not match'
      : '';

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

    if (isForgotPasswordFlow && (!isNewPasswordValid || !isConfirmPasswordValid)) {
      return;
    }

    try {
      setIsSubmitting(true);
      if (isRegisterFlow) {
        await verifyOtp({
          phone: route.params.phone,
          otp: normalizedOtp,
          purpose: 'REGISTER',
          name: route.params.fullName,
          password: route.params.password,
        });
        Alert.alert('Registration successful', 'Your account is ready. Please login with password.');
      } else {
        await verifyOtp({
          phone: route.params.phone,
          otp: normalizedOtp,
          purpose: 'RESET_PASSWORD',
          newPassword,
        });
        Alert.alert('Password updated', 'Please login with your new password.');
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Verification failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtp(digitsOnly(value).slice(0, 6));
  };

  const handleResendOtp = () => {
    if (secondsLeft > 0) {
      return;
    }

    setIsSubmitting(true);
    sendOtp(route.params.phone, isRegisterFlow ? 'REGISTER' : 'RESET_PASSWORD')
      .then(() => {
        setOtp('');
        setSecondsLeft(30);
      })
      .catch((error) => {
        Alert.alert('Unable to resend OTP', error instanceof Error ? error.message : 'Please try again.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
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

        {isForgotPasswordFlow ? (
          <>
            <AppInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Enter new password"
              error={newPasswordError}
            />
            <AppInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Re-enter new password"
              error={confirmPasswordError}
            />
          </>
        ) : null}

        <AppButton
          title={isForgotPasswordFlow ? 'Verify & Reset Password' : 'Verify & Complete Signup'}
          onPress={handleVerify}
          disabled={
            !isOtpValid ||
            (isForgotPasswordFlow && (!isNewPasswordValid || !isConfirmPasswordValid)) ||
            isSubmitting
          }
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
