import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { env, validateEnvironment } from "./env";

// Export the Firebase configuration object
export const firebaseConfig = {
  apiKey: env.firebase.apiKey,
  authDomain: env.firebase.authDomain,
  projectId: env.firebase.projectId,
  storageBucket: env.firebase.storageBucket,
  messagingSenderId: env.firebase.messagingSenderId,
  appId: env.firebase.appId,
  measurementId: env.firebase.measurementId,
};

let appInstance: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let isFirebaseInitialized = false;
let initErrorMessage: string | null = null;

try {
  // Validate configuration before calling initializeApp
  const validation = validateEnvironment();
  if (!validation.isValid) {
    initErrorMessage = `Missing required Firebase configuration: ${validation.missingVariables.join(", ")}. Please configure VITE_* variables in Cloudflare/Build settings.`;
    console.error("[Firebase Init Warning]", initErrorMessage);
  }

  // Ensure apiKey has a fallback string so initializeApp does not throw a fatal syntax error
  const safeConfig = {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey || "AIzaSyDummyKeyForBuildValidationOnly12345",
  };

  appInstance = getApps().length > 0 ? getApp() : initializeApp(safeConfig);
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);
  isFirebaseInitialized = validation.isValid;
} catch (error: any) {
  initErrorMessage = error?.message || "Failed to initialize Firebase services.";
  console.error("[Firebase Initialization Error]:", error);

  // Fallback to prevent top-level module crash
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp({
      apiKey: "AIzaSyDummyFallbackKey0000000000000000000",
      authDomain: "ai-verse-54c65.firebaseapp.com",
      projectId: "ai-verse-54c65",
      storageBucket: "ai-verse-54c65.firebasestorage.app",
      messagingSenderId: "457448123889",
      appId: "1:457448123889:web:78c4c286d63f6227db2850",
    });
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
  } catch (fallbackErr) {
    console.error("[Firebase Critical Fallback Error]:", fallbackErr);
    // As last resort, cast empty objects to avoid breaking module imports
    appInstance = {} as FirebaseApp;
    authInstance = {} as Auth;
    dbInstance = {} as Firestore;
    storageInstance = {} as FirebaseStorage;
  }
}

export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export const isReady = isFirebaseInitialized;
export const initializationError = initErrorMessage;

// Initialize Analytics conditionally
export const analyticsPromise: Promise<Analytics | null> = (async () => {
  try {
    if (typeof window !== "undefined" && isFirebaseInitialized) {
      const supported = await isSupported();
      return supported ? getAnalytics(app) : null;
    }
    return null;
  } catch (e) {
    console.warn("[Firebase Analytics] Not initialized:", e);
    return null;
  }
})();
