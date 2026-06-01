import crypto from 'crypto';

const KEY_PASS = process.env.CRYPTO_KEY || 'PhantomC2!DefaultChangeMe_2026';
const SALT = 'PhantomC2Salt_v1';

function deriveKey() {
  return crypto.pbkdf2Sync(KEY_PASS, SALT, 120000, 32, 'sha256');
}

export function encrypt(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

export function decrypt(encoded) {
  const raw = Buffer.from(encoded.trim(), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final('utf8');
}
