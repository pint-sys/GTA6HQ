import { S, persistState }             from './state.js';
import { updateTokenUI, earnTokens,
         showCashout }                  from './tokens.js';
import { fetchLatestNews, renderNewsHome,
         renderNewsTab, renderSidebarNews,
         filterNewsTab, updateNewsTabs } from './news.js';
import { loadVideos, renderVideos,
         renderVTPVideos, renderVTPStreams,
         openVideoById, openFirstVideo,
         claimVideoToken, closeWatchModal } from './videos.js';
import { notify, openModal, closeModal,
         closeModalOnOverlay, switchAuthTab,
         loginUser, registerUser, submitQuestion,
         updateCountdown, openVideosTab,
         closeVideosTab, switchVTab, filterVTP,
         openNewsTab, closeNewsTab }     from './ui.js';
import { sendAI }                       from './ai.js';
import { GUIDES, MODS, QA, EARN_TASKS,
         EARN_AMOUNTS, TIERS, LEADERBOARD,
         EVENTS, SYS_REQ, CONSOLES }    from './static.js';

function renderGuides() {
  const el = document.getElementById('guidesGrid');
  if (!el) return;
  el.innerHTML = GUIDES.map(g => {
    const liked = S.liked.has(`g${g.id}`);
    return `<div class="card">
      <div class="card-thumb-ph" style="background:var(--bg2);font-size:40px;">${g.emoji}</div>
      <div class="card-body">
        <div class="card-tags"><span class="tag tag-guide">${g.tag}</span></div>
        <div class="card-title"><a href="#guides">${g.title}</a></div>
        <p style="font-size:12px;color:var(--text2);line-height:1.5;margin:6px 0;">${g.excerpt}</p>
        <div class="card-meta"><span>🕐 ${g.time}</span><span>👁️ ${g.views}</span></div>
      </div>
      <div class="card-actions">
        <button class="like-btn${liked ? ' liked' : ''}" onclick="GTA6HQ.toggleLike('g${g.id}',this)">
          ❤️ <span>${g.likes + (liked ? 1 : 0)}</span>
        </button>
        <button class="like-btn" onclick="GTA6HQ.earn(50,'Read guide')">🪙 +50</button>
      </div>
    </div>`;
  }).join('');
}

function renderMods(filter = 'all') {
  const el = document.getElementById('modsGrid');
  if (!el) return;
  const items = filter === 'all' ? MODS : MODS.filter(m => m.cat === filter);
  el.innerHTML = items.map(m =>
    `<div class="mod-card">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="mod-icon-box">${m.icon}</div>
        <div><div class="mod-name">${m.name}</div><div style="font-size:10px;color:var(--text3);font-family:var(--font-u);">${m.ver}</div></div>
      </div>
      <div class="mod-desc">${m.desc}</div>
      <div class="mod-footer">
        <span class="mod-dl">⬇️ ${m.dl}</span>
        <button class="btn-dl" onclick="GTA6HQ.earn(25,'Downloaded mod')">Download</button>
      </div>
    </div>`
  ).join('');
}

function renderQA(list) {
  const el = document.getElementById('qaList');
  if (!el) return;
  const items = list || QA;
  el.innerHTML = items.map(q =>
    `<div class="qa-item">
      <div class="qa-votes">
        <div class="vote-count">${q.votes}</div>
        <div class="vote-label">votes</div>
        ${q.solved ? '<div class="qa-solved">✓</div>' : ''}
      </div>
      <div class="qa-content">
        <div class="qa-title">${q.title}</div>
        <div class="qa-excerpt">${q.excerpt}</div>
        <div class="qa-meta">
          <span class="answer-badge">${q.answers} answers</span>
          <span>🕐 ${q.time}</span>
        </div>
      </div>
    </div>`
  ).join('');
}

function renderEarn() {
  const el = document.getElementById('earnGrid');
  if (!el) return;
  el.innerHTML = EARN_TASKS.map(t => {
    const amt = EARN_AMOUNTS[t.key] || 25;
    const btn = t.secured
      ? `<button class="earn-btn" onclick="GTA6HQ.openFirstVideo()">Watch Video</button>`
      : `<button class="earn-btn" onclick="GTA6HQ.earn(${amt},'${t.name}')">Earn</button>`;
    return `<div class="token-task">
      <div class="tt-icon ${t.cls}">${t.icon}</div>
      <div class="tt-info"><div class="tt-name">${t.name}</div><div class="tt-earn">${t.earn}</div></div>
      ${btn}
    </div>`;
  }).join('');
}

