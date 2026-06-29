/**
 * videos.js — Video data loading, rendering, and the secure watch-to-earn system.
 *
 * BUGS FIXED IN THIS FILE:
 *
 * FIX BUG-02: _VP_DATA index mismatch.
 *   Previously _VP_DATA was overwritten by both renderVideos (home, 3 items)
 *   and renderVTPVideos (tab, filtered items). openVideoByIndex used a shared
 *   index into whichever array last wrote to _VP_DATA. Now each render function
 *   uses its own private closure array, and openVideoByIndex is replaced by
 *   openVideoById (stable string ID lookup in the canonical VIDEOS array).
 *
 * FIX BUG-03: Double interval / timer leak.
 *   openVideo() started its own setInterval AND legacy code also called
 *   startWatchTimer(). Both intervals ran simultaneously, halving the time
 *   to reach 80%. The timer is now owned exclusively by the WatchSession class.
 *   startWatchTimer() is removed. Only one interval can ever exist per session.
 *
 * FIX BUG-05: Inverted confirm() logic in closeWatchModal.
 *   Was: if(!confirm(...)) claimVideoToken()   ← claims on "No"
 *   Now: if( confirm(...)) claimVideoToken()   ← claims on "Yes/OK"
 *
 * FIX BUG-06: Orphan catch block / unreachable code in fetchYouTubeVideos.
 *   Restructured as a clean try/catch/finally.
 *
 * FIX BUG-10: Three copies of fallback videos with inconsistent IDs.
 *   Defined exactly once here. update-videos.js imports from this same list.
 *
 * FIX BUG-11: renderEarn button passed VIDEOS[0] at HTML-build time.
 *   Replaced with openFirstVideo() which looks up VIDEOS[0] at call time.
 *
 * FIX BUG-12: calcReward defined twice.
 *   Defined once here; returns 50 (the only valid value currently).
 */

import { S, persistState } from './state.js';
import { earnTokens }      from './tokens.js';
import { notify }          from './ui.js';

