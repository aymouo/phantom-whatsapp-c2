import axios from 'axios';

export default {
  name: 'downloader',
  commands: ['ytmp3', 'ytmp4', 'tiktok', 'ig'],
  handler: async (ctx) => {
    const { sock, jid, cmd, args } = ctx;

    if (!args) {
      await sock.sendMessage(jid, { text: `Usage: \`!${cmd} <url>\`\nExample: \`!${cmd} https://...\`` });
      return;
    }

    const loadingMsg = await sock.sendMessage(jid, { text: `⏳ *Processing...* Please wait.` });

    try {
      switch (cmd) {
        case 'ytmp3':
        case 'ytmp4': {
          const format = cmd === 'ytmp3' ? 'audio' : 'video';
          try {
            const { data } = await axios.get(`https://www.youtube.com/oembed?url=${encodeURIComponent(args)}&format=json`, { timeout: 5000 });
            const title = data.title || 'Unknown';
            const author = data.author_name || 'Unknown';
            if (format === 'audio') {
              await sock.sendMessage(jid, { text: `🎵 *YouTube Audio*\n━━━━━━━━━━━━━━━━━━━━━\n🎵 ${title}\n👤 ${author}\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ Server has no ffmpeg for conversion.\nUse \`!ytdl ${args}\` to get the direct video, or download manually.\n━━━━━━━━━━━━━━━━━━━━━\n📎 ${args}` });
            } else {
              await sock.sendMessage(jid, { text: `🎬 *YouTube Video*\n━━━━━━━━━━━━━━━━━━━━━\n🎬 ${title}\n👤 ${author}\n━━━━━━━━━━━━━━━━━━━━━\n⚠️ Direct download requires yt-dlp on server.\nUse the URL above to download manually.\n━━━━━━━━━━━━━━━━━━━━━\n📎 ${args}` });
            }
          } catch {
            await sock.sendMessage(jid, { text: `❌ Could not fetch video info. Check the URL and try again.\n\nURL: ${args}` });
          }
          break;
        }

        case 'tiktok': {
          try {
            const { data } = await axios.get(`https://api.aptashala.com/tiktok?url=${encodeURIComponent(args)}`, { timeout: 10000 });
            const videoUrl = data?.video?.url_list?.[0] || data?.video?.play_addr?.url_list?.[0] || data?.data?.play || null;
            const desc = data?.desc || data?.data?.description || 'TikTok Video';
            const author = data?.author?.unique_id || data?.data?.author || 'unknown';
            if (videoUrl) {
              await sock.sendMessage(jid, { text: `🎵 *TikTok Download*\n━━━━━━━━━━━━━━━━━━━━━\n👤 @${author}\n📝 ${desc}\n━━━━━━━━━━━━━━━━━━━━━\n📎 ${videoUrl}\n━━━━━━━━━━━━━━━━━━━━━\n_Open link in browser to download_` });
            } else {
              await sock.sendMessage(jid, { text: `❌ Could not extract video. Try another TikTok URL.\n\n${args}` });
            }
          } catch (e) {
            await sock.sendMessage(jid, { text: `❌ TikTok error: ${e.message}\n\nTry the URL manually: ${args}` });
          }
          break;
        }

        case 'ig': {
          try {
            const { data } = await axios.get(`https://api.aptashala.com/instagram?url=${encodeURIComponent(args)}`, { timeout: 10000 });
            const items = data?.items || data?.data || [];
            const urls = items.flatMap(i => {
              const urls = [];
              if (i.video_versions?.[0]?.url) urls.push(i.video_versions[0].url);
              if (i.image_versions2?.candidates?.[0]?.url) urls.push(i.image_versions2.candidates[0].url);
              if (i.carousel_media) i.carousel_media.forEach(c => {
                if (c.video_versions?.[0]?.url) urls.push(c.video_versions[0].url);
                if (c.image_versions2?.candidates?.[0]?.url) urls.push(c.image_versions2.candidates[0].url);
              });
              return urls;
            });
            if (urls.length > 0) {
              await sock.sendMessage(jid, { text: `📸 *Instagram Media*\n━━━━━━━━━━━━━━━━━━━━━\n📎 ${urls.join('\n📎 ')}\n━━━━━━━━━━━━━━━━━━━━━\n_Open links in browser_` });
            } else {
              await sock.sendMessage(jid, { text: `❌ Could not extract media. Try another Instagram URL.\n\n${args}` });
            }
          } catch (e) {
            await sock.sendMessage(jid, { text: `❌ Instagram error: ${e.message}` });
          }
          break;
        }
      }
    } catch (e) {
      await sock.sendMessage(jid, { text: `❌ ${cmd} error: ${e.message}` });
    }
  }
};
