import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getCategoryLabel } from '../constants/mockCategories';
import {
  clearDraft,
  getDraft,
  getSubmissions,
} from '../services/shopRegistration/shopRegistrationService';
import { ShopRegistrationDraft } from '../types/shopRegistration';
import { formatOrderDate } from '../utils/date';

export function SellerStatusScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [draft, setDraft] = useState<ShopRegistrationDraft | null>(null);
  const [submissions, setSubmissions] = useState<ShopRegistrationDraft[]>([]);

  const loadData = useCallback(async () => {
    const [existingDraft, allSubmissions] = await Promise.all([getDraft(), getSubmissions()]);
    setDraft(existingDraft);
    setSubmissions(allSubmissions);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleDiscardDraft = () => {
    Alert.alert('Discard draft?', 'Your draft progress will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await clearDraft();
          await loadData();
        },
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader />
      <SectionHeader title="Seller Status" />

      {draft ? (
        <View style={styles.draftCard}>
          <AppText style={styles.draftTitle}>Draft in progress</AppText>
          <AppText style={styles.draftShopName}>{draft.shopName.trim() || 'Unnamed shop'}</AppText>

          <View style={styles.draftActionsRow}>
            <AppButton title="Continue" onPress={() => navigation.navigate('SellerOnboarding')} />
            <AppButton title="Discard draft" variant="secondary" onPress={handleDiscardDraft} />
          </View>
        </View>
      ) : null}

      {submissions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No submissions yet"
            description="Start your seller registration to see request status here."
            actionLabel="Start Registration"
            onActionPress={() => navigation.navigate('SellerOnboarding')}
          />
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.submissionCard}>
              <View style={styles.cardTopRow}>
                <AppText style={styles.shopNameText}>{item.shopName.trim() || 'Unnamed shop'}</AppText>
                <View style={styles.submittedBadge}>
                  <AppText style={styles.submittedBadgeText}>{item.status}</AppText>
                </View>
              </View>

              <AppText style={styles.metaText}>Created: {formatOrderDate(item.createdAt)}</AppText>
              <AppText style={styles.metaText}>Category: {getCategoryLabel(item.primaryCategoryId || '--')}</AppText>
              <AppText style={styles.metaText}>City: {item.cityId || '--'}</AppText>

              <Pressable
                style={styles.viewDetailsButton}
                onPress={() =>
                  navigation.navigate('SellerSubmissionDetails', {
                    registrationId: item.id,
                  })
                }
              >
                <AppText style={styles.viewDetailsText}>View details</AppText>
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  draftCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  draftTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '700',
  },
  draftShopName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  draftActionsRow: {
    marginTop: 2,
    gap: 8,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 280,
  },
  listContent: {
    marginTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  submissionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  shopNameText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  submittedBadge: {
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  submittedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    textTransform: 'capitalize',
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
  },
  viewDetailsButton: {
    marginTop: 5,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22A55D',
    backgroundColor: '#ECFDF3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22A55D',
  },
});
