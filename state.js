/**
 * state.js — Single source of truth for all application state.
 *
 * FIX: Previously state was a bare global `var S = {...}` in index.html,
 * with Set serialisation scattered across saveS(). Centralised here so
 * every module imports what it needs instead of reaching into globals.
 *
 * FIX BUG-07: Token balance is still client-side (requires a backend to
 * fully fix), but we isolate it here so a future server-validation layer
 * can be inserted in earnTokens() without touching render code.
 */

const STORAGE_KEY = 'gta6hq_v3';

// ─── Default state shape ────────────────────────────────────────────────────
const DEFAULT_STATE = {
  tokens: 0,
  loggedIn: false,
  username: 'Guest',
  userId: null,
  tx: [],            // transaction history, capped at 30
  liked: [],         // serialised as array, hydrated as Set
  videosWatched: [], // serialised as array, hydrated as Set
  watchCooldowns: {},
  tabFocused: true,
};

// ─── Hydrate from localStorage ──────────────────────────────────────────────
function _load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      // Ensure Sets are always Sets regardless of what was stored
      liked: new Set(Array.isArray(parsed.liked) ? parsed.liked : []),
      videosWatched: new Set(Array.isArray(parsed.videosWatched) ? parsed.videosWatched : []),
      tx: Array.isArray(parsed.tx) ? parsed.tx : [],
    };
  } catch (_) {
    return { ...DEFAULT_STATE };
  }
}

export const S = _load();

// Hydrate Sets after load (they're plain arrays on disk)
if (!(S.liked instanceof Set)) S.liked = new Set(S.liked || []);
if (!(S.videosWatched instanceof Set)) S.videosWatched = new Set(S.videosWatched || []);

// ─── Persist to localStorage ─────────────────────────────────────────────────
let _saveTimer = null;

/**
 * Debounced save — batches rapid state changes into one write.
 * FIX: Previously `saveS` was debounced ad-hoc at every call site.
 * Now it's always debounced here, callers just call `persistState()`.
 */
export function persistState() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_writeToStorage, 400);
}

function _writeToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...S,
      liked: [...S.liked],
      videosWatched: [...S.videosWatched],
      tx: S.tx.slice(0, 30),
    }));
  } catch (e) {
    console.warn('[state] localStorage write failed:', e.message);
  }
}

// ─── Tab-focus tracking (used by watch anti-cheat) ───────────────────────────
document.addEventListener('visibilitychange', () => {
  S.tabFocused = !document.hidden;
});
window.addEventListener('blur', () => { S.tabFocused = false; });
window.addEventListener('focus', () => { S.tabFocused = true; });
