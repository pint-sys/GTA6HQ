// fetch-news.js
const https = require('https');

// ── CONFIG ──────────────────────────────────────────────
const FIREBASE_PROJECT = 'gta6hq-5b56a';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY; // set in GitHub Secrets

// RSS feeds to scrape (GTA 6 related)
const FEEDS = [
  'https://www.rockpapershotgun.com/feed',
  'https://www.eurogamer.net/feed',
  'https://kotaku.com/rss',
  'https://www.pcgamer.com/rss/',
];

const GTA6_KEYWORDS = [
  'gta 6','gta6','grand theft auto 6','grand theft auto vi',
  'rockstar','vice city','lucia','jason','leonida'
];

// ── HELPERS ─────────────────────────────────────────────
function fetchURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'GTA6HQ-Bot/1.0' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseRSS(xml, source) {
  const items = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

  for (const item of itemMatches) {
    const get = tag => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };

    const title   = get('title');
    const link    = get('link');
    const excerpt = get('description').replace(/<[^>]+>/g, '').slice(0, 200);
    const pubDate = get('pubDate');

    // filter for GTA 6 related only
    const combined = (title + ' ' + excerpt).toLowerCase();
    if (!GTA6_KEYWORDS.some(kw => combined.includes(kw))) continue;

    items.push({
      title,
      link,
      excerpt,
      source,
      timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category: detectCategory(combined),
      id: Buffer.from(link).toString('base64').slice(0, 20),
    });
  }
  return items;
}

function detectCategory(text) {
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic')) return 'gameplay';
  if (text.includes('rumor') || text.includes('leak')) return 'rumor';
  if (text.includes('official') || text.includes('rockstar')) return 'official';
  return 'update';
}

// ── FIRESTORE REST API ───────────────────────────────────
async function saveToFirestore(articles) {
  for (const article of articles) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/automated_news/${article.id}?key=${FIREBASE_API_KEY}`;

    const body = JSON.stringify({
      fields: {
        title:     { stringValue: article.title },
        link:      { stringValue: article.link },
        excerpt:   { stringValue: article.excerpt },
        source:    { stringValue: article.source },
        timestamp: { timestampValue: article.timestamp },
        category:  { stringValue: article.category },
      }
    });

    await new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const req = https.request({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`✅ Saved: ${article.title.slice(0, 60)}`);
          resolve();
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}

// ── MAIN ────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching GTA 6 news...');
  let allArticles = [];

  for (const feed of FEEDS) {
    try {
      const source = new URL(feed).hostname.replace('www.', '');
      console.log(`📡 Scraping ${source}...`);
      const xml = await fetchURL(feed);
      const articles = parseRSS(xml, source);
      console.log(`  → Found ${articles.length} GTA 6 articles`);
      allArticles = allArticles.concat(articles);
    } catch (e) {
      console.error(`❌ Failed ${feed}: ${e.message}`);
    }
  }

  console.log(`\n📰 Total articles: ${allArticles.length}`);

  if (allArticles.length > 0 && FIREBASE_API_KEY) {
    await saveToFirestore(allArticles);
    console.log('✅ Done! Firestore updated.');
  } else if (!FIREBASE_API_KEY) {
    console.log('⚠️  No FIREBASE_API_KEY — skipping Firestore write.');
    console.log(JSON.stringify(allArticles, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
