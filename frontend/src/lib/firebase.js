/**
 * Firebase Client SDK Initialization & Helpers for SWATVA Platform
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase only once
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Sign in with Google Popup
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    return {
      user: result.user,
      token,
      error: null,
    };
  } catch (error) {
    console.error('Firebase Google Sign-In Error:', error);
    return {
      user: null,
      token: null,
      error: error.message || 'Google sign-in failed',
    };
  }
}

// Sign in with Email & Password
export async function signInWithFirebaseEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    return {
      user: result.user,
      token,
      error: null,
    };
  } catch (error) {
    console.error('Firebase Email Sign-In Error:', error);
    return {
      user: null,
      token: null,
      error: error.message || 'Email sign-in failed',
    };
  }
}

// Register with Email & Password
export async function registerWithFirebaseEmail(name, email, password) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (name && result.user) {
      await updateProfile(result.user, { displayName: name });
    }
    const token = await result.user.getIdToken();
    return {
      user: result.user,
      token,
      error: null,
    };
  } catch (error) {
    console.error('Firebase Registration Error:', error);
    return {
      user: null,
      token: null,
      error: error.message || 'Registration failed',
    };
  }
}

// Sign Out
export async function firebaseSignOut() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
    return { success: false, error: error.message };
  }
}

// Optional Analytics (only supported in browser environments)
let analytics = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { analytics };
export default app;
