import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { HomeConfigResponse } from '../../types/homeConfig';
import { mockHomeConfig } from './mockHomeConfig';

type GetHomeConfigOptions = {
  forceRefresh?: boolean;
};

const parseHomeConfig = (rawValue: string): HomeConfigResponse | null => {
  try {
    const parsed = JSON.parse(rawValue) as HomeConfigResponse;
    if (parsed && typeof parsed.version === 'number' && Array.isArray(parsed.blocks)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const getHomeConfig = async (
  options: GetHomeConfigOptions = {},
): Promise<HomeConfigResponse> => {
  const { forceRefresh = false } = options;

  if (!forceRefresh) {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.HOME_CONFIG_CACHE);
    if (cached) {
      const parsed = parseHomeConfig(cached);
      if (parsed && parsed.version === mockHomeConfig.version) {
        return parsed;
      }
    }
  }

  await AsyncStorage.setItem(STORAGE_KEYS.HOME_CONFIG_CACHE, JSON.stringify(mockHomeConfig));
  return mockHomeConfig;
};
