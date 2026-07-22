import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyB8hyGumMpfXfupsEhhd53Zg8JDoTcqfzA',
  authDomain: 'gta6hq-befa7.firebaseapp.com',
  projectId: 'gta6hq-befa7',
  storageBucket: 'gta6hq-befa7.appspot.com',
};

let db = null;
let auth = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log('[firebase] Initialised successfully.');
} catch (err) {
  console.error('[firebase] Init failed:', err.message);
}

// Global helpers attached to window
window.firebaseAuth = auth;
window.db = db;

window.checkAdmin = async function(uid) {
  if (!uid) return false;
  try {
    const s = await getDoc(doc(db, 'admins', uid));
    console.log('[admin check] uid:', uid, '-> exists:', s.exists());
    return s.exists();
  } catch(e) {
    console.error('[admin check] FAILED for uid:', uid, '-', e.code || e.message, e);
    return false;
  }
};

window.fetchLiveNews = async function() {
  if (!db) return [];
  try {
    const q = query(collection(db, 'automated_news'), orderBy('timestamp', 'desc'), limit(12));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[firebase] Error reading from Firestore:', error);
    return [];
  }
};

// Safe initialization listener to ensure authentication state is loaded before checking admin status
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('[auth] User signed in:', user.email, user.uid);
      const isAdminUser = await window.checkAdmin(user.uid);
      console.log('isAdmin():', isAdminUser);
      // Dispatch custom event for your UI to update
      window.dispatchEvent(new CustomEvent('admin-status-resolved', { detail: { isAdmin: isAdminUser, user } }));
    } else {
      console.log('[auth] No user signed in. isAdmin(): false');
      window.dispatchEvent(new CustomEvent('admin-status-resolved', { detail: { isAdmin: false, user: null } }));
    }
  });
}

window.dispatchEvent(new Event('fb-ready'));