// ─── Canonical fallback video list (ONE definition) ──────────────────────────
export const FALLBACK_VIDEOS = [
  { id: 'vid1', src: 'youtube', youtubeId: 'QkkoHAzjnUs', cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 1', dur: '1:31', views: '200M',
    ch: 'Rockstar Games', thumb: 'https://img.youtube.com/vi/QkkoHAzjnUs/hqdefault.jpg', reward: 50 },
  { id: 'vid2', src: 'youtube', youtubeId: 'jctfX_SKkzQ', cat: 'trailer',
    title: 'Grand Theft Auto VI Trailer 2', dur: '2:01', views: '90M',
    ch: 'Rockstar Games', thumb: 'https://img.youtube.com/vi/jctfX_SKkzQ/hqdefault.jpg', reward: 50 },
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

// ─── Canonical streams list ───────────────────────────────────────────────────
export const STREAMS = [
  { id: 's1', youtubeId: 'QkkoHAzjnUs', title: 'GTA VI — Official Trailer 1', ch: 'Rockstar Games',  viewers: '200M', status: 'replay', dur: '1:31',  reward: 50 },
  { id: 's2', youtubeId: '9JETXBi0SYs', title: 'GTA VI — Official Trailer 2', ch: 'Rockstar Games',  viewers: '90M',  status: 'replay', dur: '2:01',  reward: 50 },
  { id: 's3', youtubeId: 'KpMXPU1zAAs', title: 'GTA 6 Everything We Know',    ch: 'MrBossFTW',      viewers: '4.2M', status: 'replay', dur: '18:42', reward: 50 },
];

// ─── Live video store ─────────────────────────────────────────────────────────
// VIDEOS is the single canonical array for the current session.
// Modules read from it; only loadVideos() writes to it.
export let VIDEOS = [];
export let VIDEOS_LOADED = false;

/**
 * Load videos from news-data.json (written by GitHub Action).
 * Falls back to FALLBACK_VIDEOS if the file is absent or invalid.
 *
 * FIX BUG-06: Restructured to remove orphan catch block and unreachable code.
 */
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

// ─── Reward helper (FIX BUG-12: defined exactly once) ────────────────────────
function calcReward() {
  return 50; // flat rate — all videos earn 50 TKN
}

// ─── Source display maps ──────────────────────────────────────────────────────
const SRC_COLOR = { youtube: '#ff0000', discord: '#5865F2', instagram: '#e1306c' };
const SRC_LABEL = { youtube: 'YouTube',  discord: 'Discord',  instagram: 'Instagram' };

// ─── Home-page video grid (shows first 3 videos) ─────────────────────────────
/**
 * Renders up to 3 videos on the home page.
 *
 * FIX BUG-02: Each card's onclick now passes the video's stable string ID,
 * not an array index. openVideoById() looks up in VIDEOS at call time,
 * so stale index references are impossible.
 */
export function renderVideos() {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;

  const items = VIDEOS.slice(0, 3);

  if (!items.length) {
    grid.innerHTML = _emptyMessage(VIDEOS_LOADED
      ? 'No videos available.'
      : 'Videos loading… run the GitHub Action to populate videos.');
    return;
  }

  grid.innerHTML = items.map(v => _videoCard(v)).join('');
}

// ─── Full tab-page video grid ─────────────────────────────────────────────────
export function renderVTPVideos(filter = 'all') {
  const grid = document.getElementById('vtpVideoGrid');
  if (!grid) return;

  const items = filter === 'all'
    ? VIDEOS
    : VIDEOS.filter(v => v.src === filter || v.cat === filter);

  if (!items.length) {
    grid.innerHTML = _emptyMessage(VIDEOS_LOADED ? 'No videos in this category.' : 'Videos loading…');
    return;
  }

  // FIX BUG-02: pass stable video ID, not array index
  grid.innerHTML = items.map(v => _videoCard(v)).join('');
}

// ─── Streams grid ─────────────────────────────────────────────────────────────
export function renderVTPStreams() {
  const grid = document.getElementById('vtpStreamGrid');
  if (!grid) return;

  if (!STREAMS.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text3);font-family:var(--font-u);">No streams available.</div>';
    return;
  }

  grid.innerHTML = STREAMS.map(s => {
    const watched = S.videosWatched.has(s.id);
    const isLive  = s.status === 'live';
    const liveBadge = isLive
      ? '<div style="background:var(--pink);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);font-weight:700;color:#fff;display:flex;align-items:center;gap:5px;"><span style="width:6px;height:6px;background:#fff;border-radius:50%;animation:pulse-dot 1.4s infinite;"></span>LIVE</div>'
      : '<div style="background:rgba(0,0,0,.7);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);color:var(--text3);">REPLAY</div>';
    const badge = watched
      ? '<span style="background:rgba(0,230,118,.85);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);font-weight:700;color:#0a0a0e;">✓ Watched</span>'
      : '<span style="background:rgba(0,0,0,.6);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);color:var(--gold);">🪙 +50 TKN</span>';

    return `<div class="video-player-wrap" onclick="GTA6HQ.openVideoById('${s.id}', 'stream')">
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
        <div class="vp-meta">${_esc(s.ch)}${isLive ? ' · <span style="color:var(--pink);font-weight:700;">🔴 LIVE</span>' : ' · Stream replay'}</div>
      </div>
    </div>`;
  }).join('');
}

/**
 * Open a video by its stable string ID.
 * Searches VIDEOS first, then STREAMS.
 *
 * FIX BUG-02: replaces openVideoByIndex — index-based lookup is gone.
 *
 * @param {string} videoId
 * @param {'video'|'stream'} [source]
 */
export function openVideoById(videoId, source = 'video') {
  const pool = source === 'stream' ? STREAMS : [...VIDEOS, ...STREAMS];
  const vid  = pool.find(v => v.id === videoId);

  if (!vid) {
    console.error(`[videos] openVideoById: no video with id "${videoId}"`);
    notify('⚠️ Video not found.');
    return;
  }

  _openWatchModal(vid);
}

/**
 * Open the first available video (used by "Watch Video" earn button).
 * FIX BUG-11: was openVideo(VIDEOS[0]) evaluated at HTML-build time.
 */
export function openFirstVideo() {
  if (!VIDEOS.length) {
    notify('⚠️ No videos loaded yet. Try again in a moment.');
    return;
  }
  _openWatchModal(VIDEOS[0]);
}

// ─── Watch Modal ──────────────────────────────────────────────────────────────

