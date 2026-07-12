// api/fetch-news.js
const Parser = require('rss-parser');

// rss-parser needs these custom fields to extract images
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: false }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'content:encoded'],
    ]
  }
});

const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'gta6hq-befa7';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const FEEDS = [
  'https://www.rockpapershotgun.com/feed',
  'https://www.eurogamer.net/feed',
  'https://kotaku.com/rss',
  'https://www.pcgamer.com/rss/',
  'https://feeds.feedburner.com/ign/all',
  'https://www.gamespot.com/feeds/mashup/',
  'https://www.vg247.com/feed',
  'https://www.gamesradar.com/rss/',
  'https://screenrant.com/feed/',
  'https://www.polygon.com/rss/index.xml',
];

const GTA6_KEYWORDS = [
  // GTA 6
  'gta 6', 'gta6', 'gta vi', 'grand theft auto 6', 'grand theft auto vi',
  'rockstar', 'rockstar games', 'vice city', 'lucia', 'jason', 'leonida',
  'gta6hq', 'next gta', 'take-two', 'take two interactive',
  // GTA 5 / GTA Online
  'gta 5', 'gta5', 'gta v', 'gtav', 'grand theft auto 5', 'grand theft auto v',
  'gta online', 'los santos', 'trevor', 'michael', 'franklin',
  'grove street', 'san andreas',
];

// category values MUST match the site's CSS classes and filter tab values
function detectCategory(text) {
  if (text.includes('character') || text.includes('lucia') || text.includes('jason')) return 'characters';
  if (text.includes('vehicle') || text.includes('car') || text.includes('motorcycle')) return 'vehicles';
  if (text.includes('map') || text.includes('leonida') || text.includes('vice city') || text.includes('location')) return 'map';
  if (text.includes('gameplay') || text.includes('mechanic') || text.includes('mission')) return 'gameplay';
  if (text.includes('trailer') || text.includes('teaser') || text.includes('reveal')) return 'trailer';
  if (text.includes('rumor') || text.includes('rumour') || text.includes('leak')) return 'rumor';
  if (text.includes('official') || text.includes('release') || text.includes('confirmed') || text.includes('announcement')) return 'official';
  if (text.includes('music') || text.includes('soundtrack') || text.includes('radio')) return 'music';
  if (text.includes('multiplayer') || text.includes('online') || text.includes('co-op')) return 'online';
  if (text.includes('weapon') || text.includes('gun') || text.includes('combat')) return 'weapons';
  if (text.includes('pc') || text.includes('steam') || text.includes('system requirements')) return 'pc';
  if (text.includes('gta 5') || text.includes('gta v') || text.includes('gtav') || text.includes('gta online')) return 'gta5';
  return 'update';
}

const EMOJI = {
  official:   '🚀',
  rumor:      '🕵️',
  map:        '🗺️',
  characters: '🎮',
  vehicles:   '🚗',
  gameplay:   '🎯',
  update:     '📰',
  trailer:    '🎬',
  music:      '🎵',
  online:     '🌐',
  weapons:    '🔫',
  pc:         '💻',
  gta5:       '5️⃣',
};

// Extract a real image from an RSS item
function extractImage(item) {
  if (item['media:content']) {
    const mc = item['media:content'];
    if (mc.$ && mc.$.url) return mc.$.url;
    if (mc.url) return mc.url;
  }
  if (item['media:thumbnail']) {
    const mt = item['media:thumbnail'];
    if (mt.$ && mt.$.url) return mt.$.url;
    if (mt.url) return mt.url;
  }
  if (item.enclosure && item.enclosure.url) {
    if (!item.enclosure.type || item.enclosure.type.startsWith('image/')) {
      return item.enclosure.url;
    }
  }
  const content = item['content:encoded'] || item.content || '';
  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match && match[1]) return match[1];
  }
  const snippet = item.contentSnippet || '';
  const ogMatch = snippet.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp|gif)/i);
  if (ogMatch) return ogMatch[0];
  return null;
}

module.exports = async function handler(req, res) {
  console.log('🔍 Fetching GTA news...');
  let allArticles = [];

  for (const feed of FEEDS) {
    try {
      const source = new URL(feed).hostname.replace('www.', '');
      const parsedFeed = await parser.parseURL(feed);

      for (const item of parsedFeed.items.slice(0, 15)) {
        const combined = `${item.title} ${item.contentSnippet || ''}`.toLowerCase();

        if (GTA6_KEYWORDS.some(kw => combined.includes(kw))) {
          const category = detectCategory(combined);
          const imageUrl = extractImage(item);

          allArticles.push({
            title:     item.title,
            url:       item.link,
            excerpt:   (item.contentSnippet || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').slice(0, 200),
            source:    source,
            timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            category:  category,
            emoji:     EMOJI[category] || '📰',
            imageUrl:  imageUrl || null,
            id:        Buffer.from(item.link).toString('base64').replace(/[/+=]/g, '_').slice(0, 60),
          });
        }
      }
    } catch (e) {
      console.error(`❌ Failed ${feed}: ${e.message}`);
    }
  }

  // Remove duplicates by id (safety net)
  const seen = new Set();
  allArticles = allArticles.filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  console.log(`📰 Found ${allArticles.length} articles`);

  let saved = 0;
  const errors = [];

  if (!FIREBASE_API_KEY) {
    console.warn('⚠️ FIREBASE_API_KEY not set — skipping Firestore write');
  } else if (allArticles.length > 0) {
    const savePromises = allArticles.map(async (article) => {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/automated_news/${article.id}?key=${FIREBASE_API_KEY}`;

      const fields = {
        title:     { stringValue: article.title },
        url:       { stringValue: article.url },
        excerpt:   { stringValue: article.excerpt },
        source:    { stringValue: article.source },
        timestamp: { timestampValue: article.timestamp },
        category:  { stringValue: article.category },
        emoji:     { stringValue: article.emoji },
      };

      if (article.imageUrl) {
        fields.imageUrl = { stringValue: article.imageUrl };
      }

      try {
        const resp = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });
        if (resp.ok) {
          saved++;
        } else {
          const body = await resp.text();
          console.error(`❌ Firestore rejected "${article.title}": ${resp.status} ${body}`);
          errors.push({ title: article.title, status: resp.status, detail: body.slice(0, 300) });
        }
      } catch (e) {
        console.error(`❌ Network error saving "${article.title}": ${e.message}`);
        errors.push({ title: article.title, status: 0, detail: e.message });
      }
    });

    await Promise.all(savePromises);
    console.log(`✅ Saved ${saved}/${allArticles.length} articles to Firestore (${errors.length} failed)`);
  }

  res.status(200).json({
    success: !!FIREBASE_API_KEY && errors.length === 0,
    found: allArticles.length,
    saved: saved,
    failed: errors.length,
    errors: errors.slice(0, 5),
    withImages: allArticles.filter(a => a.imageUrl).length,
    message: FIREBASE_API_KEY
      ? `Found ${allArticles.length}, saved ${saved}, failed ${errors.length}.`
      : 'FIREBASE_API_KEY environment variable is missing in Vercel. Nothing was saved.'
  });
};