function renderTiers() {
  const el = document.getElementById('tierGrid');
  if (!el) return;
  el.innerHTML = TIERS.map(t =>
    `<div class="tier-card ${t.cls}">
      <div class="tier-name">${t.name}</div>
      <div class="tier-pts">${t.pts}</div>
      <div class="tier-reward">${t.usd} PayPal</div>
      <div class="tier-mkt">${t.alt} · ${t.desc}</div>
    </div>`
  ).join('');
}

function renderLeaderboard() {
  const el = document.getElementById('lbBody');
  if (!el) return;
  el.innerHTML = LEADERBOARD.map(l =>
    `<div class="lb-row">
      <div class="lb-rank ${l.rank <= 3 ? 'lb-r' + l.rank : ''}">${l.rank}</div>
      <div class="lb-av">${l.av}</div>
      <div class="lb-info">
        <div class="lb-name">${l.name}</div>
        <div class="lb-pts">${l.pts.toLocaleString()} TKN</div>
      </div>
    </div>`
  ).join('');
}

function renderEvents() {
  const el = document.getElementById('eventsList');
  if (!el) return;
  el.innerHTML = EVENTS.map(e =>
    `<div style="display:flex;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="font-size:18px;">${e.icon}</span>
      <div>
        <div style="font-size:12px;font-weight:600;">${e.name}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--font-u);">${e.time}</div>
      </div>
    </div>`
  ).join('');
}

function renderSysReq() {
  const el = document.getElementById('sysReqGrid');
  if (el) {
    el.innerHTML = SYS_REQ.map(r =>
      `<div class="req-card">
        <div class="req-header">
          <div class="req-tier-name ${r.tier}">${r.icon} ${r.label}</div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-u);">${r.desc}</div>
        </div>
        <div class="req-body">
          ${r.specs.map(s => `<div class="req-row"><div class="req-label">${s.l}</div><div class="req-val">${s.v}</div></div>`).join('')}
        </div>
      </div>`
    ).join('');
  }

  const cel = document.getElementById('consoleGrid');
  if (cel) {
    cel.innerHTML = CONSOLES.map(c =>
      `<div class="console-card">
        <div class="console-icon">${c.icon}</div>
        <div class="console-name">${c.name}</div>
        <div class="console-spec">${c.specs}</div>
      </div>`
    ).join('');
  }
}

function toggleLike(id, btn) {
  if (S.liked.has(id)) {
    S.liked.delete(id);
    btn.classList.remove('liked');
  } else {
    S.liked.add(id);
    btn.classList.add('liked');
    earnTokens(10, 'Liked content');
  }
  persistState();
}

