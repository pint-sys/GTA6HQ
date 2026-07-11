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
  'rockstar', 'vice city', 'lucia', 'jason', 'leonida' 'gta vi', 'gta6hq', 'rockstar games', 'trevor', 'next gta',
  'open world', 'take-two', 'take two interactive', 'gta 5', 'gta v' 
];

// category values MUST match the site's CSS classes (.nl-tag.official/.rumor/.update/
// .characters/.vehicles/.map/.gameplay) and its filter tab values — NOT 'rumors'/'community'.
function detectCategory(text) {
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic')) return 'gameplay';
  if (text.includes('rumor') || text.includes('leak')) return 'rumor';
  if (text.includes('official') || text.includes('release')) return 'official';
  return 'update';
}

const EMOJI = {
  official: '🚀', rumor: '🕵️', map: '🗺️', characters: '🎮',
  vehicles: '🚗', gameplay: '🎯', update: '📰'
};

module.exports = async function handler(req, res) {
  console.log('🔍 Fetching GTA 6 news...');
  let allArticles = [];
  for (const feed of FEEDS) {
    try {
      const source = new URL(feed).hostname.replace('www.', '');
      const parsedFeed = await parser.parseURL(feed);

      for (const item of parsedFeed.items.slice(0, 15)) {
        const combined = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();

        if (GTA6_KEYWORDS.some(kw => combined.includes(kw))) {
          const category = detectCategory(combined);
          allArticles.push({
            title: item.title,
            url: item.link, // <-- renamed from 'link' to match the site's news.js
           excerpt: (item.contentSnippet || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').slice(0, 200),
            source: source,
           // Add this import at the top of your file
const { Timestamp } = require('firebase-admin/firestore');
// or if using firebase (not admin):
const { Timestamp } = require('firebase/firestore');

// Then change line 54 to:
timestamp: item.pubDate ? Timestamp.fromDate(new Date(item.pubDate)) : Timestamp.now(),
            category: category,
            emoji: EMOJI[category] || '📰',
            id: Buffer.from(item.link).toString('base64').replace(/[/+=]/g, '_').slice(0, 60),
          });
        }
      }
    } catch (e) {
      console.error(`❌ Failed ${feed}: ${e.message}`);
    }
  }

  if (allArticles.length > 0 && FIREBASE_API_KEY) {
    const savePromises = allArticles.map(async (article) => {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/automated_news/${article.id}?key=${FIREBASE_API_KEY}`;

      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            title:     { stringValue: article.title },
            url:       { stringValue: article.url },
            excerpt:   { stringValue: article.excerpt },
            source:    { stringValue: article.source },
            timestamp: { timestampValue: article.timestamp },
            category:  { stringValue: article.category },
            emoji:     { stringValue: article.emoji },
          }
        })
      });
    });
    await Promise.all(savePromises);
  }

  res.status(200).json({
    success: true,
    message: `Updated ${allArticles.length} articles.`
  });
};
