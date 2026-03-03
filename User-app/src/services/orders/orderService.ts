import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { Order } from '../../types/order';

const readOrders = async (): Promise<Order[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ORDERS);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Order[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

const writeOrders = async (orders: Order[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
};

export async function getOrders(): Promise<Order[]> {
  const orders = await readOrders();

  return [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const orders = await readOrders();

  return orders.find((item) => item.id === orderId) ?? null;
}

export async function createOrder(order: Order): Promise<void> {
  const existingOrders = await readOrders();
  const withoutCurrent = existingOrders.filter((item) => item.id !== order.id);

  await writeOrders([order, ...withoutCurrent]);
}

export async function updateOrder(order: Order): Promise<void> {
  const existingOrders = await readOrders();
  const hasExisting = existingOrders.some((item) => item.id === order.id);

  if (!hasExisting) {
    await writeOrders([order, ...existingOrders]);
    return;
  }

  await writeOrders(existingOrders.map((item) => (item.id === order.id ? order : item)));
}
