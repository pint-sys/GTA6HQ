const https = require('https');
const fs = require('fs');

// Multiple GTA 6 focused channels
const CHANNELS = [
  'UCVber8x0HRmj-RvMOBLwyOQ', // Rockstar Games
  'UCId9g4zlQ4oB-AlNQzRDAOg', // GTA Series Videos  
  'UCNo7ZLWM8WouKtKMxaLkADg', // MrBossFTW
];

const GTA6_KEYWORDS = ['gta 6', 'gta vi', 'grand theft auto 6', 'grand theft auto vi', 'rockstar'];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

async function checkVideoAvailable(videoId) {
  try {
    const page = await fetchURL(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    const data = JSON.parse(page);
    return !!data.title;
  } catch {
    return false;
  }
}

async function fetchChannelVideos(channelId) {
  try {
    const rss = await fetchURL(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
    );

    const videos = [];
    const entries = rss.match(/<entry>([\s\S]*?)<\/entry>/g) || [];

    for (const entry of entries) {
      const id    = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
      const title = (entry.match(/<title>(.*?)<\/title>/)           || [])[1];
      const views = (entry.match(/<media:statistics views="(\d+)"/) || [])[1];

      if (!id || !title) continue;

      // Only include GTA 6 related videos
      const titleLower = title.toLowerCase();
      const isGTA6 = GTA6_KEYWORDS.some(k => titleLower.includes(k));
      if (!isGTA6) continue;

      // Check video is actually available
      const available = await checkVideoAvailable(id);
      if (!available) {
        console.log(`⚠️ Skipping unavailable video: ${title}`);
        continue;
      }

      const viewCount = views
        ? parseInt(views) >= 1000000
          ? (parseInt(views)/1000000).toFixed(1) + 'M'
          : parseInt(views) >= 1000
          ? (parseInt(views)/1000).toFixed(0) + 'K'
          : views
        : '—';

      videos.push({
        id:        `vid_${id}`,
        src:       'youtube',
        youtubeId: id,
        cat:       titleLower.includes('trailer') ? 'trailer' : 'guides',
        title:     title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        dur:       '—',
        views:     viewCount,
        ch:        channelId === 'UCVber8x0HRmj-RvMOBLwyOQ' ? 'Rockstar Games' : 'GTA Community',
        thumb:     `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        reward:    50,
      });

      if (videos.length >= 12) break;
    }

    return videos;
  } catch (e) {
    console.warn(`Channel ${channelId} failed:`, e.message);
    return [];
  }
}

async function update() {
  console.log('🎬 Fetching GTA 6 videos from YouTube RSS...');

  const allVideos = [];
  const seenIds   = new Set();

  for (const channelId of CHANNELS) {
    const videos = await fetchChannelVideos(channelId);
    for (const v of videos) {
      if (!seenIds.has(v.youtubeId)) {
        seenIds.add(v.youtubeId);
        allVideos.push(v);
      }
    }
    if (allVideos.length >= 12) break;
  }

  // Fallback if RSS fails entirely
  const FALLBACK = [
    { id:'vid1', src:'youtube', youtubeId:'QkkoHAzjnUs', cat:'trailer', title:'Grand Theft Auto VI Trailer 1', dur:'1:31', views:'200M', ch:'Rockstar Games', thumb:'https://img.youtube.com/vi/QkkoHAzjnUs/hqdefault.jpg', reward:50 },
    { id:'vid2', src:'youtube', youtubeId:'jctfX_SKkzQ', cat:'trailer', title:'Grand Theft Auto VI Trailer 2', dur:'2:01', views:'90M',  ch:'Rockstar Games', thumb:'https://img.youtube.com/vi/jctfX_SKkzQ/hqdefault.jpg',  reward:50 },
  ];

  const finalVideos = allVideos.length >= 2 ? allVideos : FALLBACK;

  const output = {
    videos:  finalVideos,
    news:    [],
    updated: new Date().toISOString(),
  };

  fs.writeFileSync('news-data.json', JSON.stringify(output, null, 2));
  console.log(`✅ Saved ${finalVideos.length} verified available videos`);
}

update().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
