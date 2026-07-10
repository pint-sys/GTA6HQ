const {onSchedule} = require('firebase-functions/v2/scheduler');
const {onRequest} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, Timestamp} = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// No API key needed — Google News RSS search results for GTA 6 coverage.
const FEED_URL = 'https://news.google.com/rss/search?q=%22GTA%206%22%20OR%20%22Grand%20Theft%20Auto%206%22&hl=en-US&gl=US&ceid=US:en';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // matches the site's 24h client cache
const MAX_ARTICLES = 20;

function categorize(title) {
  const t = title.toLowerCase();
  if (/leak|rumor|rumour|reportedly|sources say|insider|claims/.test(t)) return 'rumor';
  if (/map|leonida|vice city|grassrivers|keys|region/.test(t)) return 'map';
  if (/lucia|jason|character|protagonist|voice actor|cast/.test(t)) return 'characters';
  if (/car|vehicle|bike|boat|garage/.test(t)) return 'vehicles';
  if (/gameplay|mission|heist|mechanic|trailer|footage/.test(t)) return 'gameplay';
  if (/rockstar|official|confirm|announce|release date/.test(t)) return 'official';
  return 'update';
}

function emojiFor(category) {
  return {official:'🚀', rumor:'🕵️', map:'🗺️', characters:'🎮', vehicles:'🚗', gameplay:'🎯', update:'📰'}[category] || '📰';
}

function stripCdata(s) { return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, ''); }
function stripHtml(s) { return s.replace(/<[^>]*>/g, ''); }
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function parseRss(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '';
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    const descRaw = (block.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
    items.push({
      title: decodeEntities(stripCdata(title)).trim(),
      link: stripCdata(link).trim(),
      pubDate,
      description: decodeEntities(stripHtml(stripCdata(descRaw))).trim()
    });
  }
  return items;
}

async function syncNews() {
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error('Feed fetch failed: ' + res.status);
  const xml = await res.text();
  const items = parseRss(xml).slice(0, MAX_ARTICLES);

  const col = db.collection('automated_news');
  const batch = db.batch();

  // Purge anything older than 24h so the collection never grows unbounded
  // and mirrors the 24h window the front-end cache already enforces.
  const cutoff = Timestamp.fromMillis(Date.now() - MAX_AGE_MS);
  const staleSnap = await col.where('timestamp', '<', cutoff).get();
  staleSnap.forEach(doc => batch.delete(doc.ref));

  let written = 0;
  items.forEach(it => {
    if (!it.title || !it.link) return;
    const category = categorize(it.title);
    // Stable doc id derived from the URL so re-runs update in place instead of duplicating.
    const id = Buffer.from(it.link).toString('base64').replace(/[/+=]/g, '_').slice(0, 120);
    const ref = col.doc(id);
    batch.set(ref, {
      title: it.title,
      excerpt: it.description ? it.description.slice(0, 220) : '',
      url: it.link,                 // <-- the field your site's "Read Full Article" button needs
      category,
      emoji: emojiFor(category),
      timestamp: it.pubDate ? Timestamp.fromDate(new Date(it.pubDate)) : Timestamp.now(),
    }, {merge: true});
    written++;
  });

  await batch.commit();
  return {written, purged: staleSnap.size};
}

// Runs automatically every 3 hours.
exports.refreshGta6News = onSchedule(
  {schedule: 'every 3 hours', timeZone: 'America/New_York'},
  async () => {
    const result = await syncNews();
    console.log(`[refreshGta6News] wrote ${result.written} articles, purged ${result.purged} stale.`);
  }
);

// Optional: hit this URL manually (e.g. from a browser or curl) to force a sync
// without waiting for the schedule — handy for testing after you deploy.
exports.refreshGta6NewsManual = onRequest(async (req, res) => {
  try {
    const result = await syncNews();
    res.status(200).json({ok: true, ...result});
  } catch (e) {
    console.error(e);
    res.status(500).json({ok: false, error: e.message});
  }
});
