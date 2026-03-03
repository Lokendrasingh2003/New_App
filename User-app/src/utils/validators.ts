export const isValidIndianPhone = (phone: string): boolean => /^\d{10}$/.test(phone);

export const isValidOtp = (otp: string): boolean => /^\d{6}$/.test(otp);
