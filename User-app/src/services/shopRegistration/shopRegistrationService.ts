import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { ShopRegistrationDraft } from '../../types/shopRegistration';

const readSubmissions = async (): Promise<ShopRegistrationDraft[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.SHOP_REG_SUBMISSIONS);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ShopRegistrationDraft[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

const writeSubmissions = async (items: ShopRegistrationDraft[]) => {
  await AsyncStorage.setItem(STORAGE_KEYS.SHOP_REG_SUBMISSIONS, JSON.stringify(items));
};

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

export async function submitDraft(draft: ShopRegistrationDraft): Promise<void> {
  const submissions = await readSubmissions();
  const submittedDraft: ShopRegistrationDraft = {
    ...draft,
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  };

  const withoutCurrent = submissions.filter((item) => item.id !== draft.id);
  await writeSubmissions([submittedDraft, ...withoutCurrent]);
  await clearDraft();
}

export async function getSubmissions(): Promise<ShopRegistrationDraft[]> {
  const submissions = await readSubmissions();

  return [...submissions].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
