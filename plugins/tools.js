import axios from 'axios';
import dns from 'dns/promises';

export default {
  name: 'tools',
  commands: ['ip', 'whois', 'dns', 'geoip', 'shorten', 'weather'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args } = ctx;

    switch (cmd) {
      case 'ip': {
        const target = args || (await axios.get('https://api.ipify.org?format=json').then(r => r.data.ip).catch(() => ''));
        try {
          const { data } = await axios.get(`http://ip-api.com/json/${target}?fields=status,message,country,regionName,city,zip,lat,lon,isp,org,as,query,timezone,mobile,proxy,hosting`, { timeout: 5000 });
          if (data.status === 'fail') {
            await sock.sendMessage(jid, { text: `❌ IP lookup failed: ${data.message || 'Invalid address'}` });
          } else {
            await sock.sendMessage(jid, {
              text: `🌐 *IP LOOKUP*\n━━━━━━━━━━━━━━━━━━━━━\n📍 IP: \`${data.query}\`\n🌍 Country: ${data.country}\n🏙️ City: ${data.city}, ${data.regionName}\n📮 ZIP: ${data.zip || 'N/A'}\n📡 ISP: ${data.isp}\n🏢 Org: ${data.org}\n🔢 ASN: ${data.as || 'N/A'}\n🌐 Timezone: ${data.timezone}\n📱 Mobile: ${data.mobile ? 'Yes' : 'No'}\n🕵️ Proxy: ${data.proxy ? 'Yes' : 'No'}\n☁️ Hosting: ${data.hosting ? 'Yes' : 'No'}\n📍 Lat/Lon: ${data.lat}, ${data.lon}\n━━━━━━━━━━━━━━━━━━━━━`
            });
          }
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ IP lookup error: ${e.message}` });
        }
        break;
      }

      case 'geoip': {
        try {
          const { data } = await axios.get('http://ip-api.com/json/?fields=status,country,regionName,city,zip,lat,lon,isp,query', { timeout: 5000 });
          await sock.sendMessage(jid, {
            text: `📍 *YOUR GEO INFO*\n━━━━━━━━━━━━━━━━━━━━━\nIP: \`${data.query}\`\nCountry: ${data.country}\nRegion: ${data.regionName}\nCity: ${data.city}\nZIP: ${data.zip || 'N/A'}\nISP: ${data.isp}\nLat/Lon: ${data.lat}, ${data.lon}\n━━━━━━━━━━━━━━━━━━━━━`
          });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ GeoIP error: ${e.message}` });
        }
        break;
      }

      case 'dns': {
        if (!args) {
          await sock.sendMessage(jid, { text: 'Usage: `!dns <domain>`\nExample: `!dns google.com`' });
          break;
        }
        try {
          const [a, aaaa, mx, ns, txt] = await Promise.allSettled([
            dns.resolve4(args), dns.resolve6(args), dns.resolveMx(args),
            dns.resolveNs(args), dns.resolveTxt(args)
          ]);
          await sock.sendMessage(jid, {
            text: `📡 *DNS Records: ${args}*\n━━━━━━━━━━━━━━━━━━━━━\n🅰️ A: ${a.status === 'fulfilled' ? a.value.join(', ') || 'None' : 'Error'}\n🅰️ AAAA: ${aaaa.status === 'fulfilled' ? aaaa.value.join(', ') || 'None' : 'Error'}\n📧 MX: ${mx.status === 'fulfilled' ? mx.value.map(m => `${m.exchange} (prio ${m.priority})`).join('\n       ') || 'None' : 'Error'}\n🌐 NS: ${ns.status === 'fulfilled' ? ns.value.join(', ') || 'None' : 'Error'}\n📝 TXT: ${txt.status === 'fulfilled' ? txt.value.flat().join(', ').slice(0, 200) || 'None' : 'Error'}\n━━━━━━━━━━━━━━━━━━━━━`
          });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ DNS lookup error: ${e.message}` });
        }
        break;
      }

      case 'whois': {
        if (!args) {
          await sock.sendMessage(jid, { text: 'Usage: `!whois <domain>`\nExample: `!whois google.com`' });
          break;
        }
        try {
          const { data } = await axios.get(`https://whois.freeaPI.dev/?domain=${args}`, { timeout: 8000 });
          const info = [
            `Domain: ${data.domain || args}`,
            `Registrar: ${data.registrar || 'N/A'}`,
            `Created: ${data.createdDate || 'N/A'}`,
            `Expires: ${data.expiresDate || 'N/A'}`,
            `Updated: ${data.updatedDate || 'N/A'}`,
            `Name Servers: ${(data.nameServers || []).join(', ') || 'N/A'}`
          ].join('\n');
          await sock.sendMessage(jid, { text: `🔍 *WHOIS: ${args}*\n━━━━━━━━━━━━━━━━━━━━━\n${info}\n━━━━━━━━━━━━━━━━━━━━━` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Whois error: ${e.message}` });
        }
        break;
      }

      case 'shorten': {
        if (!args) {
          await sock.sendMessage(jid, { text: 'Usage: `!shorten <url>`\nExample: `!shorten https://example.com`' });
          break;
        }
        try {
          const { data } = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(args)}`, { timeout: 5000 });
          await sock.sendMessage(jid, { text: `🔗 *URL Shortened*\n━━━━━━━━━━━━━━━━━━━━━\nOriginal: ${args}\nShort: ${data.trim()}\n━━━━━━━━━━━━━━━━━━━━━` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Shorten error: ${e.message}` });
        }
        break;
      }

      case 'weather': {
        if (!args) {
          await sock.sendMessage(jid, { text: 'Usage: `!weather <city>`\nExample: `!weather Casablanca`' });
          break;
        }
        try {
          const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(args)}?format=%C+%t+%h+%w+%p+%m`, { timeout: 5000 });
          await sock.sendMessage(jid, { text: `🌤️ *Weather: ${args}*\n━━━━━━━━━━━━━━━━━━━━━\n${data}\n━━━━━━━━━━━━━━━━━━━━━\n_Data from wttr.in_` });
        } catch (e) {
          await sock.sendMessage(jid, { text: `❌ Weather error: ${e.message}` });
        }
        break;
      }
    }
  }
};
