import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '../constants/storage';
import { City } from '../types/city';

type CityContextValue = {
  city: City | null;
  isHydrated: boolean;
  setCity: (nextCity: City) => Promise<void>;
  clearCity: () => Promise<void>;
};

const CityContext = createContext<CityContextValue | undefined>(undefined);

export function CityProvider({ children }: PropsWithChildren) {
  const [city, setCityState] = useState<City | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadCity = async () => {
      try {
        const cityJson = await AsyncStorage.getItem(STORAGE_KEYS.CITY);
        if (cityJson) {
          setCityState(JSON.parse(cityJson) as City);
        }
      } finally {
        setIsHydrated(true);
      }
    };

    loadCity();
  }, []);

  const setCity = async (nextCity: City) => {
    setCityState(nextCity);
    await AsyncStorage.setItem(STORAGE_KEYS.CITY, JSON.stringify(nextCity));
  };

  const clearCity = async () => {
    setCityState(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CITY);
  };

  const value = useMemo(
    () => ({
      city,
      isHydrated,
      setCity,
      clearCity,
    }),
    [city, isHydrated],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used inside CityProvider');
  }

  return context;
}
