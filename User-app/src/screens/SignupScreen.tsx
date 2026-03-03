import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { AuthStackParamList } from '../navigation/types';
import { digitsOnly } from '../utils/format';
import { isValidIndianPhone } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

type FormErrors = {
  fullName?: string;
  phone?: string;
  terms?: string;
};

export function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const normalizedPhone = useMemo(() => digitsOnly(phone).slice(0, 10), [phone]);
  const isPhoneValid = isValidIndianPhone(normalizedPhone);
  const isNameValid = fullName.trim().length >= 2;
  const canSubmit = isNameValid && isPhoneValid && agreeTerms && !isSubmitting;

  const setFieldError = <K extends keyof FormErrors>(key: K, value?: string) => {
    setErrors((previous) => ({ ...previous, [key]: value }));
  };

  const handleNameChange = (value: string) => {
    setFullName(value);

    if (value.trim().length === 0) {
      setFieldError('fullName', undefined);
      return;
    }

    setFieldError(
      'fullName',
      value.trim().length < 2 ? 'Full name must be at least 2 characters.' : undefined,
    );
  };

  const handlePhoneChange = (value: string) => {
    const nextPhone = digitsOnly(value).slice(0, 10);
    setPhone(nextPhone);

    if (nextPhone.length === 0) {
      setFieldError('phone', undefined);
      return;
    }

    setFieldError('phone', isValidIndianPhone(nextPhone) ? undefined : 'Enter a valid 10-digit mobile number');
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!normalizedPhone) {
      nextErrors.phone = 'Mobile number is required.';
    } else if (!isPhoneValid) {
      nextErrors.phone = 'Enter a valid 10-digit mobile number';
    }

    if (!agreeTerms) {
      nextErrors.terms = 'Please agree to Terms & Privacy.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);

    navigation.navigate('OtpVerify', { phone: normalizedPhone });
  };

  return (
    <Screen scroll>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <AppText style={styles.title}>Create account</AppText>
          <AppText style={styles.subtitle}>Sign up using your mobile number</AppText>

          <View style={styles.formGroup}>
            <AppInput
              label="Full Name"
              value={fullName}
              onChangeText={handleNameChange}
              placeholder="Enter your full name"
              autoCapitalize="words"
              error={errors.fullName}
            />

            <AppInput
              label="Mobile Number"
              value={normalizedPhone}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="10-digit mobile number"
              error={errors.phone}
              leftAddon={
                <View style={styles.codeBadge}>
                  <AppText style={styles.codeText}>+91</AppText>
                </View>
              }
            />

            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAgreeTerms((previous) => !previous);
                setFieldError('terms', undefined);
              }}
            >
              <View style={[styles.checkbox, agreeTerms ? styles.checkboxChecked : null]}>
                {agreeTerms ? <AppText style={styles.checkmark}>✓</AppText> : null}
              </View>
              <AppText style={styles.termsText}>I agree to Terms & Privacy</AppText>
            </Pressable>
            {errors.terms ? <AppText style={styles.errorText}>{errors.terms}</AppText> : null}

            <AppButton title="Send OTP" onPress={handleSendOtp} loading={isSubmitting} disabled={!canSubmit} />

            <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('Login')}>
              <AppText style={styles.secondaryActionText}>Already have an account? Login</AppText>
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
  termsRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: '#22A55D',
    backgroundColor: '#22A55D',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  errorText: {
    marginTop: -6,
    fontSize: 12,
    color: '#DC2626',
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
