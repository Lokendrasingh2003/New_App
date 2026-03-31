import AsyncStorage from '@react-native-async-storage/async-storage';

import { env } from '../../config/env';
import { STORAGE_KEYS } from '../../constants/storage';
import { ShopRegistrationDraft } from '../../types/shopRegistration';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { apiRequest } from '../api/httpClient';

type UploadAssetType = 'SHOP_IMAGE' | 'BUSINESS_PROOF' | 'IDENTITY_PROOF';

type RegistrationPayload = {
  id: string;
  shopName: string;
  description?: string;
  categoryName?: string;
  cityId: string;
  phone: string;
  openingTime: string;
  closingTime: string;
  shopImageUrl?: string;
  addressLine1: string;
  area: string;
  pincode: string;
  gstNumber: string;
  businessProofUrl: string;
  identityProofUrl: string;
  accountHolderName?: string;
  ifscCode?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type ListRegistrationsResponse = {
  registrations?: RegistrationPayload[];
};

type SubmitRegistrationResponse = {
  registration?: RegistrationPayload;
};

const mapApiRegistration = (item: RegistrationPayload): ShopRegistrationDraft => ({
  id: String(item.id),
  status: item.status,
  shopName: String(item.shopName || ''),
  description: item.description || '',
  categoryId: '',
  categoryName: item.categoryName || '',
  phone: String(item.phone || ''),
  openingTime: String(item.openingTime || ''),
  closingTime: String(item.closingTime || ''),
  shopImageUrl: resolveMediaUrl(item.shopImageUrl) || '',
  cityId: String(item.cityId || ''),
  addressLine1: String(item.addressLine1 || ''),
  addressLine2: '',
  landmark: '',
  area: String(item.area || ''),
  pincode: String(item.pincode || ''),
  latitude: undefined,
  longitude: undefined,
  documents: {
    businessProofUri: resolveMediaUrl(item.businessProofUrl) || '',
    identityProofUri: resolveMediaUrl(item.identityProofUrl) || '',
    gstNumber: String(item.gstNumber || ''),
  },
  bank: {
    accountHolderName: String(item.accountHolderName || ''),
    accountNumber: '',
    ifsc: String(item.ifscCode || ''),
  },
  rejectionReason: item.rejectionReason || null,
  reviewedAt: item.reviewedAt || null,
  createdAt: item.createdAt || item.submittedAt || new Date().toISOString(),
  updatedAt: item.updatedAt || item.reviewedAt || new Date().toISOString(),
});

export async function getDraft(): Promise<ShopRegistrationDraft | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_REG_DRAFT);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ShopRegistrationDraft;

    if (!parsed || typeof parsed.id !== 'string') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function saveDraft(draft: ShopRegistrationDraft): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.SHOP_REG_DRAFT, JSON.stringify(draft));
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_REG_DRAFT);
}

const getBaseUrl = () => {
  const raw = String(env.apiBaseUrl || '').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
};

const guessMimeType = (uri: string) => {
  const lower = String(uri || '').toLowerCase();
  if (lower.endsWith('.png')) {
    return 'image/png';
  }
  if (lower.endsWith('.webp')) {
    return 'image/webp';
  }
  return 'image/jpeg';
};

export async function uploadRegistrationAsset(params: {
  assetType: UploadAssetType;
  uri: string;
  fileName?: string;
}): Promise<string> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not configured.');
  }

  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    throw new Error('Session expired. Please login again.');
  }

  const formData = new FormData();
  formData.append('assetType', params.assetType);
  formData.append('file', {
    uri: params.uri,
    name: params.fileName || `${params.assetType.toLowerCase()}-${Date.now()}.jpg`,
    type: guessMimeType(params.uri),
  } as unknown as Blob);

  const response = await fetch(`${baseUrl}/api/users/shop-registration/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as { message?: string; data?: { imageUrl?: string } }) : null;

  if (!response.ok) {
    throw new Error(parsed?.message || `Upload failed (${response.status})`);
  }

  const imageUrl = String(parsed?.data?.imageUrl || '').trim();
  if (!imageUrl) {
    throw new Error('Upload failed: image URL missing in response.');
  }

  return imageUrl;
}

export async function submitDraft(draft: ShopRegistrationDraft): Promise<string> {
  const response = await apiRequest<SubmitRegistrationResponse>('/api/users/shop-registration', {
    method: 'POST',
    auth: true,
    body: {
      shopName: draft.shopName,
      description: draft.description,
      categoryId: draft.categoryId,
      phone: draft.phone,
      openingTime: draft.openingTime,
      closingTime: draft.closingTime,
      shopImageUrl: draft.shopImageUrl,
      cityId: draft.cityId,
      addressLine1: draft.addressLine1,
      area: draft.area,
      pincode: draft.pincode,
      businessProofUrl: draft.documents.businessProofUri,
      identityProofUrl: draft.documents.identityProofUri,
      gstNumber: draft.documents.gstNumber,
      accountHolderName: draft.bank.accountHolderName,
      accountNumber: draft.bank.accountNumber,
      ifscCode: draft.bank.ifsc,
      latitude: draft.latitude,
      longitude: draft.longitude,
    },
  });

  if (!response.registration) {
    throw new Error('Failed to submit registration.');
  }

  await AsyncStorage.setItem(STORAGE_KEYS.SHOP_REG_SUBMISSIONS, JSON.stringify([mapApiRegistration(response.registration)]));
  await clearDraft();
  return String(response.registration.id);
}

export async function getSubmissions(): Promise<ShopRegistrationDraft[]> {
  try {
    const response = await apiRequest<ListRegistrationsResponse>('/api/users/shop-registration', {
      method: 'GET',
      auth: true,
    });

    const items = (response.registrations || []).map(mapApiRegistration);
    return items.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  } catch {
    return [];
  }
}
