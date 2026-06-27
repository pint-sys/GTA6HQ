import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your public web configuration snippet
const firebaseConfig = {
  authDomain: "gta6hq-befa7.firebaseapp.com",
  projectId: "gta6hq-befa7",
  storageBucket: "gta6hq-befa7.appspot.com",
};

// Initialize frontend instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global bridge function for your main UI script
window.fetchLiveNews = async function() {
  try {
    const q = query(collection(db, "automated_news"), orderBy("timestamp", "desc"), limit(12));
    const querySnapshot = await getDocs(q);
    
    let newsItems = [];
    querySnapshot.forEach((doc) => {
      newsItems.push(doc.data());
    });
    return newsItems;
  } catch (error) {
    console.error("Error reading from Firestore database:", error);
    return [];
  }
};
