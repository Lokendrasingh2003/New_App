import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../constants/storage';
import { NearbyPreferences } from '../../types/location';

const DEFAULT_RADIUS: NearbyPreferences['radiusKm'] = 5;

const getDefaultPrefs = (): NearbyPreferences => ({
  enabled: true,
  radiusKm: DEFAULT_RADIUS,
  updatedAt: new Date().toISOString(),
});

export async function getNearbyPrefs(): Promise<NearbyPreferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.NEARBY_PREFS);

  if (!raw) {
    return getDefaultPrefs();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<NearbyPreferences>;

    const radius = parsed.radiusKm;
    const validRadius: NearbyPreferences['radiusKm'] = radius === 2 || radius === 10 ? radius : 5;

    return {
      enabled: Boolean(parsed.enabled ?? true),
      radiusKm: validRadius,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return getDefaultPrefs();
  }
}

export async function setNearbyPrefs(prefs: NearbyPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.NEARBY_PREFS, JSON.stringify(prefs));
}

export async function resetNearbyPrefs(): Promise<void> {
  await setNearbyPrefs(getDefaultPrefs());
}
