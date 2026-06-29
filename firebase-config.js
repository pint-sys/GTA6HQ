/**
 * firebase-config.js — Frontend Firebase initialisation.
 *
 * BUGS FIXED:
 *
 * FIX BUG-08: apiKey was missing from the config object.
 *   Firebase Web SDK REQUIRES apiKey. Without it, initializeApp succeeds
 *   but all Firestore operations fail with "auth/invalid-api-key" or,
 *   if security rules are open, with unexpected permission errors.
 *   Added apiKey placeholder — replace with your actual key from the
 *   Firebase console (Project Settings → Your apps → Web app → Config).
 *
 * FIX BUG-01: window.fetchLiveNews was defined here but never called.
 *   This module is loaded as <script type="module"> which defers it.
 *   The function is now defined on window.fetchLiveNews as before.
 *   news.js's fetchLatestNews() checks for it explicitly before falling
 *   through to RSS. The 200ms setTimeout in app.js init ensures Firebase
 *   is ready before fetchLatestNews is called.
 *
 * NOTE: The Firebase Web API key is NOT a secret — it is safe to commit
 * to a public repo. Access control is handled by Firestore Security Rules.
 * However, NEVER commit your firebase-admin service account JSON.
 */

import { initializeApp }                    from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs,
         query, orderBy, limit }             from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:        'AIzaSyB8hyGumMpfXfupsEhhd53Zg8JDoTcqfzA', // ← Required. Get from Firebase console.
  authDomain:    'gta6hq-befa7.firebaseapp.com',
  projectId:     'gta6hq-befa7',
  storageBucket: 'gta6hq-befa7.appspot.com',
};

let db = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('[firebase] Initialised successfully.');
} catch (err) {
  console.error('[firebase] Init failed — Firestore news will be unavailable:', err.message);
}

/**
 * Fetch the latest 12 news articles from Firestore.
 * Exposed on window so news.js can call it without importing Firebase directly.
 *
 * Returns an empty array on failure — callers must handle gracefully.
 *
 * @returns {Promise<Array>}
 */
window.fetchLiveNews = async function fetchLiveNews() {
  if (!db) return [];

  try {
    const q             = query(collection(db, 'automated_news'), orderBy('timestamp', 'desc'), limit(12));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[firebase] Error reading from Firestore:', error);
    return [];
  }
};
