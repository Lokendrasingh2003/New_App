import { apiRequest } from '../api/httpClient';

export type ApiUserProfile = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  role?: 'USER' | 'SHOPKEEPER';
  shopkeeperId?: string | null;
  shopId?: string | null;
  canManageSellerDashboard?: boolean;
  addresses?: Array<{
    id?: string;
    label?: string;
    addressLine1?: string;
    area?: string;
    city?: string;
    pincode?: string;
    phone?: string;
    isDefault?: boolean;
  }>;
  createdAt?: string;
};

type ProfilePayload = {
  user?: ApiUserProfile;
};

export const getMyProfile = async (): Promise<ApiUserProfile | null> => {
  const data = await apiRequest<ProfilePayload>('/api/users/profile', {
    method: 'GET',
    auth: true,
  });

  return data.user || null;
};
