/**
 * news.js — News fetching, caching, filtering, and rendering.
 *
 * BUGS FIXED IN THIS FILE:
 *
 * FIX BUG-01: window.fetchLiveNews (Firestore) was never called.
 *   The frontend called fetchLatestNews() but the Firebase module only
 *   defined window.fetchLiveNews and never wired it in.
 *   Now: fetchLatestNews() explicitly checks for window.fetchLiveNews and
 *   calls it as a first priority, before news-data.json, before RSS.
 *
 * FIX BUG-04: srcName used before declaration.
 *   excerpt fallback now builds after srcName is resolved.
 */

const CACHE_TTL_MS    = 5 * 60 * 1000; // 5 minutes
const MAX_ARTICLES    = 20;
const BLOCKLIST       = ['scam', 'fake', 'giveaway', 'free hack', 'leaked download', 'clickbait', 'cheats', 'generator'];
const EMOJIS          = ['🔥','📰','🎮','💥','🗺️','⚡','🚗','🎯','📡','🚀','🎬','💰','🔫','🏆','🌆'];
const RSS_FEEDS       = [
  'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://news.google.com/rss/search?q=GTA+6+Rockstar+Games&hl=en-US&gl=US&ceid=US:en'),
  'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://news.google.com/rss/search?q=Grand+Theft+Auto+VI&hl=en-US&gl=US&ceid=US:en'),
];

// ─── Static seed data (shown until live fetch completes) ─────────────────────
const SEED_NEWS = [
  { id: 1, cat: 'official', tag: 'Official', emoji: '🚀', title: 'GTA 6 Locked for November 19, 2026 — Two Delays Finally Settled', excerpt: 'Rockstar confirmed Nov 19 2026 for PS5 and Xbox Series X|S. PC date remains unannounced.', time: '2h ago', likes: 1842, url: '#' },
  { id: 2, cat: 'official', tag: 'Official', emoji: '🎮', title: "Dual Protagonists Jason & Lucia Confirmed — Lucia is Series' First Female Lead", excerpt: "Two trailers confirmed both characters. Lucia navigates Vice City's underworld as the series' first female lead.", time: '5h ago', likes: 934, url: '#' },
  { id: 3, cat: 'rumor',    tag: 'Rumor',    emoji: '🗺️', title: 'Leaked Map Shows 3x GTA V Scale — Grassrivers, Vice City, Leonida Keys', excerpt: 'State of Leonida reportedly includes swamplands, island chains, small towns, ports, and a mountain national park.', time: '8h ago', likes: 2120, url: '#' },
  { id: 4, cat: 'update',   tag: 'Update',   emoji: '⚡', title: 'GTA 6 Engine: Real-Time Global Illumination & Ocean Physics Confirmed', excerpt: 'The RAGE 9 engine simulates water physics, dense NPC crowds, and dynamic lighting unlike anything seen in gaming.', time: '1d ago', likes: 997, url: '#' },
  { id: 5, cat: 'official', tag: 'Official', emoji: '💻', title: 'PC Version: No Official Date — History Suggests 12–18 Months After Console', excerpt: 'Rockstar has not confirmed PC. GTA V launched PC 18 months after console, RDR2 was 13 months.', time: '2d ago', likes: 3102, url: '#' },
];

// ─── Module state ─────────────────────────────────────────────────────────────
export let NEWS = [...SEED_NEWS];
let _lastFetchTime  = 0;
let _currentFilter  = 'all';

// ─── Primary fetch orchestrator ───────────────────────────────────────────────
/**
 * Fetch the latest news. Priority order:
 *   1. Firestore via window.fetchLiveNews (set by firebase-config.js)
 *   2. news-data.json (GitHub Action output)
 *   3. Live RSS feeds (browser-side fetch)
 *
 * FIX BUG-01: Firestore pipeline is now actually called.
 *
 * @param {boolean} [force] - bypass cache TTL
 */
