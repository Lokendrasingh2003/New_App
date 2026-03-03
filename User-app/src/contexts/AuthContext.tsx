import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '../constants/storage';

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  verifyOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
        if (storedToken) {
          setToken(storedToken);
        }
      } finally {
        setIsHydrated(true);
      }
    };

    loadToken();
  }, []);

  const verifyOtp = async (_otp: string) => {
    const mockToken = 'mock-user-token';
    setToken(mockToken);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, mockToken);
  };

  const logout = async () => {
    setToken(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  };

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      isHydrated,
      verifyOtp,
      logout,
    }),
    [token, isHydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
