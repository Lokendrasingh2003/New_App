import { apiRequest } from '../api/httpClient';

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
  return apiRequest<LoginResponse>('/api/auth/login-password', {
    method: 'POST',
    body: { phone, password },
  });
};
