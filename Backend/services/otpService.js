const { OTP_EXPIRY_MINUTES, OTP_MAX_ATTEMPTS, OTP_ATTEMPT_WINDOW_MINUTES } = require('../config/constants');
const { generateOtp, sendOtpSms } = require('../utils/authHelpers');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const sendOtpAttempts = new Map();
const verifyOtpAttempts = new Map();

const getWindowMs = () => OTP_ATTEMPT_WINDOW_MINUTES * 60 * 1000;

const isWindowExpired = (windowStartedAt) => {
  return Date.now() - windowStartedAt > getWindowMs();
};

const assertAttemptLimit = (bucket, phone) => {
  const entry = bucket.get(phone);

  if (!entry) {
    return;
  }

  if (isWindowExpired(entry.windowStartedAt)) {
    bucket.delete(phone);
    return;
  }

  if (entry.count >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'Too many attempts. Please try again later.',
      ERROR_CODES.OTP_ATTEMPT_LIMIT_REACHED
    );
  }
};

const registerAttempt = (bucket, phone) => {
  const entry = bucket.get(phone);

  if (!entry || isWindowExpired(entry.windowStartedAt)) {
    bucket.set(phone, {
      count: 1,
      windowStartedAt: Date.now(),
    });
    return;
  }

  entry.count += 1;
  bucket.set(phone, entry);
};

const clearAttempts = (bucket, phone) => {
  bucket.delete(phone);
};

const createOtpPayload = (phone) => {
  assertAttemptLimit(sendOtpAttempts, phone);
  registerAttempt(sendOtpAttempts, phone);

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  sendOtpSms(phone, otp);

  return {
    otp,
    otpExpiresAt,
    expiresIn: OTP_EXPIRY_MINUTES * 60,
  };
};

const assertVerifyAttemptLimit = (phone) => {
  assertAttemptLimit(verifyOtpAttempts, phone);
};

const registerFailedVerifyAttempt = (phone) => {
  registerAttempt(verifyOtpAttempts, phone);
};

const clearVerifyAttempts = (phone) => {
  clearAttempts(verifyOtpAttempts, phone);
};

module.exports = {
  createOtpPayload,
  assertVerifyAttemptLimit,
  registerFailedVerifyAttempt,
  clearVerifyAttempts,
};
