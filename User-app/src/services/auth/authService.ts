import { apiRequest } from '../api/httpClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../constants/storage';

type SendOtpResponse = {
  expiresIn?: number;
};

type VerifyOtpResponse = {
  success?: boolean;
};

type LoginResponse = {
  token: string;
  refreshToken?: string;
};

type OtpPurpose = 'REGISTER' | 'RESET_PASSWORD';

export const sendOtp = async (phone: string, purpose: OtpPurpose): Promise<SendOtpResponse> => {
  return apiRequest<SendOtpResponse>('/api/auth/send-otp', {
    method: 'POST',
    body: { phone, purpose },
  });
};

export const verifyOtp = async (payload: {
  phone: string;
  otp: string;
  purpose: OtpPurpose;
  name?: string;
  password?: string;
  newPassword?: string;
}): Promise<VerifyOtpResponse> => {
  return apiRequest<VerifyOtpResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: payload,
  });
};


export const loginWithPassword = async (phone: string, password: string): Promise<LoginResponse> => {
  const response = await apiRequest<LoginResponse>('/api/auth/login-password', {
    method: 'POST',
    body: { phone, password },
  });
  if (response.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
  }
  if (response.refreshToken) {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
  }
  return response;
};

export const refreshSession = async (): Promise<LoginResponse> => {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) throw new Error('No refresh token');
  const response = await apiRequest<LoginResponse>('/api/auth/refresh-token', {
    method: 'POST',
    body: { refreshToken },
    auth: false,
  });
  if (response.token) {
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
  }
  if (response.refreshToken) {
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
  }
  return response;
};
