import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackParamList } from '../navigation/types';
import { digitsOnly } from '../utils/format';
import { isValidIndianPhone, isValidPassword } from '../utils/validators';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { loginWithPassword } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = digitsOnly(phone).slice(0, 10);
  const isPhoneValid = isValidIndianPhone(normalizedPhone);
  const isPasswordValid = isValidPassword(password);
  const phoneError =
    normalizedPhone.length > 0 && !isPhoneValid ? 'Enter a valid 10-digit mobile number' : '';
  const passwordError =
    password.length > 0 && !isPasswordValid ? 'Password must be at least 6 characters' : '';

  const handlePhoneChange = (value: string) => {
    setPhone(digitsOnly(value).slice(0, 10));
  };

  const handleLogin = async () => {
    if (!isPhoneValid || !isPasswordValid || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await loginWithPassword(normalizedPhone, password);
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate('Signup');
  };

  return (
    <Screen scroll>
      <View style={styles.centerWrap}>
        <View style={styles.card}>
          <AppText style={styles.title}>Welcome back</AppText>
          <AppText style={styles.subtitle}>Login with mobile number and password</AppText>

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

            <AppInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password"
              error={passwordError}
            />

            <AppButton
              title="Login"
              onPress={handleLogin}
              disabled={!isPhoneValid || !isPasswordValid || isSubmitting}
              loading={isSubmitting}
            />

            <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('ForgotPassword')}>
              <AppText style={styles.secondaryActionText}>Forgot password?</AppText>
            </Pressable>

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
