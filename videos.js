import { S, persistState } from './state.js';
import { earnTokens }      from './tokens.js';
import { notify }          from './ui.js';

export const FALLBACK_VIDEOS = [
  { id: 'vid1', src: 'youtube', youtubeId: 'QkkoHAzjnUs', cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 1', dur: '1:31', views: '200M',
    ch: 'Rockstar Games', thumb: 'https://img.youtube.com/vi/QkkoHAzjnUs/hqdefault.jpg', reward: 50 },
 // Remove jctfX_SKkzQ entirely, use this instead:
{ id: 'vid2', src: 'youtube', youtubeId: '9JETXBi0SYs', cat: 'trailer',
  title: 'Grand Theft Auto VI Trailer 2', dur: '2:01', views: '90M',
  ch: 'Rockstar Games', thumb: 'https://img.youtube.com/vi/9JETXBi0SYs/hqdefault.jpg', reward: 50 },
  { id: 'vid3', src: 'youtube', youtubeId: 'KpMXPU1zAAs', cat: 'guides',
    title: 'GTA 6 Everything We Know — Full Breakdown', dur: '18:42', views: '4.2M',
    ch: 'MrBossFTW', thumb: 'https://img.youtube.com/vi/KpMXPU1zAAs/hqdefault.jpg', reward: 50 },
  { id: 'vid4', src: 'youtube', youtubeId: 'rEXCNbsNVQ0', cat: 'guides',
    title: 'GTA 6 Map Analysis — State of Leonida', dur: '22:15', views: '3.1M',
    ch: 'GTA Series Videos', thumb: 'https://img.youtube.com/vi/rEXCNbsNVQ0/hqdefault.jpg', reward: 50 },
  { id: 'vid5', src: 'youtube', youtubeId: 'odFm6hfDea8', cat: 'guides',
    title: 'GTA 6 Jason & Lucia — Full Character Analysis', dur: '14:08', views: '2.8M',
    ch: 'DarkViperAU', thumb: 'https://img.youtube.com/vi/odFm6hfDea8/hqdefault.jpg', reward: 50 },
  { id: 'vid6', src: 'youtube', youtubeId: 'T3PkATlHi_E', cat: 'guides',
    title: 'GTA 6 Gameplay Features Confirmed So Far', dur: '16:55', views: '2.3M',
    ch: 'Typical Gamer', thumb: 'https://img.youtube.com/vi/T3PkATlHi_E/hqdefault.jpg', reward: 50 },
];

export const STREAMS = [
  { id: 's1', youtubeId: 'QkkoHAzjnUs', title: 'GTA VI — Official Trailer 1', ch: 'Rockstar Games', viewers: '200M', status: 'replay', dur: '1:31',  reward: 50 },
  { id: 's2', youtubeId: 'jctfX_SKkzQ', title: 'GTA VI — Official Trailer 2', ch: 'Rockstar Games', viewers: '90M',  status: 'replay', dur: '2:01',  reward: 50 },
  { id: 's3', youtubeId: 'KpMXPU1zAAs', title: 'GTA 6 Everything We Know',   ch: 'MrBossFTW',     viewers: '4.2M', status: 'replay', dur: '18:42', reward: 50 },
];

export let VIDEOS = [];
export let VIDEOS_LOADED = false;

