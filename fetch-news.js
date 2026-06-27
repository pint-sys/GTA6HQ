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
const BLOCKLIST = ["scam", "fake", "giveaway", "free hack", "leaked download"];

async function runNewsAutomation() {
  try {
    console.log("Fetching live GTA 6 streams...");
    const feedUrl = "https://www.reddit.com/r/GTA6/new.json?limit=15";
    const response = await axios.get(feedUrl, { headers: { 'User-Agent': 'GTA6HQ-Bot/1.0' } });
    const articles = response.data.data.children;

    for (let item of articles) {
      const post = item.data;
      const title = post.title;
      const originalUrl = `https://www.reddit.com${post.permalink}`;

      const containsSpam = BLOCKLIST.some(word => title.toLowerCase().includes(word));
      if (containsSpam) continue;

      // Deterministic deduplication ID mapping
      const uniqueDocId = Buffer.from(originalUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, "").substring(0, 40);
      const docReference = db.collection("automated_news").doc(uniqueDocId);
      const docSnapshot = await docReference.get();

      if (!docSnapshot.exists) {
        let imagePreview = "img/news-placeholder.jpg"; 
        if (post.thumbnail && post.thumbnail.startsWith("http")) {
          imagePreview = post.thumbnail;
        }

        await docReference.set({
          title: title,
          url: originalUrl,
          tag: post.link_flair_text ? post.link_flair_text.toLowerCase() : "news",
          time: new Date(post.created_utc * 1000).toLocaleDateString(),
          img: imagePreview,
          timestamp: admin.FieldValue.serverTimestamp()
        });
        console.log(`Added: ${title}`);
      }
    }
    console.log("Done!");
  } catch (error) {
    console.error("Execution failed:", error);
    process.exit(1);
  }
}

runNewsAutomation();
