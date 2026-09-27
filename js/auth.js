// =========================================================
// QuizForge — Authentication
// Loaded as an ES module (see <script type="module"> in HTML).
// =========================================================

import { getAuth, getFirestore } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/**
 * Creates a new account, applies the display name, and writes the shared
 * /users/{uid} profile doc — the same doc your other tools (Toolify,
 * CheckMate) read and write, so identity stays consistent across tools.
 * @param {{name: string, email: string, password: string}} details
 * @returns {Promise<import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js").User>}
 */
export async function signUpUser({ name, email, password }) {
  const auth = getAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }

  // Shared profile doc — required fields only, matches the existing
  // /users/{userId} rules so this never gets rejected by them.
  await setDoc(
    doc(getFirestore(), "users", credential.user.uid),
    {
      uid: credential.user.uid,
      displayName: name || credential.user.email.split("@")[0],
      email: credential.user.email,
    },
    { merge: true }
  );

  return credential.user;
}

/**
 * Signs an existing user in.
 * @param {{email: string, password: string}} details
 */
export async function loginUser({ email, password }) {
  const auth = getAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Signs the current user out. */
export function logoutUser() {
  return signOut(getAuth());
}

/** Synchronous read of the current user (null before Firebase resolves the session). */
export function getCurrentUser() {
  return getAuth().currentUser;
}

/**
 * Subscribes to auth state changes and keeps the shared navbar in sync.
 * Returns the unsubscribe function.
 */
export function handleAuthState(callback) {
  return onAuthStateChanged(getAuth(), (user) => {
    if (typeof window.updateAuthNavigation === "function") {
      window.updateAuthNavigation(user);
    }
    if (typeof callback === "function") callback(user);
  });
}

/** Redirects signed-out visitors away from a page that requires a session. */
export function protectPage(redirectTo = "login.html") {
  return handleAuthState((user) => {
    if (!user) window.location.href = redirectTo;
  });
}

/** Redirects an already-signed-in visitor away from login/signup. */
export function redirectIfAuthenticated(redirectTo = "dashboard.html") {
  return handleAuthState((user) => {
    if (user) window.location.href = redirectTo;
  });
}

// Every page that loads this module keeps the navbar's auth state current,
// even pages that don't call protectPage()/redirectIfAuthenticated().
handleAuthState();

// Exposed for inline page scripts that prefer not to use bare imports.
window.QFAuth = {
  signUpUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  protectPage,
  redirectIfAuthenticated,
  handleAuthState,
};