export async function loadVideos() {
  try {
    const res = await fetch(`news-data.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data.videos) && data.videos.length > 0) {
      VIDEOS = data.videos;
      VIDEOS_LOADED = true;
      console.log(`[videos] Loaded ${VIDEOS.length} videos from news-data.json`);
      return;
    }
    throw new Error('news-data.json has no videos');
  } catch (e) {
    console.warn('[videos] Falling back to static list:', e.message);
    VIDEOS = FALLBACK_VIDEOS;
    VIDEOS_LOADED = true;
  }
}

function calcReward() { return 50; }

const SRC_COLOR = { youtube: '#ff0000', discord: '#5865F2', instagram: '#e1306c' };
const SRC_LABEL = { youtube: 'YouTube',  discord: 'Discord',  instagram: 'Instagram' };

export function renderVideos() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;
  const items = VIDEOS.slice(0, 3);
  if (!items.length) {
    grid.innerHTML = _emptyMessage(VIDEOS_LOADED ? 'No videos available.' : 'Videos loading…');
    return;
  }
  grid.innerHTML = items.map(v => _videoCard(v)).join('');
}

export function renderVTPVideos(filter = 'all') {
  const grid = document.getElementById('vtpVideoGrid');
  if (!grid) return;
  const items = filter === 'all' ? VIDEOS : VIDEOS.filter(v => v.src === filter || v.cat === filter);
  if (!items.length) {
    grid.innerHTML = _emptyMessage(VIDEOS_LOADED ? 'No videos in this category.' : 'Videos loading…');
    return;
  }
  grid.innerHTML = items.map(v => _videoCard(v)).join('');
}

export function renderVTPStreams() {
  const grid = document.getElementById('vtpStreamGrid');
  if (!grid) return;
  if (!STREAMS.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3);">No streams available.</div>';
    return;
  }
  grid.innerHTML = STREAMS.map(s => {
    const watched = S.videosWatched.has(s.id);
    const isLive  = s.status === 'live';
    const liveBadge = isLive
      ? '<div style="background:var(--pink);padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;color:#fff;">🔴 LIVE</div>'
      : '<div style="background:rgba(0,0,0,.7);padding:3px 9px;border-radius:4px;font-size:11px;color:var(--text3);">REPLAY</div>';
    const badge = watched
      ? '<span style="background:rgba(0,230,118,.85);padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;color:#0a0a0e;">✓ Watched</span>'
      : '<span style="background:rgba(0,0,0,.6);padding:3px 9px;border-radius:4px;font-size:11px;color:var(--gold);">🪙 +50 TKN</span>';
    return `<div class="video-player-wrap" onclick="GTA6HQ.openVideoById('${s.id}','stream')">
      <div class="vp-thumb" style="background:#0a0010;">
        ${s.youtubeId ? `<img src="https://img.youtube.com/vi/${s.youtubeId}/hqdefault.jpg" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy">` : ''}
        <div class="vp-overlay">${liveBadge}
          <div class="play-circle"><svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" fill="currentColor"/></svg></div>
          ${badge}
        </div>
        ${s.dur ? `<span class="vp-dur">${s.dur}</span>` : ''}
      </div>
      <div class="vp-info">
        <div class="vp-title">${_esc(s.title)}</div>
        <div class="vp-meta">${_esc(s.ch)} · Stream replay</div>
      </div>
    </div>`;
  }).join('');
}

export function openVideoById(videoId, source = 'video') {
  const pool = source === 'stream' ? STREAMS : [...VIDEOS, ...STREAMS];
  const vid  = pool.find(v => v.id === videoId);
  if (!vid) { notify('⚠️ Video not found.'); return; }
  _openWatchModal(vid);
}

export function openFirstVideo() {
  if (!VIDEOS.length) { notify('⚠️ No videos loaded yet.'); return; }
  _openWatchModal(VIDEOS[0]);
}

class WatchSession {
  constructor(vid) {
    this.videoId     = vid.id;
    this.title       = vid.title;
    this.reward      = vid.reward || calcReward();
    this.progress    = 0;
    this.tabSwitches = 0;
    this.claimed     = false;
    this.active      = false;
    this._interval   = null;
  }
  start() {
    this.active = true;
    this.stop();
    this._interval = setInterval(() => this._tick(), 500);
  }
  stop() {
    if (this._interval !== null) { clearInterval(this._interval); this._interval = null; }
    this.active = false;
  }
  _tick() {
    if (!this.active) { this.stop(); return; }
    if (!S.tabFocused) {
      this.tabSwitches++;
      if (this.tabSwitches > 3) {
        this.stop();
        _setText('watchVideoMsg', '⚠️ Too many tab switches. Session cancelled.');
        document.getElementById('watchEarnBtn').className = 'wm-earn-btn';
        return;
      }
    }
    this.progress = Math.min(this.progress + (S.tabFocused ? 1.4 : 0.1), 100);
    const pct = Math.round(this.progress);
    _setText('watchPct', pct + '%');
    document.getElementById('watchProgFill').style.width = pct + '%';
    if (pct >= 80 && !this.claimed) document.getElementById('watchEarnBtn').className = 'wm-earn-btn ready';
    if (pct >= 100) { this.stop(); _setText('watchVideoMsg', '✅ Video complete! Tokens ready to claim.'); }
  }
  claim() {
    if (this.progress < 80) { notify('Watch at least 80% first!'); return false; }
    if (this.claimed) { notify('Tokens already claimed.'); return false; }
    this.claimed = true;
    this.stop();
    S.videosWatched.add(this.videoId);
    earnTokens(this.reward, `Watched: ${this.title.substring(0, 30)}`, { skipCooldown: true });
    const btn = document.getElementById('watchEarnBtn');
    if (btn) { btn.textContent = '✅ Tokens Claimed!'; btn.style.background = 'var(--text3)'; btn.className = 'wm-earn-btn'; }
    persistState();
    return true;
  }
}

let _currentSession = null;

function _openWatchModal(vid) {
  if (!vid || !vid.youtubeId) { notify('⚠️ No YouTube ID for this video.'); return; }
  if (S.videosWatched.has(vid.id)) {
    if (!confirm('Already earned tokens for this. Watch again for free?')) return;
  }
  if (_currentSession) _currentSession.stop();
  _currentSession = new WatchSession(vid);
  _setText('watchTitle', vid.title);
  _setText('watchPct', '0%');
  _setText('watchRewardAmt', `${vid.reward || 50} TKN`);
  document.getElementById('watchProgFill').style.width = '0%';
  document.getElementById('watchEarnBtn').className = 'wm-earn-btn';
  document.getElementById('watchVideoArea').innerHTML =
    `<iframe width="100%" height="100%"
      src="https://www.youtube.com/embed/${vid.youtubeId}?autoplay=1&rel=0&modestbranding=1"
      frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="display:block;"></iframe>`;
  document.getElementById('watch-modal').classList.add('open');
  _currentSession.start();
}

export function claimVideoToken() {
  if (_currentSession) _currentSession.claim();
}

export function closeWatchModal() {
  if (!_currentSession) return;
  if (!_currentSession.claimed && _currentSession.progress >= 80) {
    if (confirm('Claim your tokens before closing?')) _currentSession.claim();
  }
  _currentSession.stop();
  _currentSession = null;
  document.getElementById('watchVideoArea').innerHTML =
    `<div class="wm-video-placeholder"><div class="big-play">▶</div><p id="watchVideoMsg">Watch to 80% to unlock tokens</p></div>`;
  document.getElementById('watch-modal').classList.remove('open');
}

function _videoCard(v) {
  const watched = S.videosWatched.has(v.id);
  const thumb = (v.thumb && v.thumb.startsWith('http'))
    ? `<img src="${v.thumb}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy">`
    : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;opacity:.3;">🎬</div>`;
  const badge = watched
    ? '<span style="background:rgba(0,230,118,.85);padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;color:#0a0a0e;">✓ Watched</span>'
    : '<span style="background:rgba(0,0,0,.6);padding:3px 9px;border-radius:4px;font-size:11px;color:var(--gold);">🪙 +50 TKN</span>';
  return `<div class="video-player-wrap" onclick="GTA6HQ.openVideoById('${v.id}')">
    <div class="vp-thumb">${thumb}
      <div class="vp-overlay">
        <div class="vp-src-badge">
          <span style="width:8px;height:8px;border-radius:50%;background:${SRC_COLOR[v.src]||'#888'};flex-shrink:0;"></span>
          ${SRC_LABEL[v.src]||'Video'}
        </div>
        <div class="play-circle"><svg viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z" fill="currentColor"/></svg></div>
        ${badge}
      </div>
      <span class="vp-dur">${v.dur}</span>
    </div>
    <div class="vp-info">
      <div class="vp-title">${_esc(v.title)}</div>
      <div class="vp-meta">${_esc(v.ch)} · ${v.views} views</div>
    </div>
  </div>`;
}

function _emptyMessage(msg) {
  return `<div style="grid-column:1/-1;text-align:center;padding:60px;">
    <div style="font-size:40px;margin-bottom:12px;">🎬</div>
    <div style="font-family:var(--font-u);font-size:14px;color:var(--text3);">${msg}</div>
  </div>`;
}

function _esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
