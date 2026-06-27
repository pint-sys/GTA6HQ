const admin = require("firebase-admin");
const axios = require("axios");

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  admin.initializeApp({ projectId: "gta6hq-community" });
}

const db = admin.firestore();
const BLOCKLIST = ["scam", "fake", "giveaway", "free hack", "leaked download", "clickbait"];

async function runNewsAutomation() {
  try {
    console.log("Fetching live, verified GTA 6 news feeds...");
    
    // Using a fully open Google News RSS-to-JSON feed for GTA 6 (Highly reliable)
    const feedUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.google.com%2Frss%2Fsearch%3Fq%3DGTA%2B6%26hl%3Den-US%26gl%3DUS%26ceid%3DUS%3Aen";
    const response = await axios.get(feedUrl);
    
    const items = response.data.items || [];
    console.log(`Found ${items.length} raw articles to process.`);

    for (let item of items) {
      const title = item.title;
      const originalUrl = item.link;

      // 1. FILTRATION Engine
      const containsSpam = BLOCKLIST.some(word => title.toLowerCase().includes(word));
      if (containsSpam) {
        console.log(`Filtered out spam post: ${title}`);
        continue;
      }

      // 2. DEDUPLICATION Engine using unique clean URL hashes
      const uniqueDocId = Buffer.from(originalUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, "").substring(0, 40);
      const docReference = db.collection("automated_news").doc(uniqueDocId);
      const docSnapshot = await docReference.get();

      if (!docSnapshot.exists) {
        // Fallback placeholder image since Google RSS feeds are text-only
        let imagePreview = "img/news-placeholder.jpg"; 

        await docReference.set({
          title: title,
          url: originalUrl,
          tag: "news",
          time: new Date(item.pubDate).toLocaleDateString(),
          img: imagePreview,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Successfully Added Fresh Content: ${title}`);
      } else {
        console.log(`Duplicate Skipped: ${title}`);
      }
    }
    console.log("Automation synchronization finished cleanly!");
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}

runNewsAutomation();
