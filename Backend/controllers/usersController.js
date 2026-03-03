const User = require('../models/User');
const { sendSuccess } = require('../utils/response');
const ApiError = require('../utils/apiError');
const { HTTP_STATUS, ERROR_CODES, USER_MAX_ADDRESSES } = require('../config/constants');

const sanitizeUser = (user) => ({
  id: user._id,
  phone: user.phone,
  isVerified: user.isVerified,
  name: user.name,
  email: user.email,
  profileImage: user.profileImage,
  addresses: user.addresses,
  savedPaymentMethods: user.savedPaymentMethods,
  referralCode: user.referralCode,
  referredBy: user.referredBy,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const findUserByAuthId = async (authUserId) => {
  const user = await User.findById(authUserId);

  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'User not found.', ERROR_CODES.USER_NOT_FOUND);
  }

  return user;
};

const createAddressId = () => {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const ensureSingleDefaultAddress = (addresses, targetAddressId) => {
  return addresses.map((address) => ({
    ...address,
    isDefault: String(address.id) === String(targetAddressId),
  }));
};

const getProfile = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Profile fetched successfully.',
    data: {
      user: sanitizeUser(user),
    },
  });
};

const updateProfile = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);

  const { name, email, profileImage } = req.body;

  if (name !== undefined) {
    user.name = name || null;
  }

  if (email !== undefined) {
    user.email = email || null;
  }

  if (profileImage !== undefined) {
    user.profileImage = profileImage || null;
  }

  await user.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Profile updated successfully.',
    data: {
      user: sanitizeUser(user),
    },
  });
};

const deleteProfile = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);

  await user.deleteOne();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Profile deleted successfully.',
    data: {},
  });
};

const getAddresses = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Addresses fetched successfully.',
    data: {
      addresses: user.addresses,
    },
  });
};

const addAddress = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);

  if (user.addresses.length >= USER_MAX_ADDRESSES) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      `Maximum ${USER_MAX_ADDRESSES} addresses allowed.`,
      ERROR_CODES.MAX_ADDRESSES_REACHED
    );
  }

  const nextAddress = {
    id: createAddressId(),
    userId: user._id.toString(),
    label: req.body.label,
    addressLine1: req.body.addressLine1,
    area: req.body.area,
    city: req.body.city,
    pincode: req.body.pincode,
    phone: req.body.phone,
    isDefault: user.addresses.length === 0,
  };

  user.addresses.push(nextAddress);
  await user.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.CREATED,
    message: 'Address added successfully.',
    data: {
      address: nextAddress,
    },
  });
};

const updateAddress = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);
  const { addressId } = req.params;

  const index = user.addresses.findIndex((address) => String(address.id) === String(addressId));

  if (index < 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  const existing = user.addresses[index];
  const existingOwnerId = existing.userId || user._id.toString();

  if (String(existingOwnerId) !== String(user._id)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  const existingPlain = typeof existing.toObject === 'function' ? existing.toObject() : existing;

  user.addresses[index] = {
    ...existingPlain,
    id: existing.id,
    userId: existingOwnerId,
    label: req.body.label,
    addressLine1: req.body.addressLine1,
    area: req.body.area,
    city: req.body.city,
    pincode: req.body.pincode,
    phone: req.body.phone,
    isDefault: Boolean(req.body.isDefault),
  };

  if (user.addresses[index].isDefault) {
    user.addresses = ensureSingleDefaultAddress(user.addresses, user.addresses[index].id);
  } else if (!user.addresses.some((address) => address.isDefault)) {
    user.addresses = ensureSingleDefaultAddress(user.addresses, user.addresses[index].id);
  }

  await user.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Address updated successfully.',
    data: {
      address: user.addresses.find((address) => String(address.id) === String(addressId)),
    },
  });
};

const deleteAddress = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);
  const { addressId } = req.params;

  const existing = user.addresses.find((address) => String(address.id) === String(addressId));

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  if (String(existing.userId || user._id.toString()) !== String(user._id)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  if (user.addresses.length === 1) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      'Cannot delete the only address.',
      ERROR_CODES.LAST_ADDRESS_DELETE_BLOCKED
    );
  }

  user.addresses = user.addresses.filter((address) => String(address.id) !== String(addressId));

  if (!user.addresses.some((address) => address.isDefault)) {
    user.addresses = ensureSingleDefaultAddress(user.addresses, user.addresses[0].id);
  }

  await user.save();

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Address deleted successfully.',
    data: {},
  });
};

const setDefaultAddress = async (req, res) => {
  const user = await findUserByAuthId(req.user.id);
  const { addressId } = req.params;

  const existing = user.addresses.find((address) => String(address.id) === String(addressId));

  if (!existing) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  if (String(existing.userId || user._id.toString()) !== String(user._id)) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Address not found.', ERROR_CODES.ADDRESS_NOT_FOUND);
  }

  user.addresses = ensureSingleDefaultAddress(user.addresses, addressId);
  await user.save();

  const address = user.addresses.find((item) => String(item.id) === String(addressId));

  return sendSuccess(res, {
    statusCode: HTTP_STATUS.OK,
    message: 'Default address updated successfully.',
    data: {
      address,
    },
  });
};

module.exports = {
  getProfile,
  updateProfile,
  deleteProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
