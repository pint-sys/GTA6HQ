const https = require('https');
const fs = require('fs');

const CHANNEL_ID = 'UCVber8x0HRmj-RvMOBLwyOQ'; // Rockstar Games

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

async function update() {
  try {
    const rss = await fetchRSS(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
    );

    // Parse video IDs and titles from RSS
    const videos = [];
    const entries = rss.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

    entries.slice(0, 6).forEach((entry, i) => {
      const id    = (entry.match(/video:videoId>(.*?)</) || [])[1];
      const title = (entry.match(/<title>(.*?)<\/title>/) || [])[1];
      const views = '—';

      if (id && title) {
        videos.push({
          id:        'vid' + (i + 1),
          src:       'youtube',
          youtubeId: id,
          cat:       title.toLowerCase().includes('trailer') ? 'trailer' : 'guides',
          title:     title.replace(/&amp;/g, '&'),
          dur:       '—',
          views,
          ch:        'Rockstar Games',
          thumb:     `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
          reward:    50,
        });
      }
    });

    // Fall back to hardcoded if RSS fails
    if (!videos.length) throw new Error('No videos from RSS');

    const output = {
      videos,
      news: [],
      updated: new Date().toISOString(),
    };

    fs.writeFileSync('news-data.json', JSON.stringify(output, null, 2));
    console.log(`✅ Updated ${videos.length} videos from Rockstar RSS`);
  } catch (e) {
    console.error('RSS fetch failed:', e.message);
    process.exit(1);
  }
}

update();
