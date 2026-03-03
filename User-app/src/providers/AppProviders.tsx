import { PropsWithChildren } from 'react';

import { AuthProvider } from '../contexts/AuthContext';
import { CartProvider } from '../contexts/CartContext';
import { CityProvider } from '../contexts/CityContext';
import { ConfigProvider } from '../contexts/ConfigContext';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ConfigProvider>
      <AuthProvider>
        <CityProvider>
          <CartProvider>{children}</CartProvider>
        </CityProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}
