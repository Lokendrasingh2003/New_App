import { NavigationProp, ParamListBase, RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getCategoryLabel } from '../constants/mockCategories';
import { HomeStackParamList } from '../navigation/types';
import { getSubmissions } from '../services/shopRegistration/shopRegistrationService';
import { ShopRegistrationDraft } from '../types/shopRegistration';
import { formatOrderDate } from '../utils/date';

const maskAccountNumber = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '--';
  }

  if (trimmed.length <= 4) {
    return trimmed;
  }

  return `${'*'.repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export function SellerSubmissionDetailsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'SellerSubmissionDetails'>>();
  const [submission, setSubmission] = useState<ShopRegistrationDraft | null>(null);

  useEffect(() => {
    const load = async () => {
      const allSubmissions = await getSubmissions();
      setSubmission(allSubmissions.find((item) => item.id === route.params.registrationId) ?? null);
    };

    load();
  }, [route.params.registrationId]);

  const secondaryCategories = useMemo(
    () =>
      submission?.secondaryCategoryIds.length
        ? submission.secondaryCategoryIds.map((item) => getCategoryLabel(item)).join(', ')
        : '--',
    [submission?.secondaryCategoryIds],
  );

  if (!submission) {
    return (
      <Screen>
        <AppHeader />
        <SectionHeader title="Registration Details" />
        <View style={styles.emptyWrap}>
          <EmptyState title="Submission not found" description="This request is no longer available." />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title="Registration Details" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentWrap}>
        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Basic details</AppText>
          <AppText style={styles.lineText}>Shop: {submission.shopName || '--'}</AppText>
          <AppText style={styles.lineText}>Description: {submission.description || '--'}</AppText>
          <AppText style={styles.lineText}>Primary: {getCategoryLabel(submission.primaryCategoryId || '--')}</AppText>
          <AppText style={styles.lineText}>Secondary: {secondaryCategories}</AppText>
          <AppText style={styles.lineText}>Created: {formatOrderDate(submission.createdAt)}</AppText>
          <AppText style={styles.lineText}>Status: {submission.status}</AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Location</AppText>
          <AppText style={styles.lineText}>City ID: {submission.cityId || '--'}</AppText>
          <AppText style={styles.lineText}>Address 1: {submission.addressLine1 || '--'}</AppText>
          <AppText style={styles.lineText}>Address 2: {submission.addressLine2 || '--'}</AppText>
          <AppText style={styles.lineText}>Area: {submission.area || '--'}</AppText>
          <AppText style={styles.lineText}>Landmark: {submission.landmark || '--'}</AppText>
          <AppText style={styles.lineText}>Pincode: {submission.pincode || '--'}</AppText>
          <AppText style={styles.lineText}>
            Coordinates:{' '}
            {typeof submission.latitude === 'number' && typeof submission.longitude === 'number'
              ? `${submission.latitude}, ${submission.longitude}`
              : '--'}
          </AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Documents</AppText>
          <AppText style={styles.lineText}>
            Business proof: {submission.documents.businessProofUri || '--'}
          </AppText>
          <AppText style={styles.lineText}>
            Identity proof: {submission.documents.identityProofUri || '--'}
          </AppText>
          <AppText style={styles.lineText}>GST: {submission.documents.gstNumber || '--'}</AppText>
        </View>

        <View style={styles.card}>
          <AppText style={styles.cardTitle}>Bank</AppText>
          <AppText style={styles.lineText}>Account holder: {submission.bank.accountHolderName || '--'}</AppText>
          <AppText style={styles.lineText}>
            Account number: {maskAccountNumber(submission.bank.accountNumber)}
          </AppText>
          <AppText style={styles.lineText}>IFSC: {submission.bank.ifsc || '--'}</AppText>
        </View>

        <View style={styles.actionsWrap}>
          <AppButton
            title="Edit & Resubmit"
            onPress={() => Alert.alert('Coming soon', 'Editing submitted request coming soon')}
          />
          <AppButton
            title="Contact Support"
            variant="secondary"
            onPress={() => {
              try {
                navigation.navigate('HelpCenter');
              } catch {
                Alert.alert('Support', 'Please open Help Center for support.');
              }
            }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    flex: 1,
    minHeight: 280,
    justifyContent: 'center',
  },
  contentWrap: {
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 5,
  },
  cardTitle: {
    marginBottom: 2,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  lineText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  actionsWrap: {
    marginTop: 4,
    gap: 10,
  },
});
