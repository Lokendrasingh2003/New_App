import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { deleteReview, getMyReviews } from '../services/reviews/reviewService';
import { Review } from '../types/review';

const formatDate = (isoDate: string) => new Date(isoDate).toLocaleDateString();

const renderStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating);

export function MyReviewsScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadReviews = useCallback(async () => {
    const nextReviews = await getMyReviews();
    setReviews(nextReviews);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadReviews();
    }, [loadReviews]),
  );

  const handleDelete = (reviewId: string) => {
    Alert.alert('Delete review?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReview(reviewId);
          await loadReviews();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="My Reviews" />

      {reviews.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No reviews yet"
            description="Write reviews from shop, product, or order details to see them here."
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listWrap}>
          {reviews.map((review) => (
            <View key={review.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={[styles.targetBadge, review.targetType === 'shop' ? styles.shopBadge : styles.productBadge]}>
                  <AppText style={[styles.targetBadgeText, review.targetType === 'shop' ? styles.shopBadgeText : styles.productBadgeText]}>
                    {review.targetType === 'shop' ? 'Shop' : 'Product'}
                  </AppText>
                </View>
                <AppText style={styles.dateText}>{formatDate(review.updatedAt)}</AppText>
              </View>

              <AppText style={styles.targetIdText}>ID: {review.targetId}</AppText>

              <AppText style={styles.ratingText}>{renderStars(review.rating)}</AppText>

              {review.title ? <AppText style={styles.titleText}>{review.title}</AppText> : null}

              {review.comment ? <AppText style={styles.commentText}>{review.comment}</AppText> : null}

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => navigation.navigate('AddEditReview', { reviewId: review.id })}
                >
                  <AppText style={styles.editText}>Edit</AppText>
                </Pressable>
                <Pressable onPress={() => handleDelete(review.id)}>
                  <AppText style={styles.deleteText}>Delete</AppText>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    marginTop: 18,
  },
  listWrap: {
    marginTop: 10,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  targetBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shopBadge: {
    backgroundColor: '#DCFCE7',
  },
  productBadge: {
    backgroundColor: '#DBEAFE',
  },
  targetBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shopBadgeText: {
    color: '#166534',
  },
  productBadgeText: {
    color: '#1E40AF',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  targetIdText: {
    fontSize: 12,
    color: '#6B7280',
  },
  ratingText: {
    fontSize: 18,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  commentText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  actionsRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  editText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  deleteText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
  },
});
