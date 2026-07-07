import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9eYytrVSNVbAMp58rrWxpNm730b68N6U",
  authDomain: "ai-verse-54c65.firebaseapp.com",
  projectId: "ai-verse-54c65",
  storageBucket: "ai-verse-54c65.firebasestorage.app",
  messagingSenderId: "457448123889",
  appId: "1:457448123889:web:78c4c286d63f6227db2850",
  measurementId: "G-VH65XQLDS2"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Initialize Analytics conditionally
export const analyticsPromise = isSupported().then((supported) => {
  return supported ? getAnalytics(app) : null;
});
