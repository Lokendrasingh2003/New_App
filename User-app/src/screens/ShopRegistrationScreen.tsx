import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';

const STEPS = [
  'Basic details',
  'Location',
  'Documents',
  'Bank details',
  'Submit for approval',
];

export function ShopRegistrationScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleStartRegistration = () => {
    navigation.navigate('SellerOnboarding');
  };

  const handleContactSupport = () => {
    try {
      navigation.navigate('HelpCenter');
    } catch {
      Alert.alert('Support', 'Please contact support from Help Center.');
    }
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Register Your Shop" />

      <View style={styles.infoCard}>
        <AppText style={styles.descriptionText}>
          List your shop on CityBazar, manage products, accept orders, and track earnings in upcoming
          seller tools.
        </AppText>
      </View>

      <View style={styles.stepsCard}>
        <AppText style={styles.stepsTitle}>Registration Steps</AppText>

        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.stepIndexWrap}>
              <AppText style={styles.stepIndexText}>{index + 1}</AppText>
            </View>
            <AppText style={styles.stepText}>{step}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.actionsWrap}>
        <AppButton title="Start Registration" onPress={handleStartRegistration} />
        <AppButton
          title="View Seller Status"
          variant="secondary"
          onPress={() => navigation.navigate('SellerStatus')}
        />
        <AppButton title="Contact Support" variant="secondary" onPress={handleContactSupport} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  stepsCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 10,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepIndexWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  stepText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  actionsWrap: {
    marginTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
});
