import { Address } from '../../types/address';
import { apiRequest } from '../api/httpClient';

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

type AddressesPayload = {
  addresses?: Array<{
    id: string;
    label: string;
    addressLine1: string;
    area: string;
    city: string;
    pincode: string;
    phone: string;
    isDefault?: boolean;
  }>;
};

const mapApiAddress = (address: NonNullable<AddressesPayload['addresses']>[number]): Address => ({
  id: String(address.id),
  name: String(address.label || 'Home'),
  fullName: String(address.label || 'Address'),
  phone: String(address.phone || ''),
  line1: String(address.addressLine1 || ''),
  line2: undefined,
  landmark: undefined,
  area: String(address.area || ''),
  city: String(address.city || ''),
  pincode: String(address.pincode || ''),
  isDefault: Boolean(address.isDefault),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export async function getAddresses(): Promise<Address[]> {
  const response = await apiRequest<AddressesPayload>('/api/users/addresses', {
    method: 'GET',
    auth: true,
  });

  const addresses = (response.addresses || []).map(mapApiAddress);
  return addresses.sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export async function saveAddress(address: Address): Promise<void> {
  const normalizedAddress = normalizeAddress(address);
  const payload = {
    label: String(normalizedAddress.name || 'home').toLowerCase(),
    addressLine1: normalizedAddress.line1,
    area: normalizedAddress.area || normalizedAddress.city,
    city: normalizedAddress.city,
    pincode: normalizedAddress.pincode,
    phone: normalizedAddress.phone,
    isDefault: normalizedAddress.isDefault,
  };

  const addresses = await getAddresses();
  const exists = addresses.some((item) => item.id === normalizedAddress.id);

  if (exists) {
    await apiRequest(`/api/users/addresses/${normalizedAddress.id}`, {
      method: 'PUT',
      body: payload,
      auth: true,
    });
  } else {
    await apiRequest('/api/users/addresses', {
      method: 'POST',
      body: payload,
      auth: true,
    });
  }
}

export async function deleteAddress(addressId: string): Promise<void> {
  await apiRequest(`/api/users/addresses/${addressId}`, {
    method: 'DELETE',
    auth: true,
  });
}

export async function setDefaultAddress(addressId: string): Promise<void> {
  await apiRequest(`/api/users/addresses/${addressId}/set-default`, {
    method: 'PATCH',
    auth: true,
  });
}

export async function getDefaultAddress(): Promise<Address | null> {
  const addresses = await getAddresses();
  const defaultAddress = addresses.find((item) => item.isDefault);

  if (defaultAddress) {
    return defaultAddress;
  }

  return addresses[0] ?? null;
}
