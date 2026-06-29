/**
 * ui.js — Pure UI concerns: modals, notifications, countdown, tab navigation.
 *
 * Separated from business logic so that render modules do not need to
 * know about modal IDs, and modal code does not need to know about tokens.
 */

import { updateTokenUI, showCashout } from './tokens.js';
import { S, persistState }            from './state.js';

// ─── Notification toast ───────────────────────────────────────────────────────
let _notifyTimer = null;

export function notify(msg) {
  clearTimeout(_notifyTimer);
  const toast = document.getElementById('notifyToast');
  const text  = document.getElementById('notifyMsg');
  if (!toast || !text) return;
  text.textContent = msg;
  toast.classList.add('show');
  _notifyTimer = setTimeout(() => toast.classList.remove('show'), 3600);
}

// ─── Generic modal ─────────────────────────────────────────────────────────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  if (id === 'token-modal') updateTokenUI(); // refresh balance on open
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

export function closeModalOnOverlay(event, id) {
  if (event.target === document.getElementById(id)) closeModal(id);
}

// ─── Auth modal ───────────────────────────────────────────────────────────────
export function switchAuthTab(mode, btn) {
  btn.parentElement.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('auth-login').style.display    = mode === 'login'    ? 'block' : 'none';
  document.getElementById('auth-register').style.display = mode === 'register' ? 'block' : 'none';
}

export function loginUser() {
  S.loggedIn  = true;
  S.username  = 'GTA6Fan';
  S.userId    = `GTA6HQ-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
  // lazy import to avoid circular dep at module load time
  import('./tokens.js').then(m => m.earnTokens(25, 'Daily login bonus', { skipCooldown: true }));
  closeModal('auth-modal');
  persistState();
}

export function registerUser() {
  S.loggedIn = true;
  S.username = 'NewRecruit';
  S.userId   = `GTA6HQ-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
  import('./tokens.js').then(m => m.earnTokens(100, 'Welcome bonus', { skipCooldown: true }));
  closeModal('auth-modal');
  persistState();
}

// ─── Ask modal ────────────────────────────────────────────────────────────────
export function submitQuestion() {
  import('./tokens.js').then(m => m.earnTokens(100, 'Posted a question'));
  closeModal('ask-modal');
  notify('Question posted! +100 TKN earned.');
}

// ─── Countdown ────────────────────────────────────────────────────────────────
const _RELEASE_DATE = new Date('2026-11-19T08:00:00').getTime();

export function updateCountdown() {
  const diff = _RELEASE_DATE - Date.now();
  const el   = document.getElementById('cd-days');
  if (!el) return;

  if (diff <= 0) {
    ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
      const e = document.getElementById(id);
      if (e) e.textContent = '0';
    });
    return;
  }

  const setText = (id, val) => {
    const e = document.getElementById(id);
    if (e) e.textContent = val;
  };
  setText('cd-days',  Math.floor(diff / 86_400_000));
  setText('cd-hours', Math.floor((diff % 86_400_000) / 3_600_000));
  setText('cd-mins',  Math.floor((diff % 3_600_000) / 60_000));
  setText('cd-secs',  Math.floor((diff % 60_000) / 1_000));
}

// ─── Videos tab page ──────────────────────────────────────────────────────────
export function openVideosTab() {
  const page = document.getElementById('videos-tab-page');
  if (!page) return;
  page.style.display = 'block';
  page.scrollTop = 0;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  // Trigger renders via the videos module
  import('./videos.js').then(m => {
    switchVTab('videos');
    m.renderVTPVideos('all');
    m.renderVTPStreams();
  });
}

export function closeVideosTab() {
  const page = document.getElementById('videos-tab-page');
  if (page) page.style.display = 'none';
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

export function switchVTab(tab, btn) {
  document.querySelectorAll('.vtab').forEach(b => {
    b.classList.remove('active');
    b.style.borderBottomColor = 'transparent';
    b.style.color = 'var(--text3)';
  });
  if (btn) {
    btn.classList.add('active');
    btn.style.borderBottomColor = 'var(--gold)';
    btn.style.color = 'var(--gold)';
  }
  const t = typeof tab === 'string' ? tab : 'videos';
  const vEl = document.getElementById('vtp-videos');
  const sEl = document.getElementById('vtp-streams');
  if (vEl) vEl.style.display = t === 'videos'  ? 'block' : 'none';
  if (sEl) sEl.style.display = t === 'streams' ? 'block' : 'none';
}

export function filterVTP(filter, btn) {
  document.querySelectorAll('.vtf').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  import('./videos.js').then(m => m.renderVTPVideos(filter));
}

// ─── News tab page ────────────────────────────────────────────────────────────
export function openNewsTab() {
  const page = document.getElementById('news-tab-page');
  if (!page) return;
  page.style.display = 'block';
  page.scrollTop = 0;
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  import('./news.js').then(m => {
    m.renderNewsTab('all');
    document.querySelectorAll('.ntab').forEach((b, i) => b.classList.toggle('active', i === 0));
  });
}

export function closeNewsTab() {
  const page = document.getElementById('news-tab-page');
  if (page) page.style.display = 'none';
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

// ─── ESC key closes any open overlay ─────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const vp = document.getElementById('videos-tab-page');
  const np = document.getElementById('news-tab-page');
  if (vp && vp.style.display === 'block') { closeVideosTab(); return; }
  if (np && np.style.display === 'block') { closeNewsTab(); }
});
