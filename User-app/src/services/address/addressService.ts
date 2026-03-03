import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { Address } from '../../types/address';

const normalizeAddress = (address: Address): Address => ({
  ...address,
  name: address.name.trim(),
  fullName: address.fullName.trim(),
  phone: address.phone.trim(),
  line1: address.line1.trim(),
  line2: address.line2?.trim(),
  landmark: address.landmark?.trim(),
  area: address.area?.trim(),
  city: address.city.trim(),
  pincode: address.pincode.trim(),
});

const readAddresses = async (): Promise<Address[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.ADDRESSES);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as Address[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === 'string').map(normalizeAddress);
  } catch {
    return [];
  }
};

const writeAddresses = async (addresses: Address[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(addresses));
};

export async function getAddresses(): Promise<Address[]> {
  const addresses = await readAddresses();

  return [...addresses].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function saveAddress(address: Address): Promise<void> {
  const normalizedAddress = normalizeAddress(address);
  const existing = await readAddresses();
  const withoutCurrent = existing.filter((item) => item.id !== normalizedAddress.id);

  const nextAddresses = [normalizedAddress, ...withoutCurrent].map((item) =>
    normalizedAddress.isDefault ? { ...item, isDefault: item.id === normalizedAddress.id } : item,
  );

  const hasDefault = nextAddresses.some((item) => item.isDefault);

  if (!hasDefault && nextAddresses.length > 0) {
    nextAddresses[0] = { ...nextAddresses[0], isDefault: true };
  }

  await writeAddresses(nextAddresses);
}

export async function deleteAddress(addressId: string): Promise<void> {
  const existing = await readAddresses();
  const addressToDelete = existing.find((item) => item.id === addressId);
  const nextAddresses = existing.filter((item) => item.id !== addressId);

  if (addressToDelete?.isDefault && nextAddresses.length > 0) {
    nextAddresses[0] = { ...nextAddresses[0], isDefault: true };
  }

  await writeAddresses(nextAddresses);
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  const existing = await readAddresses();

  const nextAddresses = existing.map((item) => ({
    ...item,
    isDefault: item.id === addressId,
  }));

  await writeAddresses(nextAddresses);
}

export async function getDefaultAddress(): Promise<Address | null> {
  const addresses = await readAddresses();
  const defaultAddress = addresses.find((item) => item.isDefault);

  if (defaultAddress) {
    return defaultAddress;
  }

  return addresses[0] ?? null;
}
