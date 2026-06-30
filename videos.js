import { S, persistState } from './state.js';
import { earnTokens }      from './tokens.js';
import { notify }          from './ui.js';

export const FALLBACK_VIDEOS = [

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
    // FIX BUG 1: was missing > after the onclick attribute — div never closed properly
    return `<div class="video-player-wrap" onclick="openVideoById('${s.id}','stream')">
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
  
  // FIX: Search by youtubeId if ID starts with 'vid_' (from news-data.json)
  // Otherwise search by id (fallback/hardcoded)
  const vid = videoId.startsWith('vid_')
    ? pool.find(v => v.youtubeId === videoId.replace('vid_', ''))
    : pool.find(v => v.id === videoId);
    
  if (!vid) { 
    console.warn(`[videos] Video not found: ${videoId}`);
    notify('⚠️ Video not found.'); 
    return; 
  }
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
  // FIX: use plain openVideoById() — set directly on window by app.js
  return `<div class="video-player-wrap" onclick="openVideoById('${v.id}')">
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
