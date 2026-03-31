import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { STORAGE_KEYS } from '../constants/storage';
import { loginWithPassword as loginWithPasswordApi } from '../services/auth/authService';

type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  loginWithPassword: (phone: string, password: string) => Promise<void>;
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

  const loginWithPassword = async (phone: string, password: string) => {
    const response = await loginWithPasswordApi(phone, password);
    const nextToken = response.token;

    setToken(nextToken);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, nextToken);
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
      loginWithPassword,
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
