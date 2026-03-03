import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { HomeStackParamList } from '../navigation/types';
import { getReviewById, upsertReview } from '../services/reviews/reviewService';
import { Review, ReviewTargetType } from '../types/review';

type ReviewFormState = {
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
};

type ReviewFormErrors = {
  rating?: string;
  comment?: string;
};

const createReviewId = () => `review_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

export function AddEditReviewScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'AddEditReview'>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [targetType, setTargetType] = useState<ReviewTargetType | null>(route.params?.targetType ?? null);
  const [targetId, setTargetId] = useState(route.params?.targetId ?? null);
  const [orderId, setOrderId] = useState(route.params?.orderId);
  const [form, setForm] = useState<ReviewFormState>({
    rating: 5,
    title: '',
    comment: '',
  });
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = Boolean(route.params?.reviewId);

  useFocusEffect(
    useCallback(() => {
      const hydrate = async () => {
        if (!route.params?.reviewId) {
          return;
        }

        const review = await getReviewById(route.params.reviewId);
        setExistingReview(review);

        if (review) {
          setTargetType(review.targetType);
          setTargetId(review.targetId);
          setOrderId(review.orderId);
          setForm({
            rating: review.rating,
            title: review.title ?? '',
            comment: review.comment ?? '',
          });
        }
      };

      hydrate();
    }, [route.params?.reviewId]),
  );

  const screenTitle = useMemo(() => (isEditMode ? 'Edit Review' : 'Write Review'), [isEditMode]);

  const setFormField = <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: ReviewFormErrors = {};

    if (!form.rating) {
      nextErrors.rating = 'Please select a rating.';
    }

    if (!form.comment.trim()) {
      nextErrors.comment = 'Please add your review comment.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !targetType || !targetId) {
      return;
    }

    setIsSaving(true);

    const nowIso = new Date().toISOString();
    const reviewToSave: Review = {
      id: existingReview?.id ?? createReviewId(),
      targetType,
      targetId,
      orderId,
      rating: form.rating,
      title: form.title.trim() || undefined,
      comment: form.comment.trim(),
      createdAt: existingReview?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    await upsertReview(reviewToSave);
    setIsSaving(false);
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title={screenTitle} />

      <View style={styles.formWrap}>
        <View style={styles.targetCard}>
          <AppText style={styles.targetLabel}>Reviewing</AppText>
          <AppText style={styles.targetValue}>{targetType ? `${targetType.toUpperCase()} • ${targetId}` : '--'}</AppText>
          {orderId ? <AppText style={styles.targetMeta}>Order: {orderId}</AppText> : null}
        </View>

        <View>
          <AppText style={styles.fieldLabel}>Your Rating</AppText>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = value <= form.rating;

              return (
                <Pressable key={value} onPress={() => setFormField('rating', value as 1 | 2 | 3 | 4 | 5)}>
                  <AppText style={[styles.star, selected ? styles.starSelected : null]}>★</AppText>
                </Pressable>
              );
            })}
          </View>
          {errors.rating ? <AppText style={styles.errorText}>{errors.rating}</AppText> : null}
        </View>

        <AppInput
          label="Title (optional)"
          value={form.title}
          onChangeText={(text) => setFormField('title', text)}
          placeholder="Short summary"
          maxLength={60}
        />

        <AppInput
          label="Your Review"
          value={form.comment}
          onChangeText={(text) => setFormField('comment', text)}
          placeholder="Share your experience"
          multiline
          numberOfLines={4}
          style={styles.commentInput}
          textAlignVertical="top"
          maxLength={500}
          error={errors.comment}
        />

        <AppButton title={isEditMode ? 'Update Review' : 'Submit Review'} loading={isSaving} onPress={handleSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formWrap: {
    marginTop: 10,
    gap: 12,
    paddingBottom: 28,
  },
  targetCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  targetLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  targetValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  targetMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  star: {
    fontSize: 34,
    color: '#D1D5DB',
  },
  starSelected: {
    color: '#F59E0B',
  },
  commentInput: {
    minHeight: 92,
    paddingTop: 12,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#DC2626',
  },
});
