// api/fetch-news.js
const Parser = require('rss-parser');
const parser = new Parser();

const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'gta6hq-befa7';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const FEEDS = [
  'https://www.rockpapershotgun.com/feed',
  'https://www.eurogamer.net/feed',
  'https://kotaku.com/rss',
  'https://www.pcgamer.com/rss/',
  'https://feeds.feedburner.com/ign/all',
  'https://www.gamespot.com/feeds/mashup/'
];

const GTA6_KEYWORDS = [
  'gta 6', 'gta6', 'grand theft auto 6', 'grand theft auto vi',
  'rockstar', 'vice city', 'lucia', 'jason', 'leonida'
];

function detectCategory(text) {
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic')) return 'gameplay';
  if (text.includes('rumor') || text.includes('leak')) return 'rumors';
  if (text.includes('official') || text.includes('release')) return 'official';
  return 'community';
}

module.exports = async function handler(req, res) {
  console.log(' Fetching GTA 6 news...');
  let allArticles = [];

  for (const feed of FEEDS) {
    try {
      const source = new URL(feed).hostname.replace('www.', '');
      const parsedFeed = await parser.parseURL(feed);
      
      for (const item of parsedFeed.items.slice(0, 5)) {
        const combined = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();
        
        if (GTA6_KEYWORDS.some(kw => combined.includes(kw))) {
          allArticles.push({
            title: item.title,
            link: item.link,
            excerpt: (item.contentSnippet || '').replace(/<[^>]+>/g, '').slice(0, 200),
            source: source,
            timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            category: detectCategory(combined),
            id: Buffer.from(item.link).toString('base64').slice(0, 20),
          });
        }
      }
    } catch (e) {
      console.error(`❌ Failed ${feed}: ${e.message}`);
    }
  }

  // Save to Firestore
  const savePromises = allArticles.map(async (article) => {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/automated_news/${article.id}?key=${FIREBASE_API_KEY}`;
    
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          title:     { stringValue: article.title },
          link:      { stringValue: article.link },
          excerpt:   { stringValue: article.excerpt },
          source:    { stringValue: article.source },
          timestamp: { timestampValue: article.timestamp },
          category:  { stringValue: article.category },
        }
      })
    });
  });

  await Promise.all(savePromises);

  res.status(200).json({ 
    success: true, 
    message: `Updated ${allArticles.length} articles.` 
  });
};
