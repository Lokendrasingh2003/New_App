import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';

export function SellerOnboardingSuccessScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'SellerOnboardingSuccess'>>();

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Submitted for Review" />

      <View style={styles.card}>
        <View style={styles.statusBadge}>
          <AppText style={styles.statusBadgeText}>Submitted</AppText>
        </View>

        <AppText style={styles.messageText}>We will notify you after approval.</AppText>

        <AppText style={styles.metaLabel}>Registration ID</AppText>
        <AppText style={styles.metaValue}>{route.params.registrationId}</AppText>
      </View>

      <View style={styles.actionsWrap}>
        <AppButton title="Go to Home" onPress={() => navigation.navigate('HomeMain')} />
        <AppButton
          title="View Status"
          variant="secondary"
          onPress={() => navigation.navigate('SellerStatus')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  messageText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  metaLabel: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  actionsWrap: {
    marginTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
});
