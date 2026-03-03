import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { Review, ReviewTargetType } from '../../types/review';

const readReviews = async (): Promise<Review[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.REVIEWS);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Review[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

const writeReviews = async (reviews: Review[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
};

export async function getReviewsForTarget(
  targetType: ReviewTargetType,
  targetId: string,
): Promise<Review[]> {
  const reviews = await readReviews();

  return reviews
    .filter((item) => item.targetType === targetType && item.targetId === targetId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getMyReviews(): Promise<Review[]> {
  const reviews = await readReviews();

  return [...reviews].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function upsertReview(review: Review): Promise<void> {
  const reviews = await readReviews();
  const existingIndex = reviews.findIndex((item) => item.id === review.id);

  if (existingIndex >= 0) {
    reviews[existingIndex] = review;
    await writeReviews(reviews);
    return;
  }

  await writeReviews([review, ...reviews]);
}

export async function deleteReview(reviewId: string): Promise<void> {
  const reviews = await readReviews();
  await writeReviews(reviews.filter((item) => item.id !== reviewId));
}

export async function getReviewByOrder(
  orderId: string,
  targetType: ReviewTargetType,
  targetId: string,
): Promise<Review | null> {
  const reviews = await readReviews();

  return (
    reviews.find(
      (item) =>
        item.orderId === orderId && item.targetType === targetType && item.targetId === targetId,
    ) ?? null
  );
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const reviews = await readReviews();

  return reviews.find((item) => item.id === reviewId) ?? null;
}
