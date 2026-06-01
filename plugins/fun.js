export default {
  name: 'fun',
  commands: ['hack', 'hackip', 'fakeinfo', 'joke', '8ball', 'dice', 'coinflip'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args } = ctx;

    switch (cmd) {
      case 'hack': {
        const target = args || 'anonymous';
        const steps = [
          `[${'='.repeat(5)}>] Resolving target: ${target}...`,
          `[${'='.repeat(10)}>] Bypassing firewall (192.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.1)...`,
          `[${'='.repeat(15)}>] Injecting payload through port ${Math.floor(Math.random()*65535)}...`,
          `[${'='.repeat(20)}>] Establishing reverse shell...`,
          `[${'='.repeat(25)}>] Dumping credentials...`,
          `[${'='.repeat(30)}>] Access granted!`,
          ``,
          `✅ *HACK COMPLETE*`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `🎯 Target: ${target}`,
          `📡 IP: ${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
          `📧 Email: ${target.toLowerCase().replace(/\s+/g, '.')}@hacked.gov`,
          `🔑 Password: ${Math.random().toString(36).slice(2, 10)}`,
          `📱 Phone: +${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*900)-100}-${Math.floor(Math.random()*9000)+1000}`,
          `💳 Card: ${Array(4).fill(0).map(() => Math.floor(Math.random()*9000)+1000).join(' ')}`,
          `━━━━━━━━━━━━━━━━━━━━━`,
          `⚠️ *This is a simulation!*`
        ].join('\n');
        await sock.sendMessage(jid, { text: `👨‍💻 *HACKING ${target.toUpperCase()}...*\n━━━━━━━━━━━━━━━━━━━━━\n${steps}` });
        break;
      }

      case 'hackip': {
        const ip = args || (Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255) + '.' + Math.floor(Math.random()*255));
        const countries = ['Morocco', 'Russia', 'China', 'USA', 'Brazil', 'Nigeria', 'Ukraine', 'North Korea'];
        const isps = ['Orange Maroc', 'Maroc Telecom', 'Inwi', 'RosTelecom', 'China Telecom', 'Comcast', 'Level 3'];
        const devices = ['iPhone 15 Pro', 'Samsung Galaxy S25', 'Huawei P70', 'Google Pixel 9', 'Xiaomi 14', 'OnePlus 13'];
        const browsers = ['Chrome 125', 'Firefox 128', 'Safari 18', 'Edge 124', 'Opera 112', 'Brave 1.68'];
        const osList = ['Android 15', 'iOS 18.4', 'Windows 11', 'Linux Ubuntu 24.04', 'macOS 15 Sequoia'];
        const country = countries[Math.floor(Math.random() * countries.length)];
        const isp = isps[Math.floor(Math.random() * isps.length)];
        const device = devices[Math.floor(Math.random() * devices.length)];
        const browser = browsers[Math.floor(Math.random() * browsers.length)];
        const os = osList[Math.floor(Math.random() * osList.length)];
        const lat = (Math.random() * 180 - 90).toFixed(6);
        const lon = (Math.random() * 360 - 180).toFixed(6);
        await sock.sendMessage(jid, {
          text: `🕵️ *IP TRACE: ${ip}*\n━━━━━━━━━━━━━━━━━━━━━\n🌍 Country: ${country}\n🏙️ City: ${['Casablanca', 'Moscow', 'Beijing', 'NYC', 'Rio', 'Lagos', 'Kyiv', 'Pyongyang'][Math.floor(Math.random()*8)]}\n📡 ISP: ${isp}\n📱 Device: ${device}\n💻 OS: ${os}\n🌐 Browser: ${browser}\n📍 Coordinates: ${lat}, ${lon}\n🗺️ Map: https://maps.google.com/?q=${lat},${lon}\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ *This is a simulation!*`
        });
        break;
      }

      case 'fakeinfo': {
        const genders = ['Male', 'Female', 'Non-binary'];
        const firstNames = ['Ahmed', 'Youssef', 'Mohamed', 'Omar', 'Hassan', 'Fatima', 'Aisha', 'Khadija', 'Zainab', 'Sarah'];
        const lastNames = ['Alaoui', 'Bennani', 'Fassi', 'Belhaj', 'Zerhouni', 'El Fadili', 'Amrani', 'Idrissi', 'Tazi', 'Rhamna'];
        const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fes', 'Tangier', 'Agadir', 'Oujda', 'Meknes'];
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const birthDate = `${Math.floor(Math.random() * 28) + 1}/${Math.floor(Math.random() * 12) + 1}/${1980 + Math.floor(Math.random() * 25)}`;
        await sock.sendMessage(jid, {
          text: `🆔 *FAKE IDENTITY*\n━━━━━━━━━━━━━━━━━━━━━\n👤 Name: ${firstName} ${lastName}\n⚧️ Gender: ${genders[Math.floor(Math.random() * genders.length)]}\n🎂 DOB: ${birthDate}\n📍 Address: ${Math.floor(Math.random() * 999) + 1} Rue ${lastName}, ${city}\n📞 Phone: +212 ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}\n📧 Email: ${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com\n🆔 CIN: ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ *Fake identity generated*`
        });
        break;
      }

      case 'joke': {
        const jokes = [
          'Why do hackers wear leather jackets? Because they have to deal with a lot of *leather*net problems. 🥁',
          'There are 10 types of people in the world: those who understand binary, and those who don\'t. 😄',
          'Why did the programmer go broke? Because he used up all his *cache*. 💸',
          'A SQL query walks into a bar, walks up to two tables and asks: "Can I join you?" 🍻',
          'Why do Java developers wear glasses? Because they can\'t C#. 👓',
          'I would tell you a UDP joke, but you might not get it. 📡',
          'The best thing about a Boolean is that even if you are wrong, you are only off by a bit. 😅',
          'Why did the developer go to therapy? He had too many *emotional dependencies*. 🛋️',
          'How many programmers does it take to change a light bulb? None — that\'s a hardware problem. 💡',
          'I\'m not a great programmer; I\'m just a good programmer with great Google skills. 🔍',
        ];
        await sock.sendMessage(jid, { text: `😂 *JOKE*\n━━━━━━━━━━━━━━━━━━━━━\n${jokes[Math.floor(Math.random() * jokes.length)]}\n━━━━━━━━━━━━━━━━━━━━━` });
        break;
      }

      case '8ball': {
        if (!args) {
          await sock.sendMessage(jid, { text: '🎱 Ask the magic 8-ball a question:\nUsage: `!8ball <question>`\nExample: `!8ball will I win?`' });
          break;
        }
        const responses = [
          '🎱 It is certain.', '🎱 It is decidedly so.', '🎱 Without a doubt.',
          '🎱 Yes — definitely.', '🎱 You may rely on it.', '🎱 As I see it, yes.',
          '🎱 Most likely.', '🎱 Outlook good.', '🎱 Yes.',
          '🎱 Signs point to yes.', '🎱 Reply hazy, try again.',
          '🎱 Ask again later.', '🎱 Better not tell you now.',
          '🎱 Cannot predict now.', '🎱 Concentrate and ask again.',
          '🎱 Don\'t count on it.', '🎱 My reply is no.',
          '🎱 My sources say no.', '🎱 Outlook not so good.',
          '🎱 Very doubtful.'
        ];
        await sock.sendMessage(jid, { text: `🎱 *Magic 8-Ball*\n━━━━━━━━━━━━━━━━━━━━━\n❓ *Q:* ${args}\n━━━━━━━━━━━━━━━━━━━━━\n${responses[Math.floor(Math.random() * responses.length)]}\n━━━━━━━━━━━━━━━━━━━━━` });
        break;
      }

      case 'dice': {
        const result = Math.floor(Math.random() * 6) + 1;
        const diceArt = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        await sock.sendMessage(jid, { text: `🎲 *DICE ROLL*\n━━━━━━━━━━━━━━━━━━━━━\n${diceArt[result]} ${result}\n━━━━━━━━━━━━━━━━━━━━━` });
        break;
      }

      case 'coinflip': {
        const result = Math.random() < 0.5 ? 'HEADS' : 'TAILS';
        const emoji = result === 'HEADS' ? '🪙' : '🪙';
        await sock.sendMessage(jid, { text: `🪙 *COIN FLIP*\n━━━━━━━━━━━━━━━━━━━━━\n${emoji} **${result}**\n━━━━━━━━━━━━━━━━━━━━━` });
        break;
      }
    }
  }
};