function filterMods(filter, btn) {
  document.querySelectorAll('#modTabs .tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMods(filter);
}

function searchQA() {
  const v = (document.getElementById('qaSearch')?.value || '').toLowerCase().trim();
  if (!v) { renderQA(); return; }
  const f = QA.filter(q => q.title.toLowerCase().includes(v) || q.excerpt.toLowerCase().includes(v));
  renderQA(f.length ? f : [{ id: 0, votes: 0, solved: false, title: `No results for "${v}"`, excerpt: 'Try different keywords.', answers: 0, time: '—' }]);
}

function lookupPlayer() {
  const v = (document.getElementById('playerIdInput')?.value || '').trim();
  if (!v) return;
  _showPlayerCard({ name: 'ViceCityKing', id: v, tokens: Math.floor(Math.random() * 200000) + 1000, rank: 'Gold', posts: Math.floor(Math.random() * 800) + 50 }, document.getElementById('playerResult'));
}

function _showPlayerCard(p, el) {
  if (!el) return;
  el.innerHTML = `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:13px;">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;">
      <div style="width:38px;height:38px;border-radius:50%;background:rgba(240,180,41,.1);border:2px solid var(--gold);display:flex;align-items:center;justify-content:center;">🎮</div>
      <div>
        <div style="font-weight:700;font-size:13px;">${p.name}</div>
        <div style="font-size:11px;color:var(--gold);font-family:var(--font-u);">${p.id}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;">
      <div style="background:var(--bg2);padding:7px;border-radius:5px;text-align:center;">
        <div style="font-family:var(--font-d);font-size:15px;font-weight:700;color:var(--gold);">${p.tokens.toLocaleString()}</div>
        <div style="font-size:10px;color:var(--text3);">TKN</div>
      </div>
      <div style="background:var(--bg2);padding:7px;border-radius:5px;text-align:center;">
        <div style="font-family:var(--font-d);font-size:15px;font-weight:700;color:var(--cyan);">${p.posts}</div>
        <div style="font-size:10px;color:var(--text3);">Posts</div>
      </div>
    </div>
    <div style="margin-top:8px;">
      <span style="background:rgba(240,180,41,.12);border:1px solid rgba(240,180,41,.3);color:var(--gold);padding:3px 9px;border-radius:4px;font-size:11px;font-weight:700;font-family:var(--font-u);">${p.rank} Rank</span>
    </div>
  </div>`;
}

function checkPC() {
  const gpu = parseInt(document.getElementById('pcGpu')?.value || '0');
  const ram = parseInt(document.getElementById('pcRam')?.value || '0');
  const sto = parseInt(document.getElementById('pcStorage')?.value || '0');

  if (!document.getElementById('pcGpu')?.value) {
    document.getElementById('pcResult').innerHTML = '<div style="color:var(--pink);font-size:13px;">Please select all options.</div>';
    return;
  }

  const score = gpu + ram + sto;
  const [res, color] = score >= 8
    ? ['🟢 <strong>Ready for Ultra/4K</strong> — Your PC should handle GTA 6 at ultra settings with ray tracing.', 'var(--green)']
    : score >= 5
    ? ['🟡 <strong>Ready for Recommended</strong> — High/ultra 1080p–1440p. Upgrade RAM to 32GB for best results.', 'var(--gold)']
    : score >= 3
    ? ['🟠 <strong>Meets Minimum</strong> — Low/medium 1080p. Consider upgrading GPU and adding NVMe SSD.', 'var(--gold2)']
    : ['🔴 <strong>Upgrade Needed</strong> — Key upgrades: GPU to RTX 3060+, 16GB RAM, NVMe SSD with 150GB free.', 'var(--pink)'];

  document.getElementById('pcResult').innerHTML =
    `<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);padding:14px;font-size:13px;color:${color};line-height:1.6;">
      ${res}
      <br><span style="color:var(--text3);font-size:11px;margin-top:6px;display:block;">⚠️ Based on community predictions — official requirements not yet announced.</span>
    </div>`;
}

function handleSearch(v) {
  if ((v.startsWith('#') || /^[0-9]{4,}/.test(v)) && v.length > 4) {
    setTimeout(() => _showPlayerCard(
      { name: 'GTA6Fan', id: v, tokens: Math.floor(Math.random() * 100000) + 500, rank: 'Silver', posts: Math.floor(Math.random() * 200) + 10 },
      document.getElementById('playerResult')
    ), 300);
  }
}

function share() {
  earnTokens(200, 'Shared content');
  notify('🔗 Link copied! Share on Instagram with #GTA6HQ to earn +200 TKN');
}

window.GTA6HQ = {
  openVideoById,
  openFirstVideo,
  claimVideoToken,
  closeWatchModal,
  renderVTPVideos,
  renderVTPStreams,
  fetchLatestNews: (force) => fetchLatestNews(force),
  filterNewsTab,
  openNewsTab,
  closeNewsTab,
  earn: (amt, reason) => earnTokens(amt, reason),
  showCashout,
  openModal,
  closeModal,
  closeModalOnOverlay,
  switchAuthTab,
  loginUser,
  registerUser,
  submitQuestion,
  openVideosTab,
  closeVideosTab,
  switchVTab,
  filterVTP,
  sendAI,
  toggleLike,
  filterMods,
  filterVideos: (f, btn) => {
    document.querySelectorAll('#videoTabs .tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderVideos();
  },
  searchQA,
  lookupPlayer,
  checkPC,
  handleSearch,
  share,
};

(function init() {
  renderNewsHome();
  renderGuides();
  renderMods('all');
  renderQA();
  renderEarn();
  renderTiers();
  renderLeaderboard();
  renderSidebarNews();
  renderEvents();
  renderSysReq();
  updateTokenUI();
  updateCountdown();

  setInterval(updateCountdown, 1_000);
  setInterval(renderSidebarNews, 60_000);

  setTimeout(() => {
    fetchLatestNews();
    loadVideos().then(() => {
      renderVideos();
      renderVTPVideos('all');
    });
  }, 200);

  setTimeout(() => {
    if (!S.loggedIn) notify('👋 Sign up free to earn tokens and join the GTA 6 crew!');
  }, 2500);

  // FIX BUG 3: Expose critical functions directly on window
  // so onclick attributes work regardless of module load order
  window.openVideoById  = openVideoById;
  window.openFirstVideo = openFirstVideo;
  window.closeWatchModal = closeWatchModal;
  window.claimVideoToken = claimVideoToken;
})();
