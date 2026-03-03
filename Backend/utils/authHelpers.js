const { logExternalServiceError } = require('./logger');

const generateOtp = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

const generateReferralCode = () => {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CC${randomPart}`;
};

const formatPhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }

  return digits;
};

const sendOtpSms = (phone, otp) => {
  try {
    console.log(`[SMS Placeholder] Sending OTP ${otp} to +91${phone}`);
  } catch (error) {
    logExternalServiceError({
      service: 'sms-provider',
      error,
      details: {
        phone: String(phone || ''),
      },
    });
    throw error;
  }
};

module.exports = {
  generateOtp,
  generateReferralCode,
  formatPhone,
  sendOtpSms,
};
