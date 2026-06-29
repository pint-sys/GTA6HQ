/**
 * tokens.js — Token earning, display, and cashout logic.
 *
 * FIX BUG-07: Token balance validation is client-side only.
 *   A real fix requires a signed JWT + server endpoint that validates
 *   the action before crediting. This module isolates the earn path
 *   so that future backend validation can be added at ONE point
 *   (the earnTokens function) without touching any render code.
 *
 * FIX: earnCooldowns was a bare global object; now encapsulated here.
 */

import { S, persistState } from './state.js';
import { notify } from './ui.js';

const PAYOUT_THRESHOLD = 1000;
const SILVER_TARGET    = 5000;

// Per-action cooldown in ms (reason key → last-earned timestamp)
const _cooldowns = {};

/**
 * Credit tokens to the user for a named action.
 *
 * @param {number} amt     - Token amount to credit (must be positive)
 * @param {string} reason  - Human-readable action name (used as cooldown key)
 * @param {object} [opts]
 * @param {boolean} [opts.skipCooldown] - bypass the 30s cooldown (for login/referral)
 */
export function earnTokens(amt, reason, { skipCooldown = false } = {}) {
  if (!Number.isFinite(amt) || amt <= 0) return;

  const key = reason.substring(0, 30);
  const now = Date.now();

  // Cooldown check — prevent rapid-fire clicks
  if (!skipCooldown && _cooldowns[key] && (now - _cooldowns[key] < 30_000)) {
    notify('⏳ Wait a moment before doing that again.');
    return;
  }
  _cooldowns[key] = now;

  S.tokens += amt;
  S.tx.unshift({ reason, amt, time: new Date().toLocaleTimeString() });
  if (S.tx.length > 30) S.tx.pop();

  updateTokenUI();
  notify(`🪙 +${amt} TKN — ${reason}`);
  persistState();
}

/**
 * Update ALL token-related DOM elements from current state.
 * Called after earn, load, or modal open.
 */
export function updateTokenUI() {
  const t   = S.tokens;
  const pct = Math.min((t / SILVER_TARGET) * 100, 100).toFixed(1);

  _setText('navTokens',      t.toLocaleString());
  _setHTML('balanceDisplay', `${t.toLocaleString()} <span style="font-size:14px;color:var(--text3);">TKN</span>`);
  _setStyle('progressFill',  'width', pct + '%');
  _setText('progressLabel',  `${t.toLocaleString()} / ${SILVER_TARGET.toLocaleString()} TKN`);

  // Token wallet modal — only update if modal content exists
  _setText('walletBalance',  t.toLocaleString());
  _setText('walletProgress', `${t.toLocaleString()} / ${SILVER_TARGET.toLocaleString()}`);
  _setStyle('walletFill',    'width', pct + '%');

  // Transaction history
  const hist = document.getElementById('txHistory');
  if (hist) {
    hist.innerHTML =
      '<div style="font-family:var(--font-u);font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Recent Activity</div>'
      + S.tx.slice(0, 6).map(x =>
          `<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <span style="color:var(--text2);">${x.reason}</span>
            <span style="color:var(--gold);font-weight:700;">+${x.amt} TKN</span>
          </div>`
        ).join('');
  }
}

/**
 * Handle payout request.
 * FIX: Previously just a notify — in production this must POST to a
 * server endpoint that verifies the balance from a server-side ledger,
 * not from the client's localStorage value.
 */
export function showCashout() {
  if (S.tokens < PAYOUT_THRESHOLD) {
    notify(`Need ${PAYOUT_THRESHOLD.toLocaleString()} TKN minimum to cash out. Keep earning!`);
    return;
  }
  // TODO: POST to /api/cashout with user session token
  notify('✅ Payout requested! Check your email within 48h. Rate: 1,000 TKN = $0.50 PayPal.');
}

// ─── Private DOM helpers ─────────────────────────────────────────────────────

function _setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function _setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
function _setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
