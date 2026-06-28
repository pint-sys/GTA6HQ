const admin = require("firebase-admin");
const https = require("https"); // built-in — no install needed, replaces axios

// ── Firebase init ─────────────────────────────────────────────────────────────
try {
  const credential = process.env.FIREBASE_SERVICE_ACCOUNT
    ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    : admin.credential.applicationDefault(); // fallback for local dev

  admin.initializeApp({ credential, projectId: "gta6hq-community" });
} catch (err) {
  console.error("Firebase init failed:", err.message);
  process.exit(1); // can't continue without a DB connection
}

const db = admin.firestore();

const BLOCKLIST = [
  "scam", "fake", "giveaway", "free hack",
  "leaked download", "clickbait", "cheat engine", "mod menu"
];

// ── tiny https GET → JSON helper (replaces axios, zero extra deps) ────────────
function httpsGetJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = "";
      res.on("data", (chunk) => { raw += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error("JSON parse error: " + e.message)); }
      });
    }).on("error", reject);
  });
}

// ── main ──────────────────────────────────────────────────────────────────────
async function runNewsAutomation() {
  console.log("Fetching live GTA 6 news feeds...");

  const feeds = [
    "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss/search?q=GTA+6+Rockstar+Games&hl=en-US&gl=US&ceid=US:en"),
    "https://api.rss2json.com/v1/api.json?rss_url=" +
      encodeURIComponent("https://news.google.com/rss/search?q=Grand+Theft+Auto+VI&hl=en-US&gl=US&ceid=US:en"),
  ];

  let totalAdded   = 0;
  let totalSkipped = 0;

  for (const feedUrl of feeds) {
    let data;
    try {
      data = await httpsGetJSON(feedUrl);
    } catch (err) {
      // One feed failing should NOT kill the whole job
      console.warn(`Feed fetch failed (${feedUrl}): ${err.message} — continuing.`);
      continue;
    }

    if (!data || data.status !== "ok" || !Array.isArray(data.items)) {
      console.warn("Feed returned no usable items — skipping.");
      continue;
    }

    console.log(`Found ${data.items.length} raw articles.`);

    for (const item of data.items) {
      const title       = (item.title || "").replace(/<[^>]*>/g, "").trim();
      const originalUrl = item.link || "";

      if (!title || !originalUrl) continue;

      // 1. Spam filter
      if (BLOCKLIST.some((w) => title.toLowerCase().includes(w))) {
        console.log(`Filtered spam: ${title}`);
        continue;
      }

      // 2. Deduplication via URL-based doc ID
      const uniqueDocId = Buffer.from(originalUrl)
        .toString("base64")
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 40);

      try {
        const docRef  = db.collection("automated_news").doc(uniqueDocId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          await docRef.set({
            title,
            url:       originalUrl,
            tag:       "news",
            time:      new Date(item.pubDate || Date.now()).toLocaleDateString(),
            img:       "img/news-placeholder.jpg",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Added: ${title}`);
          totalAdded++;
        } else {
          console.log(`Duplicate skipped: ${title}`);
          totalSkipped++;
        }
      } catch (dbErr) {
        // One bad write should NOT abort everything
        console.warn(`Firestore write failed for "${title}": ${dbErr.message} — continuing.`);
      }
    }
  }

  console.log(`Done — ${totalAdded} added, ${totalSkipped} duplicates skipped.`);
  // No process.exit(1) here — let Node exit naturally with code 0
}

runNewsAutomation().catch((err) => {
  console.error("Unexpected fatal error:", err);
  process.exit(1);
});
