#!/usr/bin/env node
/**
 * Phantom C2 — CLI Encryption Tool
 * ===================================
 * Encrypt/decrypt commands for stealth C2 operations.
 *
 * Usage:
 *   node tools/crypt.js encrypt "screenshot"
 *   node tools/crypt.js encrypt "shell ls -la"
 *   node tools/crypt.js decrypt "base64_blob_after_🔒"
 *   node tools/crypt.js c2 "screenshot"          ← outputs !c2 <encrypted>
 *
 * Set CRYPTO_KEY env var to override the default passphrase.
 */

import { encrypt, decrypt } from '../lib/crypto.js';

const [cmd, ...args] = process.argv.slice(2);
const input = args.join(' ');

if (!cmd || !input) {
  console.log(`
╔══════════════════════════════════════╗
║   Phantom C2 — Encryption Tool      ║
╚══════════════════════════════════════╝

Usage:
  node tools/crypt.js encrypt "<text>"     Encrypt plaintext
  node tools/crypt.js decrypt "<base64>"   Decrypt to plaintext
  node tools/crypt.js c2 "<command>"       Generate !c2 stealth command

Examples:
  node tools/crypt.js encrypt "screenshot"
  node tools/crypt.js decrypt "aB3dEf..."
  node tools/crypt.js c2 "shell ls -la"

Set CRYPTO_KEY env var for custom passphrase.
`);
  process.exit(1);
}

try {
  switch (cmd.toLowerCase()) {
    case 'encrypt': {
      const result = encrypt(input);
      console.log(`🔒 Encrypted:\n${result}`);
      break;
    }
    case 'decrypt': {
      const result = decrypt(input);
      console.log(`🔓 Decrypted:\n${result}`);
      break;
    }
    case 'c2': {
      const encrypted = encrypt(input);
      console.log(`🛡️ Stealth command for C2:\n!c2 ${encrypted}`);
      break;
    }
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }
} catch (e) {
  console.error(`❌ Error: ${e.message}`);
  process.exit(1);
}
