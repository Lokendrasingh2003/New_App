import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { STORAGE_KEYS } from '../constants/storage';
import { validateAndApplyCoupon, AppliedCoupon } from '../services/coupons/couponService';
import { useCity } from './CityContext';

export type CartProduct = {
  id: string;
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
  discountAmount: number;
  grandTotal: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  clearCoupon: () => void;
  addItem: (product: CartProduct, shopId?: string) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  getQuantity: (productId: string) => number;
  getItemQuantity: (productId: string) => number;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const BASE_DELIVERY_CHARGE = 25;

const getSummary = (items: CartItem[]): CartSummary => {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalMrp = items.reduce(
    (sum, item) => sum + (item.product.mrp ?? item.product.price) * item.quantity,
    0,
  );
  const savings = Math.max(totalMrp - subtotal, 0);

  return {
    itemCount,
    subtotal,
    totalMrp,
    savings,
  };
};

const normalizeProduct = (product: CartProduct, defaultShopId?: string): CartProduct => ({
  ...product,
  mrp: product.mrp ?? product.price,
  imageUrl: product.imageUrl ?? product.image,
  shopId: product.shopId ?? defaultShopId,
});

const isSameAppliedCoupon = (left: AppliedCoupon, right: AppliedCoupon) => {
  return (
    left.code === right.code &&
    left.discountAmount === right.discountAmount &&
    left.freeDeliveryApplied === right.freeDeliveryApplied &&
    left.finalDeliveryCharge === right.finalDeliveryCharge &&
    left.finalTotal === right.finalTotal &&
    left.reason === right.reason &&
    left.meta.couponId === right.meta.couponId &&
    left.meta.title === right.meta.title &&
    left.meta.discountType === right.meta.discountType &&
    left.meta.discountValue === right.meta.discountValue &&
    left.meta.minOrderValue === right.meta.minOrderValue &&
    left.meta.maxDiscount === right.meta.maxDiscount &&
    left.meta.cityId === right.meta.cityId
  );
};

const appendOrIncrement = (items: CartItem[], product: CartProduct, itemShopId: string) => {
  const existing = items.find((item) => item.product.id === product.id);

  if (existing) {
    return items.map((item) =>
      item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }

  return [...items, { product, shopId: itemShopId, quantity: 1 }];
};

export function CartProvider({ children }: PropsWithChildren) {
  const { city } = useCity();

  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  const previousSubtotalRef = useRef<number | null>(null);
  const lastAutoRemovedCouponRef = useRef<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [rawCart, rawCoupon] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CART),
          AsyncStorage.getItem(STORAGE_KEYS.CART_COUPON),
        ]);

        if (rawCart) {
          const parsedCart = JSON.parse(rawCart) as CartItem[];

          if (Array.isArray(parsedCart)) {
            setItems(
              parsedCart
                .filter(
                  (item) =>
                    item &&
                    item.product &&
                    typeof item.product.id === 'string' &&
                    typeof item.product.name === 'string',
                )
                .map((item) => ({
                  ...item,
                  product: normalizeProduct(item.product, item.shopId),
                })),
            );
          }
        }

        if (rawCoupon) {
          const parsedCoupon = JSON.parse(rawCoupon) as AppliedCoupon;
          if (parsedCoupon && typeof parsedCoupon.code === 'string') {
            setAppliedCoupon(parsedCoupon);
          }
        }
      } catch {
        setItems([]);
        setAppliedCoupon(null);
      } finally {
        setIsHydrated(true);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(items));
  }, [isHydrated, items]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (appliedCoupon) {
      AsyncStorage.setItem(STORAGE_KEYS.CART_COUPON, JSON.stringify(appliedCoupon));
      return;
    }

    AsyncStorage.removeItem(STORAGE_KEYS.CART_COUPON);
  }, [appliedCoupon, isHydrated]);

  const summary = useMemo(() => getSummary(items), [items]);
  const activeShopId = items[0]?.shopId;
  const baseDeliveryCharge = summary.itemCount > 0 ? BASE_DELIVERY_CHARGE : 0;

  const discountAmount = Math.max(appliedCoupon?.discountAmount ?? 0, 0);
  const deliveryCharge = Math.max(appliedCoupon?.finalDeliveryCharge ?? baseDeliveryCharge, 0);
  const grandTotal = Math.max(summary.subtotal + deliveryCharge - discountAmount, 0);

  useEffect(() => {
    if (items.length === 0 && appliedCoupon) {
      setAppliedCoupon(null);
    }
  }, [appliedCoupon, items.length]);

  useEffect(() => {
    const previousSubtotal = previousSubtotalRef.current;
    const subtotalChanged =
      typeof previousSubtotal === 'number' && previousSubtotal !== summary.subtotal;
    previousSubtotalRef.current = summary.subtotal;

    if (!appliedCoupon || summary.itemCount === 0) {
      return;
    }

    const result = validateAndApplyCoupon({
      code: appliedCoupon.code,
      subtotal: summary.subtotal,
      deliveryCharge: baseDeliveryCharge,
      cityId: city?.city_id,
    });

    if (result.ok) {
      setAppliedCoupon((previousCoupon) => {
        if (!previousCoupon) {
          return result.applied;
        }

        return isSameAppliedCoupon(previousCoupon, result.applied)
          ? previousCoupon
          : result.applied;
      });
      return;
    }

    const removedCode = appliedCoupon.code;
    setAppliedCoupon(null);

    if (
      subtotalChanged &&
      lastAutoRemovedCouponRef.current !== removedCode &&
      result.message.toLowerCase().includes('minimum order')
    ) {
      lastAutoRemovedCouponRef.current = removedCode;
      Alert.alert(
        'Coupon removed',
        'Coupon removed because cart total no longer meets minimum amount.',
      );
    }
  }, [appliedCoupon, baseDeliveryCharge, city?.city_id, summary.itemCount, summary.subtotal]);

  const addItem = (product: CartProduct, shopId?: string) => {
    const targetShopId = shopId ?? product.shopId ?? activeShopId ?? 'default-shop';
    const normalizedProduct = normalizeProduct(product, targetShopId);

    if (activeShopId && activeShopId !== targetShopId && items.length > 0) {
      Alert.alert(
        'Replace cart items?',
        'Your cart has items from another shop. Clear cart to add this item?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Clear & Add',
            onPress: () => {
              setItems([{ product: normalizedProduct, shopId: targetShopId, quantity: 1 }]);
              setAppliedCoupon(null);
            },
          },
        ],
      );
      return;
    }

    setItems((previousItems) => appendOrIncrement(previousItems, normalizedProduct, targetShopId));
  };

  const applyCoupon = async (code: string) => {
    const result = validateAndApplyCoupon({
      code,
      subtotal: summary.subtotal,
      deliveryCharge: baseDeliveryCharge,
      cityId: city?.city_id,
    });

    if (!result.ok) {
      return {
        ok: false,
        message: result.message,
      };
    }

    setAppliedCoupon(result.applied);
    lastAutoRemovedCouponRef.current = null;
    return { ok: true };
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
  };

  const getQuantity = (productId: string) =>
    items.find((item) => item.product.id === productId)?.quantity ?? 0;

  const getItemQuantity = getQuantity;

  const updateQuantity = (productId: string, quantity: number) => {
    setItems((previousItems) => {
      if (quantity <= 0) {
        return previousItems.filter((item) => item.product.id !== productId);
      }

      const existing = previousItems.find((item) => item.product.id === productId);
      if (!existing) {
        return previousItems;
      }

      return previousItems.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      );
    });
  };

  const increment = (productId: string) => {
    setItems((previousItems) =>
      previousItems.map((item) =>
        item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  };

  const decrement = (productId: string) => {
    setItems((previousItems) =>
      previousItems
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (productId: string) => {
    setItems((previousItems) => previousItems.filter((item) => item.product.id !== productId));
  };

  const incrementQuantity = increment;
  const decrementQuantity = decrement;

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const value: CartContextValue = {
    items,
    shopId: activeShopId,
    itemCount: summary.itemCount,
    subtotal: summary.subtotal,
    totalMrp: summary.totalMrp,
    savings: summary.savings,
    deliveryCharge,
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
