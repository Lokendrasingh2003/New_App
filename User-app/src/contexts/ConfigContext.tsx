import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { env } from '../config/env';

type ConfigContextValue = {
  apiBaseUrl: string;
};

const ConfigContext = createContext<ConfigContextValue | undefined>(undefined);

export function ConfigProvider({ children }: PropsWithChildren) {
  const value = useMemo(
    () => ({
      apiBaseUrl: env.apiBaseUrl,
    }),
    [],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used inside ConfigProvider');
  }

  return context;
}
