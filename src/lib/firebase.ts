import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// IMPORTANT:
// Replace the placeholder values below with your real Firebase project config.
// You can find these in the Firebase console under:
// Project Settings → Your apps → SDK setup and configuration → "Config" tab.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Ensure we don't re-initialize the app on hot reload in dev
let app;
try {
  if (getApps().length > 0) {
    app = getApp();
  } else if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
  } else {
    // During build time on Vercel, env vars might be missing.
    // We initialize with a dummy to prevent crashes, but it won't work until keys are added.
    app = initializeApp({ 
      apiKey: "temporary-build-key",
      projectId: "temporary-build-id" 
    });
  }
} catch (e) {
  app = getApp();
}

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

