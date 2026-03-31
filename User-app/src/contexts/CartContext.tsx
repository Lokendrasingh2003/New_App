import { Alert } from 'react-native';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { validateAndApplyCoupon, AppliedCoupon } from '../services/coupons/couponService';
import { apiRequest } from '../services/api/httpClient';
import { useAuth } from './AuthContext';
import { useCity } from './CityContext';

export type CartProduct = {
  id: string;
  backendProductId?: string;
  variantId?: string;
  name: string;
  price: number;
  mrp?: number;
  imageUrl?: string;
  image?: string;
  description?: string;
  brand?: string;
  unit?: string;
  inStock?: boolean;
  shopId?: string;
  subcategoryId?: string;
};

export type CartItem = {
  product: CartProduct;
  shopId: string;
  quantity: number;
};

type CartSummary = {
  itemCount: number;
  subtotal: number;
  totalMrp: number;
  savings: number;
};

type CartContextValue = {
  items: CartItem[];
  shopId?: string;
  itemCount: number;
  subtotal: number;
  totalMrp: number;
  savings: number;
  deliveryCharge: number;
  taxAmount: number;
  offerDiscountAmount: number;
  couponDiscountAmount: number;
  totalDiscountAmount: number;
  totalSavingsAmount: number;
  discountAmount: number;
  grandTotal: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  clearCoupon: () => void | Promise<void>;
  addItem: (product: CartProduct, shopId?: string) => void | Promise<void>;
  increment: (productId: string) => void | Promise<void>;
  decrement: (productId: string) => void | Promise<void>;
  getQuantity: (productId: string) => number;
  getItemQuantity: (productId: string) => number;
  updateQuantity: (productId: string, quantity: number) => void | Promise<void>;
  incrementQuantity: (productId: string) => void | Promise<void>;
  decrementQuantity: (productId: string) => void | Promise<void>;
  removeItem: (productId: string) => void | Promise<void>;
  clearCart: () => void | Promise<void>;
  cartId: string | null;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const BASE_DELIVERY_CHARGE = 25;

type ApiCart = {
  id: string | null;
  shopId: string | null;
  items: Array<{
    productId: string;
    productName: string;
    variantId?: string;
    variantLabel?: string;
    quantity: number;
    price: number;
    mrp?: number;
    image?: string | null;
  }>;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  tax: number;
  total: number;
  appliedCoupon?: {
    code?: string | null;
    discountAmount?: number;
  } | null;
  appliedOffer?: {
    offerId?: string | null;
    name?: string | null;
    type?: 'PERCENT' | 'FLAT' | null;
    value?: number;
    discountAmount?: number;
  } | null;
};

const getSummary = (items: CartItem[]): CartSummary => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalMrp = items.reduce(
    (sum, item) => sum + (item.product.mrp ?? item.product.price) * item.quantity,
    0,
  );

  return {
    itemCount,
    subtotal,
    totalMrp,
    savings: Math.max(totalMrp - subtotal, 0),
  };
};

const normalizeProduct = (product: CartProduct, defaultShopId?: string): CartProduct => ({
  ...product,
  mrp: product.mrp ?? product.price,
  imageUrl: product.imageUrl ?? product.image,
  shopId: product.shopId ?? defaultShopId,
});