export async function fetchLatestNews(force = false) {
  const now = Date.now();
  if (!force && _lastFetchTime && (now - _lastFetchTime < CACHE_TTL_MS)) {
    renderNewsHome();
    return;
  }

  // ── Priority 1: Firestore (live, server-written by fetch-news.js) ──────────
  if (typeof window.fetchLiveNews === 'function') {
    try {
      const firestoreItems = await window.fetchLiveNews();
      if (Array.isArray(firestoreItems) && firestoreItems.length > 0) {
        NEWS = _normaliseFirestoreItems(firestoreItems);
        _lastFetchTime = now;
        _afterFetch(force);
        return;
      }
    } catch (e) {
      console.warn('[news] Firestore fetch failed, trying news-data.json:', e.message);
    }
  }

  // ── Priority 2: news-data.json (GitHub Action static output) ───────────────
  try {
    const res = await fetch(`news-data.json?t=${now}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.news) && data.news.length > 0) {
        NEWS = data.news;
        _lastFetchTime = now;
        _afterFetch(force);
        return;
      }
    }
  } catch (e) {
    console.warn('[news] news-data.json not available:', e.message);
  }

  // ── Priority 3: Live RSS feeds ─────────────────────────────────────────────
  await _fetchFromRSS(now, force);
}

// ─── Renderers ────────────────────────────────────────────────────────────────

export function renderNewsHome() {
  const el = document.getElementById('newsListHome');
  if (!el) return;

  const items = NEWS.slice(0, 6);
  if (!items.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3);font-family:var(--font-u);font-size:13px;">No news available.</div>';
    return;
  }

  el.innerHTML = items.map(n => {
    const url    = n.url && n.url !== '#' ? n.url : '#';
    const target = url !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<div class="nl-item">
      ${_catTag(n.cat)}
      <div class="nl-title"><a href="${url}"${target}>${_esc(n.title)}</a></div>
      <span class="nl-meta">${n.time}</span>
      ${n.source ? `<span class="nl-src">${_esc(n.source)}</span>` : ''}
    </div>`;
  }).join('');
}

