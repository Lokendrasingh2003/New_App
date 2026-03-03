export type ReviewTargetType = 'shop' | 'product';

export type Review = {
  id: string;
  targetType: ReviewTargetType;
  targetId: string;
  orderId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
};
