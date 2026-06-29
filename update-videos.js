/**
 * update-videos.js — Writes the canonical video list to news-data.json.
 *
 * FIX BUG-10: Previously defined its own hardcoded video array which
 * had DIFFERENT YouTube IDs than FALLBACK_VIDEOS in index.html,
 * causing mismatched thumbnails between the home page and the tab page.
 *
 * The canonical list is now in src/data/videos-canonical.json (exported
 * from the same source of truth that the frontend imports).
 *
 * For a Node.js CommonJS environment we inline the same data here
 * but marked clearly as the ONE source to update.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── CANONICAL VIDEO LIST — update this array to change videos everywhere ─────
// These IDs must match src/modules/videos.js FALLBACK_VIDEOS exactly.
// When you update one, update the other. A future build step will enforce this.
const CANONICAL_VIDEOS = [
  { id: 'vid1', src: 'youtube', youtubeId: 'QkkoHAzjnUs', cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 1',              dur: '1:31',  views: '200M', ch: 'Rockstar Games',   thumb: 'https://img.youtube.com/vi/QkkoHAzjnUs/hqdefault.jpg', reward: 50 },
  { id: 'vid2', src: 'youtube', youtubeId: '9JETXBi0SYs', cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 2',              dur: '2:01',  views: '90M',  ch: 'Rockstar Games',   thumb: 'https://img.youtube.com/vi/9JETXBi0SYs/hqdefault.jpg', reward: 50 },
  { id: 'vid3', src: 'youtube', youtubeId: 'KpMXPU1zAAs', cat: 'guides',
    title: 'GTA 6 Everything We Know — Full Breakdown',  dur: '18:42', views: '4.2M', ch: 'MrBossFTW',        thumb: 'https://img.youtube.com/vi/KpMXPU1zAAs/hqdefault.jpg', reward: 50 },
  { id: 'vid4', src: 'youtube', youtubeId: 'rEXCNbsNVQ0', cat: 'guides',
    title: 'GTA 6 Map Analysis — State of Leonida',      dur: '22:15', views: '3.1M', ch: 'GTA Series Videos', thumb: 'https://img.youtube.com/vi/rEXCNbsNVQ0/hqdefault.jpg', reward: 50 },
  { id: 'vid5', src: 'youtube', youtubeId: 'odFm6hfDea8', cat: 'guides',
    title: 'GTA 6 Jason & Lucia — Full Character Analysis', dur: '14:08', views: '2.8M', ch: 'DarkViperAU', thumb: 'https://img.youtube.com/vi/odFm6hfDea8/hqdefault.jpg', reward: 50 },
  { id: 'vid6', src: 'youtube', youtubeId: 'T3PkATlHi_E', cat: 'guides',
    title: 'GTA 6 Gameplay Features Confirmed So Far',   dur: '16:55', views: '2.3M', ch: 'Typical Gamer',   thumb: 'https://img.youtube.com/vi/T3PkATlHi_E/hqdefault.jpg', reward: 50 },
];

async function update() {
  const output = {
    videos:  CANONICAL_VIDEOS,
    news:    [],              // populated separately by fetch-news.js via Firestore
    updated: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, '..', 'news-data.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`[update-videos] ✅ Written ${CANONICAL_VIDEOS.length} videos to news-data.json`);
}

update().catch(err => {
  console.error('[update-videos] Fatal:', err);
  process.exit(1);
});
