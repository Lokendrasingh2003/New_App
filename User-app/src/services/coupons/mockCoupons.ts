export type CouponDiscountType = 'flat' | 'percent' | 'free_delivery';

export type MockCoupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscount?: number;
  minOrderValue?: number;
  cityId?: string;
  isActive: boolean;
  expiryDate: string;
};

export const mockCoupons: MockCoupon[] = [
  {
    id: 'coupon-flat50',
    code: 'FLAT50',
    title: 'Flat ₹50 off',
    description: 'Get instant ₹50 off on eligible carts.',
    discountType: 'flat',
    discountValue: 50,
    minOrderValue: 299,
    isActive: true,
    expiryDate: '2026-12-31T23:59:59.000Z',
  },
  {
    id: 'coupon-save10',
    code: 'SAVE10',
    title: '10% savings',
    description: 'Save 10% up to ₹80 on your order.',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 80,
    minOrderValue: 399,
    isActive: true,
    expiryDate: '2026-11-15T23:59:59.000Z',
  },
  {
    id: 'coupon-freedel',
    code: 'FREEDEL',
    title: 'Free delivery',
    description: 'No delivery charge above ₹199.',
    discountType: 'free_delivery',
    discountValue: 0,
    minOrderValue: 199,
    isActive: true,
    expiryDate: '2026-10-20T23:59:59.000Z',
  },
  {
    id: 'coupon-citygwl',
    code: 'GWL20',
    title: 'City special ₹20 off',
    description: 'Extra ₹20 off for Gwalior users.',
    discountType: 'flat',
    discountValue: 20,
    minOrderValue: 149,
    cityId: 'gwalior',
    isActive: true,
    expiryDate: '2026-09-30T23:59:59.000Z',
  },
  {
    id: 'coupon-fest15',
    code: 'FEST15',
    title: 'Festive 15% off',
    description: 'Save 15% up to ₹120 on festive shopping.',
    discountType: 'percent',
    discountValue: 15,
    maxDiscount: 120,
    minOrderValue: 599,
    isActive: true,
    expiryDate: '2026-12-05T23:59:59.000Z',
  },
  {
    id: 'coupon-old',
    code: 'OLD100',
    title: 'Expired coupon',
    description: 'Sample inactive coupon for state testing.',
    discountType: 'flat',
    discountValue: 100,
    minOrderValue: 499,
    isActive: false,
    expiryDate: '2025-01-01T00:00:00.000Z',
  },
];
