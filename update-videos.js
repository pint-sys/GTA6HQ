const https = require('https');
const fs = require('fs');

const CHANNELS = [
  { id: 'UCVber8x0HRmj-RvMOBLwyOQ', name: 'Rockstar Games' },
  
];

const GTA6_KEYWORDS = ['gta 6','gta vi','grand theft auto 6','grand theft auto vi','gta6','gtavi'];

const FALLBACK = [
  const FALLBACK = [
  {
    id: 'vid1',
    src: 'youtube',
    youtubeId: 'QdBZY2fkU-0',
    cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 1',
    dur: '1:31',
    views: '200M',
    ch: 'Rockstar Games',
    thumb: 'https://img.youtube.com/vi/QdBZY2fkU-0/maxresdefault.jpg',
    reward: 50
  },
  {
    id: 'vid2',
    src: 'youtube',
    youtubeId: 'a7dB_6MvVv4',
    cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 2',
    dur: '2:01',
    views: '90M',
    ch: 'Rockstar Games',
    thumb: 'https://img.youtube.com/vi/a7dB_6MvVv4/maxresdefault.jpg',
    reward: 50
  },
  {
    id: 'vid3',
    src: 'youtube',
    youtubeId: 'mI6v3M6mN7w',
    cat: 'guides',
    title: 'GTA 6 Everything We Know — Full Breakdown',
    dur: '18:42',
    views: '4.2M',
    ch: 'MrBossFTW',
    thumb: 'https://img.youtube.com/vi/mI6v3M6mN7w/maxresdefault.jpg',
    reward: 50
  }

];

function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
}

function checkVideoAvailable(videoId) {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function fetchChannelVideos(channel) {
  try {
    const rss = await fetchURL(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`);
    const entries = rss.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
    const videos = [];

    for (const entry of entries) {
      const videoId = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/) || [])[1];
      const title   = (entry.match(/<title>(.*?)<\/title>/)            || [])[1];
      if (!videoId || !title) continue;

      const titleClean = title.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'");
      const isGTA6 = GTA6_KEYWORDS.some(k => titleClean.toLowerCase().includes(k));
      if (!isGTA6) continue;

      const available = await checkVideoAvailable(videoId);
      if (!available) {
        console.log(`  ⚠️  Skipping unavailable: ${titleClean}`);
        continue;
      }
if (!available) {
      console.log(`  ⚠️  Skipping unavailable: ${titleClean}`);
      continue;
    }

    videos.push({
      id:        `vid${videos.length + 1}`,
      src:       'youtube',
      youtubeId: videoId,
      cat:       titleClean.toLowerCase().includes('trailer') ? 'trailer' : 'guides',
      title:     titleClean,
      dur:       '—',
      views:     '—',
      ch:        channel.name,
      thumb:     `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      reward:    50,
    });

    if (videos.length >= 3) break;});

      if (videos.length >= 3) break;
    }
    return videos;
  } catch (e) {
    console.warn(`  Channel ${channel.name} failed: ${e.message}`);
    return [];
  }
}

async function update() {
  console.log('🎬 Fetching GTA 6 videos from YouTube RSS...');

  const allVideos = [];
  const seenIds   = new Set();

  for (const channel of CHANNELS) {
    console.log(`  Checking ${channel.name}...`);
    const videos = await fetchChannelVideos(channel);
    for (const v of videos) {
      if (!seenIds.has(v.youtubeId)) {
        seenIds.add(v.youtubeId);
        allVideos.push(v);
        console.log(`  ✅ ${v.title}`);
      }
    }
    if (allVideos.length >= 6) break;
  }

  // Always pad with fallback if we got fewer than 6
  if (allVideos.length < 6) {
    console.log(`  Only found ${allVideos.length} live videos — padding with fallbacks`);
    for (const f of FALLBACK) {
      if (!seenIds.has(f.youtubeId)) {
        const available = await checkVideoAvailable(f.youtubeId);
        if (available) {
          seenIds.add(f.youtubeId);
          allVideos.push(f);
          console.log(`  ✅ Fallback: ${f.title}`);
        } else {
          console.log(`  ⚠️  Fallback unavailable: ${f.title}`);
        }
      }
      if (allVideos.length >= 6) break;
    }
  }

  const output = {
    videos:  allVideos,
    news:    [],
    updated: new Date().toISOString(),
  };

  fs.writeFileSync('news-data.json', JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${allVideos.length} verified videos to news-data.json`);
}

update().catch(err => {
  console.error('Fatal:', err);
  // Write fallback so site never has 0 videos
  fs.writeFileSync('news-data.json', JSON.stringify({ videos: FALLBACK, news: [], updated: new Date().toISOString() }, null, 2));
  console.log('⚠️  Wrote fallback videos due to error');
  process.exit(0); // exit 0 so CI doesn't fail
});
