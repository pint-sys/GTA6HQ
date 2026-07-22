// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey:        'AIzaSyB8hyGumMpfXfupsEhhd53Zg8JDoTcqfzA', // ← Required. Get from Firebase console.
  authDomain:    'gta6hq-befa7.firebaseapp.com',
  projectId:     'gta6hq-befa7',
  apiKey: 'AIzaSyB8hyGumMpfXfupsEhhd53Zg8JDoTcqfzA',
  authDomain: 'gta6hq-befa7.firebaseapp.com',
  projectId: 'gta6hq-befa7',
  storageBucket: 'gta6hq-befa7.appspot.com
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Create or update user document on first login
export async function createUserDocument(user) {
  try {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      const userData = {
        email: user.email || "no-email-provided",
        uid: user.uid,
        admin: false,
        role: "user",
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, userData);
      console.log("✅ AUTH DEBUG — User document created:", user.uid);
    } else {
      console.log("ℹ️ AUTH DEBUG — User document already exists:", user.uid);
    }
  } catch (error) {
    console.error("❌ AUTH DEBUG — Error creating user doc:", error.code, error.message);
  }
}

// ✅ Check admin status from Firestore user document
export async function checkAdminStatus(uid) {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      console.log("  Firestore user doc data:", data);
      return data.admin === true || data.role === "admin";
    } else {
      console.log("⚠️ AUTH DEBUG — No Firestore document found for UID:", uid);
      console.log("  → Create /users/" + uid + " document with { admin: true }");
      return false;
    }
  } catch (error) {
    console.error("❌ AUTH DEBUG — Error checking admin status:", error.code, error.message);
    return false;
  }
}

// ✅ Robust auth state listener with debug logging
export function monitorAuthState(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("✅ AUTH DEBUG — User signed in:");
      console.log("  Email:", user.email);
      console.log("  UID:", user.uid);

      await createUserDocument(user);
      const isAdmin = await checkAdminStatus(user.uid);
      console.log("  isAdmin():", isAdmin);
      callback({ user, isAdmin });
    } else {
      console.log("❌ AUTH DEBUG — No user signed in");
      callback({ user: null, isAdmin: false });
    }
  });
}
