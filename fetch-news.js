// fetch-news.js
const https = require('https');
const Parser = require('rss-parser'); // Install: npm install rss-parser

// ── CONFIG ──────────────────────────────────────────────
const FIREBASE_PROJECT = 'gta6hq-befa7'; // Match your firebase-config.js
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const parser = new Parser({
  customFields: {
    item: ['enclosure']
  }
});

// All major gaming outlets (added IGN & GameSpot)
const FEEDS = [
  'https://www.rockpapershotgun.com/feed',
  'https://www.eurogamer.net/feed',
  'https://kotaku.com/rss',
  'https://www.pcgamer.com/rss/',
  'https://feeds.feedburner.com/ign/all',           // Added
  'https://www.gamespot.com/feeds/mashup/',         // Added
];

const GTA6_KEYWORDS = [
  'gta 6', 'gta6', 'grand theft auto 6', 'grand theft auto vi',
  'rockstar games', 'vice city', 'lucia', 'jason', 'leonida',
  'gta vi', 'gta 6 gameplay', 'gta 6 trailer'
];

// ── HELPERS ─────────────────────────────────────────────
function detectCategory(text) {
  text = text.toLowerCase();
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car') || text.includes('bike')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic')) return 'gameplay';
  if (text.includes('rumor') || text.includes('leak') || text.includes('insider')) return 'rumors';
  if (text.includes('official') || text.includes('release') || text.includes('trailer')) return 'official';
  return 'community';
}

// ── FIRESTORE SAVE ──────────────────────────────────────
async function saveToFirestore(articles) {
  console.log(`💾 Saving ${articles.length} articles to Firestore...`);
  
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
        imageUrl:  { stringValue: article.imageUrl || '' },
      }
    });

    try {
      await new Promise((resolve, reject) => {
        const req = https.request(url, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        }, res => {
          if (res.statusCode === 200) {
            console.log(`✅ Saved: ${article.title.slice(0, 50)}...`);
            resolve();
          } else {
            let errorData = '';
            res.on('data', chunk => errorData += chunk);
            res.on('end', () => {
              console.error(`❌ Firestore error ${res.statusCode}:`, errorData);
              reject(new Error(`Firestore error: ${res.statusCode}`));
            });
          }
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } catch (err) {
      console.error(`️  Failed to save article: ${err.message}`);
    }
  }
}

// ── MAIN ────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching ACTUAL GTA 6 news from live sources...\n');
  let allArticles = [];

  for (const feedUrl of FEEDS) {
    try {
      const source = new URL(feedUrl).hostname.replace('www.', '');
      console.log(` Fetching ${source}...`);
      
      const feed = await parser.parseURL(feedUrl);
      console.log(`   Found ${feed.items.length} total articles`);
      
      // Filter for GTA 6 related only
      const gta6Articles = feed.items.filter(item => {
        const text = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
        return GTA6_KEYWORDS.some(kw => text.includes(kw));
      });
      
      console.log(`   → ${gta6Articles.length} GTA 6 related\n`);
      
      for (const item of gta6Articles.slice(0, 5)) { // Latest 5 per source
        allArticles.push({
          title: item.title,
          link: item.link,
          excerpt: (item.contentSnippet || '').replace(/<[^>]+>/g, '').slice(0, 200),
          source: source,
          timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          category: detectCategory(`${item.title} ${item.contentSnippet || ''}`),
          imageUrl: item.enclosure?.url || '',
          id: Buffer.from(item.link).toString('base64').slice(0, 20),
        });
      }
    } catch (e) {
      console.error(`❌ Failed ${feedUrl}: ${e.message}\n`);
    }
  }

  console.log(`\n📰 Total GTA 6 articles found: ${allArticles.length}`);
  
  if (allArticles.length > 0 && FIREBASE_API_KEY) {
    await saveToFirestore(allArticles);
    console.log('\n✅ Done! Live news is now active.');
  } else if (!FIREBASE_API_KEY) {
    console.log('\n⚠️  No FIREBASE_API_KEY set in GitHub Secrets');
    console.log('Articles found:', JSON.stringify(allArticles.slice(0, 3), null, 2));
  }
}

main().catch(e => { 
  console.error('💥 Pipeline crashed:', e); 
  process.exit(1); 
});