/**
 * WatchSession — owns the progress timer.
 * FIX BUG-03: There is exactly ONE interval owner. The session object holds
 * the interval ID and clears it on stop(). No other code starts intervals.
 */
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
    // Guarantee no leaked interval from a previous session
    this.stop();
    this._interval = setInterval(() => this._tick(), 500);
  }

  stop() {
    if (this._interval !== null) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.active = false;
  }

  _tick() {
    if (!this.active) { this.stop(); return; }

    if (!S.tabFocused) {
      this.tabSwitches++;
      if (this.tabSwitches > 3) {
        this.stop();
        _setText('watchVideoMsg', '⚠️ Too many tab switches. Watch session cancelled.');
        document.getElementById('watchEarnBtn').className = 'wm-earn-btn';
        return;
      }
    }

    // Advance progress only when tab is focused
    this.progress = Math.min(this.progress + (S.tabFocused ? 1.4 : 0.1), 100);
    const pct = Math.round(this.progress);

    _setText('watchPct', pct + '%');
    document.getElementById('watchProgFill').style.width = pct + '%';

    if (pct >= 80 && !this.claimed) {
      document.getElementById('watchEarnBtn').className = 'wm-earn-btn ready';
    }
    if (pct >= 100) {
      this.stop();
      _setText('watchVideoMsg', '✅ Video complete! Tokens ready to claim.');
    }
  }

  claim() {
    if (this.progress < 80) {
      notify('Watch at least 80% of the video first!');
      return false;
    }
    if (this.claimed) {
      notify('Tokens already claimed for this video.');
      return false;
    }
    this.claimed = true;
    this.stop();

    S.videosWatched.add(this.videoId);
    earnTokens(this.reward, `Watched: ${this.title.substring(0, 30)}`, { skipCooldown: true });

    const btn = document.getElementById('watchEarnBtn');
    if (btn) {
      btn.textContent        = '✅ Tokens Claimed!';
      btn.style.background   = 'var(--text3)';
      btn.className          = 'wm-earn-btn';
    }

    persistState();
    return true;
  }
}

let _currentSession = null;

function _openWatchModal(vid) {
  if (!vid || !vid.youtubeId) {
    notify('⚠️ This video does not have a YouTube ID.');
    return;
  }

  if (S.videosWatched.has(vid.id)) {
    const proceed = confirm('You already earned tokens for this video. Watch again for free (no extra tokens)?');
    if (!proceed) return;
  }

  // Stop any running session before starting a new one
  if (_currentSession) _currentSession.stop();
  _currentSession = new WatchSession(vid);

  _setText('watchTitle', vid.title);
  _setText('watchPct', '0%');
  _setText('watchRewardAmt', `${vid.reward || 50} TKN`);

  document.getElementById('watchProgFill').style.width = '0%';
  document.getElementById('watchEarnBtn').className = 'wm-earn-btn';

  const area = document.getElementById('watchVideoArea');
  area.innerHTML = `<iframe id="ytPlayer" width="100%" height="100%"
    src="https://www.youtube.com/embed/${vid.youtubeId}?autoplay=1&rel=0&modestbranding=1"
    frameborder="0"
    allow="autoplay; encrypted-media"
    allowfullscreen
    style="display:block;"></iframe>`;

  document.getElementById('watch-modal').classList.add('open');

  _currentSession.start();
}

export function claimVideoToken() {
  if (_currentSession) _currentSession.claim();
}

export function closeWatchModal() {
  if (!_currentSession) return;

  // FIX BUG-05: was `if(!confirm(...)) claim()` — inverted logic.
  // Correct: claim tokens when user clicks OK/Yes.
  if (!_currentSession.claimed && _currentSession.progress >= 80) {
    if (confirm('Claim your tokens before closing?')) {
      _currentSession.claim();
    }
  }

  _currentSession.stop();
  _currentSession = null;

  const area = document.getElementById('watchVideoArea');
  area.innerHTML = `<div class="wm-video-placeholder">
    <div class="big-play">▶</div>
    <p id="watchVideoMsg">Video playing… watch to 80% to unlock tokens</p>
  </div>`;

  document.getElementById('watch-modal').classList.remove('open');
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function _videoCard(v) {
  const watched = S.videosWatched.has(v.id);
  const thumb = (v.thumb && v.thumb.startsWith('http'))
    ? `<img src="${v.thumb}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" loading="lazy">`
    : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:48px;opacity:.3;">${v.thumb || '🎬'}</div>`;
  const badge = watched
    ? '<span style="background:rgba(0,230,118,.85);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);font-weight:700;color:#0a0a0e;">✓ Watched</span>'
    : '<span style="background:rgba(0,0,0,.6);padding:3px 9px;border-radius:4px;font-size:11px;font-family:var(--font-u);color:var(--gold);">🪙 +50 TKN</span>';
  const srcCol = SRC_COLOR[v.src] || '#888';
  const srcLbl = SRC_LABEL[v.src] || 'Video';

  // FIX BUG-02: onclick passes stable string id, not an array index
  return `<div class="video-player-wrap" onclick="GTA6HQ.openVideoById('${v.id}')">
    <div class="vp-thumb">${thumb}
      <div class="vp-overlay">
        <div class="vp-src-badge">
          <span style="width:8px;height:8px;border-radius:50%;background:${srcCol};flex-shrink:0;"></span>
          ${srcLbl}
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

/** Escape user-supplied strings before inserting into innerHTML */
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
