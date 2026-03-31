export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  unit?: string;
  quantity: number;
  price: number;
  mrp?: number;
  imageUrl?: string;
};

export type Order = {
  id: string;
  createdAt: string;
  updatedAt: string;
  cityId?: string;
  shopId?: string;
  status: OrderStatus;
  items: OrderItem[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  couponCode?: string | null;
  discountAmount: number;
  total: number;
  addressSnapshot: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    landmark?: string;
    area?: string;
    city: string;
    pincode: string;
    name?: string;
  };
  payment: {
    method?: 'upi' | 'card' | 'netbanking' | 'wallet' | 'cod';
    status: 'unpaid' | 'paid' | 'failed';
  };
};
