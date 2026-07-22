// firebase-config.js
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Robust auth state listener with debug logging
export function monitorAuthState(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("✅ AUTH DEBUG — User signed in:");
      console.log("  Email:", user.email);
      console.log("  UID:", user.uid);
      checkAdminStatus(user.uid).then((isAdmin) => {
        console.log("  isAdmin():", isAdmin);
        callback({ user, isAdmin });
      });
    } else {
      console.log("❌ AUTH DEBUG — No user signed in");
      callback({ user: null, isAdmin: false });
    }
  });
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
      console.log("  → You need to create a /users/" + uid + " document with { admin: true }");
      return false;
    }
  } catch (error) {
    console.error("❌ AUTH DEBUG — Error checking admin status:", error.code, error.message);
    return false;
  }
}

// ✅ Create or update user document on first login
export async function createUserDocument(user) {
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists()) {
    const userData = {
      email: user.email,
      uid: user.uid,
      admin: false,        // default: NOT admin
      role: "user",
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(userDocRef, userData);
      console.log("✅ AUTH DEBUG — User document created:", user.uid);
    } catch (error) {
      console.error("❌ AUTH DEBUG — Error creating user doc:", error.message);
    }
  }
}
