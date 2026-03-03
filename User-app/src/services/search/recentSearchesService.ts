import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';

const parseStored = (rawValue: string | null): string[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
};

export const getRecentSearches = async (): Promise<string[]> => {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
  return parseStored(stored).slice(0, 8);
};

export const addRecentSearch = async (query: string): Promise<void> => {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }

  const current = await getRecentSearches();
  const deduped = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  const next = [trimmed, ...deduped].slice(0, 8);

  await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(next));
};

export const clearRecentSearches = async (): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify([]));
};
