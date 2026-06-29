/**
 * ai.js — Sidebar AI assistant.
 *
 * Routes messages through /api/ask (a serverless proxy).
 * The API key must NEVER be exposed in the browser.
 * This module is safe as-is — it only calls the proxy endpoint.
 */

import { notify } from './ui.js';

const PROXY_URL = '/api/ask';

export async function sendAI() {
  const input = document.getElementById('aiInput');
  const msg   = input ? input.value.trim() : '';
  if (!msg) return;

  if (input) input.value = '';
  _appendMessage(msg, 'user');
  _appendTyping();

  try {
    const r = await fetch(PROXY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: msg }),
    });
    if (!r.ok) throw new Error(`Proxy ${r.status}`);
    const d = await r.json();
    _removeTyping();
    _appendMessage(d.reply || 'No response received.', 'bot');
  } catch (e) {
    _removeTyping();
    _appendMessage('AI assistant is offline. Set up a backend proxy at /api/ask to enable it.', 'bot');
    console.warn('[ai] Proxy request failed:', e.message);
  }
}

function _appendMessage(text, role, extraClass = '') {
  const box = document.getElementById('aiMessages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = `ai-msg ${role}${extraClass ? ' ' + extraClass : ''}`;
  div.innerHTML = `<div class="ai-bubble">${text}</div>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function _appendTyping() {
  _appendMessage('…', 'bot', 'typing-msg');
}

function _removeTyping() {
  const t = document.querySelector('.typing-msg');
  if (t) t.remove();
}
