const crypto = require('crypto');
const environment = require('../config/environment');

const ALGORITHM = 'aes-256-cbc';

const getKey = () => {
  const secret = String(process.env.SECURE_FIELD_KEY || environment.jwtSecret || 'cityconnect-secure-field');
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptField = (value) => {
  if (!value) {
    return null;
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);

  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptField = (payload) => {
  if (!payload || typeof payload !== 'string' || !payload.includes(':')) {
    return null;
  }

  const [ivHex, encryptedHex] = payload.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
};

module.exports = {
  encryptField,
  decryptField,
};