export function renderNewsTab(filter) {
  if (filter) _currentFilter = filter;
  const el = document.getElementById('newsTabList');
  if (!el) return;

  const items = _currentFilter === 'all'
    ? NEWS
    : NEWS.filter(n => n.cat === _currentFilter);

  if (!items.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-family:var(--font-u);">No articles in this category yet.</div>';
    return;
  }

  el.innerHTML = items.map(n => {
    const url    = n.url && n.url !== '#' ? n.url : '#';
    const target = url !== '#' ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<div class="ntp-item">
      <div class="ntp-emoji">${n.emoji || '📰'}</div>
      <div class="ntp-body">
        <div class="ntp-title">${_catTag(n.cat)} <a href="${url}"${target}>${_esc(n.title)}</a></div>
        ${n.excerpt ? `<div class="ntp-excerpt">${_esc(n.excerpt)}</div>` : ''}
        <div class="ntp-meta">
          <span>${n.time}</span>
          ${n.source ? `<span class="ntp-src">· ${_esc(n.source)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

export function renderSidebarNews() {
  const el = document.getElementById('newsFeed');
  if (!el) return;
  el.innerHTML = NEWS.slice(0, 4).map(n =>
    `<div class="nf-item">
      <div class="nf-thumb">${n.emoji || '📰'}</div>
      <div class="nf-info">
        <div class="nf-title">${_esc(n.title)}</div>
        <div class="nf-time">${n.time}</div>
      </div>
    </div>`
  ).join('');
}

export function filterNewsTab(filter, btn) {
  document.querySelectorAll('.ntab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderNewsTab(filter);
}

export function updateNewsTabs() {
  const tabs = document.querySelectorAll('.ntab');
  if (!tabs.length) return;
  const off = NEWS.filter(n => n.cat === 'official').length;
  const rum = NEWS.filter(n => n.cat === 'rumor').length;
  const upd = NEWS.filter(n => n.cat === 'update').length;
  if (tabs[0]) tabs[0].textContent = `All (${NEWS.length})`;
  if (tabs[1]) tabs[1].textContent = `Official (${off})`;
  if (tabs[2]) tabs[2].textContent = `Rumors (${rum})`;
  if (tabs[3]) tabs[3].textContent = `Updates (${upd})`;
}

// ─── Private: RSS fetch ───────────────────────────────────────────────────────
async function _fetchFromRSS(now, force) {
  const seen    = new Set();
  const fetched = [];

  for (const feedUrl of RSS_FEEDS) {
    try {
      const r = await fetch(feedUrl);
      const d = await r.json();
      if (!d || d.status !== 'ok' || !Array.isArray(d.items)) continue;

      for (const item of d.items) {
        if (fetched.length >= MAX_ARTICLES) break;

        const title = (item.title || '').replace(/<[^>]*>/g, '').trim();
        if (!title) continue;
        if (BLOCKLIST.some(w => title.toLowerCase().includes(w))) continue;

        const key = title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
        if (seen.has(key)) continue;
        seen.add(key);

        // FIX BUG-04: resolve srcName BEFORE using it in excerpt fallback
        let srcName = '';
        try { srcName = new URL(item.link || '').hostname.replace('www.', ''); } catch (_) {}

        let rawDesc = (item.description || item.content || '')
          .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        let excerpt = rawDesc;
        if (rawDesc.toLowerCase().startsWith(title.substring(0, 30).toLowerCase())) {
          excerpt = rawDesc.substring(title.length).replace(/^[\s\-–—·|]+/, '').trim();
        }
        // srcName is now defined before this line
        if (excerpt.length < 50) excerpt = `Click to read the full article on ${srcName || 'the source'}.`;
        excerpt = excerpt.substring(0, 200);

        const pub   = new Date(item.pubDate || now);
        const diffH = Math.floor((now - pub) / 3_600_000);
        const time  = diffH < 1 ? 'Just now' : diffH < 24 ? `${diffH}h ago` : `${Math.floor(diffH / 24)}d ago`;

        const tl  = title.toLowerCase();
        const cat = (tl.includes('official') || tl.includes('rockstar') || tl.includes('confirm') || tl.includes('trailer') || tl.includes('release')) ? 'official'
                  : (tl.includes('leak') || tl.includes('rumor') || tl.includes('allegedly') || tl.includes('report')) ? 'rumor'
                  : 'update';

        fetched.push({
          id:      `ln${fetched.length}`,
          cat,
          tag:     cat === 'official' ? 'Official' : cat === 'rumor' ? 'Rumor' : 'Update',
          emoji:   EMOJIS[fetched.length % EMOJIS.length],
          title,
          excerpt,
          time,
          url:     item.link || '#',
          source:  srcName,
          likes:   0,
        });
      }
    } catch (e) {
      console.warn('[news] RSS feed failed:', e.message);
    }
  }

  if (fetched.length > 0) {
    NEWS = fetched;
    _lastFetchTime = now;
  }
  _afterFetch(force);
}

// ─── Private: normalise Firestore doc shape to internal shape ────────────────
function _normaliseFirestoreItems(items) {
  return items.map((doc, i) => ({
    id:      doc.id || `fs${i}`,
    cat:     doc.tag === 'news' ? 'update' : (doc.tag || 'update'),
    tag:     doc.tag || 'Update',
    emoji:   EMOJIS[i % EMOJIS.length],
    title:   doc.title || '',
    excerpt: doc.summary || `Read more about "${doc.title || 'this article'}"`,
    time:    doc.time   || 'Recently',
    url:     doc.url    || '#',
    source:  doc.source || '',
    likes:   0,
  }));
}

// ─── Private: post-fetch UI updates ──────────────────────────────────────────
function _afterFetch(force) {
  updateNewsTabs();
  renderNewsHome();
  renderSidebarNews();

  const newsTab = document.getElementById('news-tab-page');
  if (newsTab && newsTab.style.display !== 'none') renderNewsTab();

  if (force) {
    // lazy import to avoid circular dep
    import('./ui.js').then(m => m.notify('📰 News refreshed!'));
  }
}

// ─── Private: helpers ─────────────────────────────────────────────────────────
const _tagCache = {};
function _catTag(cat) {
  if (_tagCache[cat]) return _tagCache[cat];
  const cls   = cat === 'official' ? 'official' : cat === 'rumor' ? 'rumor' : 'update';
  const label = cat === 'official' ? 'Official' : cat === 'rumor' ? 'Rumor'  : 'Update';
  return (_tagCache[cat] = `<span class="nl-tag ${cls}">${label}</span>`);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
