// =========================================================
// QuizForge — Firebase bootstrap
// Loaded as an ES module. Never put the Groq key here —
// this file only talks to Firebase, which is safe client-side.
// =========================================================

import {
  initializeApp,
  getApps,
  getApp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth as _getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore as _getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// TODO: paste your project's config back in here (Firebase console → Project settings).
// This is the SAME Firebase project your other tools (Toolify, CheckMate, Day Passer) use —
// QuizForge shares the /users/{uid} profile doc with them.
// This config is public by design — Firebase access is locked down by
// Firestore Security Rules, not by hiding these values.
const firebaseConfig = {
  apiKey: "AIzaSyAoj4yHcaRW4wdOPA7SrZhGQZqAobHDdB0",
  authDomain: "toolbox-hub-98c03.firebaseapp.com",
  databaseURL: "https://toolbox-hub-98c03-default-rtdb.firebaseio.com",
  projectId: "toolbox-hub-98c03",
  storageBucket: "toolbox-hub-98c03.firebasestorage.app",
  messagingSenderId: "321020105472",
  appId: "1:321020105472:web:698ba3bf9dfe75add859e5"
};

/** Initializes (once) and returns the Firebase app instance. */
export function initializeFirebase() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Returns the shared Firebase Auth instance. */
export function getAuth() {
  return _getAuth(initializeFirebase());
}

/** Returns the shared Firestore instance. */
export function getFirestore() {
  return _getFirestore(initializeFirebase());
}
