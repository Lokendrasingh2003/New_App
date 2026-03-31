import { Review, ReviewTargetType } from '../../types/review';
import { apiRequest } from '../api/httpClient';

type ReviewsPayload = {
  reviews?: Array<{
    id: string;
    productId: string;
    orderId?: string;
    rating: number;
    title?: string;
    reviewText?: string;
    createdAt: string;
    updatedAt: string;
  }>;
};

const mapReview = (item: NonNullable<ReviewsPayload['reviews']>[number]): Review => ({
  id: String(item.id),
  targetType: 'product',
  targetId: String(item.productId),
  orderId: item.orderId,
  rating: Math.min(5, Math.max(1, Number(item.rating || 1))) as 1 | 2 | 3 | 4 | 5,
  title: item.title,
  comment: item.reviewText,
  createdAt: String(item.createdAt),
  updatedAt: String(item.updatedAt),
});

export async function getReviewsForTarget(
  targetType: ReviewTargetType,
  targetId: string,
): Promise<Review[]> {
  if (targetType === 'shop') {
    return [];
  }

  const response = await apiRequest<ReviewsPayload>(`/api/products/${targetId}/reviews`, {
    method: 'GET',
    query: {
      limit: 50,
      offset: 0,
    },
  });

  const reviews = (response.reviews || []).map(mapReview);

  return reviews
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getMyReviews(): Promise<Review[]> {
  const response = await apiRequest<ReviewsPayload>('/api/users/my-reviews', {
    method: 'GET',
    auth: true,
  });

  const reviews = (response.reviews || []).map(mapReview);

  return [...reviews].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function upsertReview(review: Review): Promise<void> {
  if (review.targetType !== 'product') {
    return;
  }

  if (review.orderId) {
    await apiRequest(`/api/products/${review.targetId}/reviews`, {
      method: 'POST',
      auth: true,
      body: {
        orderId: review.orderId,
        rating: review.rating,
        title: review.title,
        reviewText: review.comment,
        images: [],
      },
    });
    return;
  }

  await apiRequest(`/api/reviews/${review.id}`, {
    method: 'PUT',
    auth: true,
    body: {
      rating: review.rating,
      title: review.title,
      reviewText: review.comment,
      images: [],
    },
  });
}

export async function deleteReview(reviewId: string): Promise<void> {
  await apiRequest(`/api/reviews/${reviewId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function getReviewByOrder(
  orderId: string,
  targetType: ReviewTargetType,
  targetId: string,
): Promise<Review | null> {
  const reviews = await getMyReviews();

  return (
    reviews.find(
      (item) =>
        item.orderId === orderId && item.targetType === targetType && item.targetId === targetId,
    ) ?? null
  );
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const reviews = await getMyReviews();

  return reviews.find((item) => item.id === reviewId) ?? null;
}
