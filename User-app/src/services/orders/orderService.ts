import { Order } from '../../types/order';
import { apiRequest } from '../api/httpClient';

type OrderListPayload = {
  orders?: Array<{
    orderId: string;
    shopId: string;
    status: string;
    pricing?: {
      subtotal?: number;
      discount?: number;
      deliveryCharge?: number;
      total?: number;
    };
    payment?: {
      status?: string;
      mode?: string;
    };
    itemCount?: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

type OrderDetailPayload = {
  order?: {
    orderId: string;
    shopId: string;
    status: string;
    items?: Array<{
      productId: string;
      productName: string;
      variantId?: string;
      variantLabel?: string;
      quantity: number;
      price: number;
      image?: string | null;
    }>;
    deliveryAddress?: {
      addressLine1?: string;
      area?: string;
      city?: string;
      pincode?: string;
      phone?: string;
    };
    pricing?: {
      subtotal?: number;
      discount?: number;
      deliveryCharge?: number;
      total?: number;
    };
    payment?: {
      mode?: string;
      status?: string;
    };
    appliedCoupon?: {
      code?: string | null;
    };
    createdAt: string;
    updatedAt: string;
  };
};

const mapStatus = (status: string): Order['status'] => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'CANCELLED') return 'cancelled';
  if (normalized === 'DELIVERED') return 'delivered';
  if (normalized === 'DISPATCHED') return 'out_for_delivery';
  if (normalized === 'PREPARING') return 'preparing';
  if (normalized === 'ACCEPTED') return 'accepted';
  return 'confirmed';
};

const mapPaymentStatus = (status: string): Order['payment']['status'] => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'SUCCESS') return 'paid';
  if (normalized === 'FAILED') return 'failed';
  return 'unpaid';
};

const mapOrder = (order: NonNullable<OrderDetailPayload['order']>): Order => ({
  id: String(order.orderId),
  createdAt: String(order.createdAt),
  updatedAt: String(order.updatedAt),
  shopId: String(order.shopId || ''),
  status: mapStatus(order.status),
  items: (order.items || []).map((item) => ({
    id: `${item.productId}-${item.variantId || 'default'}`,
    productId: String(item.productId),
    name: String(item.productName),
    unit: item.variantLabel,
    quantity: Number(item.quantity || 0),
    price: Number(item.price || 0),
    imageUrl: item.image || undefined,
  })),
  itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  subtotal: Number(order.pricing?.subtotal || 0),
  deliveryCharge: Number(order.pricing?.deliveryCharge || 0),
  couponCode: order.appliedCoupon?.code || null,
  discountAmount: Number(order.pricing?.discount || 0),
  total: Number(order.pricing?.total || 0),
  addressSnapshot: {
    fullName: 'Customer',
    phone: String(order.deliveryAddress?.phone || ''),
    line1: String(order.deliveryAddress?.addressLine1 || ''),
    area: order.deliveryAddress?.area,
    city: String(order.deliveryAddress?.city || ''),
    pincode: String(order.deliveryAddress?.pincode || ''),
  },
  payment: {
    method: String(order.payment?.mode || '').toLowerCase() as Order['payment']['method'],
    status: mapPaymentStatus(String(order.payment?.status || '')),
  },
});

export async function getOrders(): Promise<Order[]> {
  const response = await apiRequest<OrderListPayload>('/api/orders', {
    method: 'GET',
    auth: true,
    query: {
      limit: 100,
      offset: 0,
    },
  });

  const summaries = response.orders || [];
  const details = await Promise.all(
    summaries.map(async (summary) => {
      try {
        return await getOrderById(String(summary.orderId));
      } catch {
        return null;
      }
    }),
  );

  return details.filter((item): item is Order => Boolean(item));
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const response = await apiRequest<OrderDetailPayload>(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: 'GET',
    auth: true,
  });

  return response.order ? mapOrder(response.order) : null;
}

export async function createOrder(order: Order): Promise<void> {
  // Checkout now creates order directly through checkout flow API.
  // This function remains for compatibility and no-op behavior.
  void order;
}

export async function updateOrder(order: Order): Promise<void> {
  if (order.status === 'cancelled' || order.status === 'refunded') {
    await apiRequest(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
      method: 'POST',
      auth: true,
      body: {
        reason: order.status === 'refunded' ? 'Cancelled and refunded by user' : 'Cancelled by user',
      },
    });
    return;
  }
}
