require('../helpers/envSetup');

const { userSchemas } = require('../../utils/validators');

describe('User validators', () => {
  test('addressIdParam validates a valid address id', () => {
    const value = { addressId: 'addr-123456' };
    const { error } = userSchemas.addressIdParam.validate(value);
    expect(error).toBeUndefined();
  });

  test('addressIdParam rejects invalid short address id', () => {
    const value = { addressId: 'a1' };
    const { error } = userSchemas.addressIdParam.validate(value);
    expect(error).toBeDefined();
  });

  test('createAddress validates required fields', () => {
    const payload = {
      label: 'home',
      addressLine1: 'Street 1',
      area: 'Andheri',
      city: 'Mumbai',
      pincode: '400001',
      phone: '9999999990',
    };

    const { error } = userSchemas.createAddress.validate(payload);
    expect(error).toBeUndefined();
  });
});