const appendOrIncrement = (items: CartItem[], product: CartProduct, itemShopId: string) => {
  const existing = items.find((item: CartItem) => item.product.id === product.id);

  if (existing) {
    return items.map((item: CartItem) =>
      item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }

  return [...items, { product, shopId: itemShopId, quantity: 1 }];
};

export function CartProvider({ children }: PropsWithChildren) {
  const { city } = useCity();
  const { isAuthenticated } = useAuth();

  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);
  const [serverTotals, setServerTotals] = useState<{
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    tax: number;
    total: number;
    offerDiscount: number;
    couponDiscount: number;
  } | null>(null);

  const [lastAutoRemovedCouponCode, setLastAutoRemovedCouponCode] = useState<string | null>(null);

  const summary = useMemo(() => getSummary(items), [items]);
  const activeShopId = items[0]?.shopId;
  const baseDeliveryCharge = summary.itemCount > 0 ? BASE_DELIVERY_CHARGE : 0;

  const discountAmount = Math.max(appliedCoupon?.discountAmount ?? 0, 0);
  const offerDiscountAmount = Math.max(serverTotals?.offerDiscount ?? 0, 0);
  const couponDiscountAmount = Math.max(serverTotals?.couponDiscount ?? discountAmount, 0);
  const totalDiscountAmount = Math.max(serverTotals?.discount ?? offerDiscountAmount + couponDiscountAmount, 0);
  const taxAmount = Math.max(serverTotals?.tax ?? 0, 0);
  const totalSavingsAmount = Math.max(summary.savings + totalDiscountAmount, 0);
  const deliveryCharge = Math.max(serverTotals?.deliveryCharge ?? appliedCoupon?.finalDeliveryCharge ?? baseDeliveryCharge, 0);
  const grandTotal = Math.max(serverTotals?.total ?? summary.subtotal + deliveryCharge - discountAmount, 0);

  const syncFromApiCart = (cart: ApiCart | null) => {
    if (!cart || !Array.isArray(cart.items)) {
      setCartId(null);
      setItems([]);
      setAppliedCoupon(null);
      setServerTotals(null);
      return;
    }

    setCartId(cart.id || null);

    const mappedItems: CartItem[] = cart.items.map((item) => {
      const compositeId = `${item.productId}-${item.variantId || 'default'}`;
      return {
        shopId: String(cart.shopId || ''),
        quantity: Number(item.quantity || 0),
        product: {
          id: compositeId,
          backendProductId: String(item.productId),
          variantId: item.variantId,
          name: String(item.productName || 'Product'),
          unit: item.variantLabel,
          price: Number(item.price || 0),
          mrp: Number(item.mrp || item.price || 0),
          imageUrl: item.image || undefined,
          inStock: true,
          shopId: String(cart.shopId || ''),
        },
      };
    });

    setItems(mappedItems);
    setServerTotals({
      subtotal: Number(cart.subtotal || 0),
      discount: Number(cart.discount || 0),
      deliveryCharge: Number(cart.deliveryCharge || 0),
      tax: Number(cart.tax || 0),
      total: Number(cart.total || 0),
      offerDiscount: Number(cart.appliedOffer?.discountAmount || 0),
      couponDiscount: Number(cart.appliedCoupon?.discountAmount || 0),
    });

    if (cart.appliedCoupon?.code) {
      setAppliedCoupon({
        code: String(cart.appliedCoupon.code),
        discountAmount: Number(cart.appliedCoupon.discountAmount || 0),
        freeDeliveryApplied: false,
        finalDeliveryCharge: Number(cart.deliveryCharge || 0),
        finalTotal: Number(cart.total || 0),
        reason: 'Coupon discount applied',
        meta: {
          couponId: String(cart.appliedCoupon.code),
          title: String(cart.appliedCoupon.code),
          discountType: 'flat',
          discountValue: Number(cart.appliedCoupon.discountAmount || 0),
          cityId: city?.city_id,
        },
      });
    } else {
      setAppliedCoupon(null);
    }
  };

  const fetchCart = async () => {
    if (!isAuthenticated) {
      syncFromApiCart(null);
      return;
    }

    try {
      const response = await apiRequest<{ cart: ApiCart }>('/api/cart', {
        method: 'GET',
        auth: true,
      });
      syncFromApiCart(response.cart || null);
    } catch {
      // Keep UI functional with in-memory state if backend cart fetch fails.
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => {
    if (items.length === 0 && appliedCoupon) {
      setAppliedCoupon(null);
    }
  }, [appliedCoupon, items.length]);

  useEffect(() => {
    if (!appliedCoupon || summary.itemCount === 0) {
      return;
    }

    validateAndApplyCoupon({
      code: appliedCoupon.code,
      subtotal: summary.subtotal,
      deliveryCharge: baseDeliveryCharge,
      cityId: city?.city_id,
      shopId: activeShopId,
    }).then((result) => {
      if (result.ok) {
        return;
      }

      if (
        lastAutoRemovedCouponCode !== appliedCoupon.code &&
        (result.message || '').toLowerCase().includes('minimum order')
      ) {
        setLastAutoRemovedCouponCode(appliedCoupon.code);
        Alert.alert(
          'Coupon removed',
          'Coupon removed because cart total no longer meets minimum amount.',
        );
      }

      setAppliedCoupon(null);
    });
  }, [
    activeShopId,
    appliedCoupon,
    baseDeliveryCharge,
    city?.city_id,
    lastAutoRemovedCouponCode,
    summary.itemCount,
    summary.subtotal,
  ]);

  const addItem = async (product: CartProduct, shopId?: string) => {
    const targetShopId = shopId ?? product.shopId ?? activeShopId ?? 'default-shop';
    const normalizedProduct = normalizeProduct(product, targetShopId);

    const backendProductId = normalizedProduct.backendProductId;
    const variantId = normalizedProduct.variantId;

    if (isAuthenticated && backendProductId && variantId && targetShopId !== 'default-shop') {
      try {
        await apiRequest('/api/cart/add-item', {
          method: 'POST',
          auth: true,
          body: {
            shopId: targetShopId,
            productId: backendProductId,
            variantId,
            quantity: 1,
          },
        });

        await fetchCart();
        return;
      } catch {
        // Fallback to local behavior.
      }
    }

    if (activeShopId && activeShopId !== targetShopId && items.length > 0) {
      Alert.alert(
        'Replace cart items?',
        'Your cart has items from another shop. Clear cart to add this item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear & Add',
            onPress: () => {
              setServerTotals(null);
              setItems([{ product: normalizedProduct, shopId: targetShopId, quantity: 1 }]);
              setAppliedCoupon(null);
            },
          },
        ],
      );
      return;
    }

    setItems((previousItems: CartItem[]) =>
      appendOrIncrement(previousItems, normalizedProduct, targetShopId),
    );
    setServerTotals(null);
  };

  const applyCoupon = async (code: string) => {
    if (isAuthenticated) {
      try {
        const response = await apiRequest<{ cart: ApiCart }>('/api/cart/apply-coupon', {
          method: 'POST',
          auth: true,
          body: {
            couponCode: code.trim().toUpperCase(),
          },
        });
        syncFromApiCart(response.cart || null);
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : 'Unable to apply coupon.',
        };
      }
    } else {
      const result = await validateAndApplyCoupon({
        code,
        subtotal: summary.subtotal,
        deliveryCharge: baseDeliveryCharge,
        cityId: city?.city_id,
        shopId: activeShopId,
      });

      if (!result.ok) {
        return {
          ok: false,
          message: result.message,
        };
      }

      setAppliedCoupon(result.applied);
    }

    setLastAutoRemovedCouponCode(null);
    return { ok: true };
  };

  const clearCoupon = async () => {
    if (isAuthenticated) {
      try {
        await apiRequest('/api/cart/remove-coupon', {
          method: 'DELETE',
          auth: true,
          ignoreStatuses: [404],
        });
        await fetchCart();
        return;
      } catch {
        // Fall through to local cleanup.
      }
    }

    setAppliedCoupon(null);
  };

  const getQuantity = (productId: string) =>
    items.find((item: CartItem) => item.product.id === productId)?.quantity ?? 0;

  const getItemQuantity = getQuantity;

  const updateQuantity = async (productId: string, quantity: number) => {
    const item = items.find((entry: CartItem) => entry.product.id === productId);
    if (!item) {
      return;
    }

    if (isAuthenticated && item.product.backendProductId) {
      try {
        await apiRequest(`/api/cart/update-item/${item.product.backendProductId}`, {
          method: 'PUT',
          auth: true,
          body: {
            quantity: Math.max(quantity, 0),
            variantId: item.product.variantId,
          },
        });

        await fetchCart();
        return;
      } catch {
        // Fallback to local update.
      }
    }

    setItems((previousItems: CartItem[]) => {
      if (quantity <= 0) {
        return previousItems.filter((entry: CartItem) => entry.product.id !== productId);
      }

      return previousItems.map((entry: CartItem) =>
        entry.product.id === productId ? { ...entry, quantity } : entry,
      );
    });
    setServerTotals(null);
  };

  const increment = (productId: string) => {
    const current = getQuantity(productId);
    void updateQuantity(productId, current + 1);
  };

  const decrement = (productId: string) => {
    const current = getQuantity(productId);
    void updateQuantity(productId, Math.max(current - 1, 0));
  };

  const removeItem = (productId: string) => {
    void updateQuantity(productId, 0);
  };

  const incrementQuantity = increment;
  const decrementQuantity = decrement;

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await apiRequest('/api/cart/clear', {
          method: 'DELETE',
          auth: true,
        });
      } catch {
        // Keep local cleanup below.
      }
    }

    setItems([]);
    setAppliedCoupon(null);
    setCartId(null);
    setServerTotals(null);
  };

  const value: CartContextValue = {
    items,
    shopId: activeShopId,
    itemCount: summary.itemCount,
    subtotal: serverTotals?.subtotal ?? summary.subtotal,
    totalMrp: summary.totalMrp,
    savings: summary.savings,
    deliveryCharge,
    taxAmount,
    offerDiscountAmount,
    couponDiscountAmount,
    totalDiscountAmount,
    totalSavingsAmount,
    discountAmount,
    grandTotal,
    appliedCoupon,
    applyCoupon,
    clearCoupon,
    addItem,
    increment,
    decrement,
    getQuantity,
    getItemQuantity,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeItem,
    clearCart,
    cartId,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }

  return context;
}
