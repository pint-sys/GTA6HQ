// fetch-news.js
const Parser = require('rss-parser');
const admin = require('firebase-admin');

// 1. Initialize Firebase Admin securely using GitHub Secrets
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const parser = new Parser();

// 2. Expanded Feeds (Added IGN & GameSpot to match your FAQ)
const FEEDS = [
  { url: 'https://www.rockpapershotgun.com/feed', name: 'rockpapershotgun.com' },
  { url: 'https://www.eurogamer.net/feed', name: 'eurogamer.net' },
  { url: 'https://kotaku.com/rss', name: 'kotaku.com' },
  { url: 'https://www.pcgamer.com/rss/', name: 'pcgamer.com' },
  { url: 'https://feeds.feedburner.com/ign/all', name: 'ign.com' },
  { url: 'https://www.gamespot.com/feeds/mashup/', name: 'gamespot.com' }
];

const GTA6_KEYWORDS = [
  'gta 6', 'gta6', 'grand theft auto 6', 'grand theft auto vi',
  'rockstar', 'vice city', 'lucia', 'jason', 'leonida'
];

// 3. Categorization mapped EXACTLY to your index.html UI tabs
function detectCategory(text) {
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car') || text.includes('bike')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic')) return 'gameplay';
  if (text.includes('rumor') || text.includes('leak') || text.includes('insider')) return 'rumors';
  if (text.includes('official') || text.includes('release') || text.includes('trailer')) return 'official';
  return 'community'; // Default fallback
}

async function main() {
  console.log('🔍 Fetching GTA 6 news...');
  let allArticles = [];

  for (const feed of FEEDS) {
    try {
      console.log(`📡 Scraping ${feed.name}...`);
      const parsedFeed = await parser.parseURL(feed.url);
      
      // Limit to latest 20 items per source to avoid rate limits
      for (const item of parsedFeed.items.slice(0, 20)) { 
        const combined = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
        
        if (GTA6_KEYWORDS.some(kw => combined.includes(kw))) {
          allArticles.push({
            // ID matches your old logic for deduplication
            id: Buffer.from(item.link).toString('base64').slice(0, 20), 
            title: item.title,
            link: item.link,
            excerpt: (item.contentSnippet || '').replace(/<[^>]+>/g, '').slice(0, 200),
            source: feed.name,
            // CRITICAL: Use Firestore Timestamp object so orderBy('timestamp') works perfectly
            timestamp: admin.firestore.Timestamp.fromDate(new Date(item.pubDate || Date.now())), 
            category: detectCategory(combined)
          });
        }
      }
    } catch (e) {
      console.error(`❌ Failed ${feed.name}: ${e.message}`);
    }
  }

  console.log(`\n📰 Total GTA 6 articles found: ${allArticles.length}`);

  // 4. Batch write to Firestore (Much faster than individual REST API calls)
  if (allArticles.length > 0) {
    const batch = db.batch();
    for (const article of allArticles) {
      const docRef = db.collection('automated_news').doc(article.id);
      batch.set(docRef, article, { merge: true }); // merge: true prevents overwriting if it exists
    }
    await batch.commit();
    console.log('✅ Done! Firestore updated securely via Admin SDK.');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
