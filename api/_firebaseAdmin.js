// =========================================================
// QuizForge — Firebase Admin helper (server-side only)
// =========================================================

const admin = require("firebase-admin");

function getAdmin() {
  if (admin.apps.length) return admin;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw Object.assign(
      new Error(
        "Firebase Admin isn't configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
      ),
      { statusCode: 500 }
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  return admin;
}

/**
 * Verifies a `Bearer <idToken>` Authorization header.
 * Throws a 401 error (with .statusCode) on anything invalid.
 */
async function verifyIdToken(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw Object.assign(new Error("Missing or invalid Authorization header."), { statusCode: 401 });
  }

  const token = authHeader.slice(7);
  try {
    return await getAdmin().auth().verifyIdToken(token);
  } catch {
    throw Object.assign(new Error("Your session has expired. Please log in again."), { statusCode: 401 });
  }
}

module.exports = { getAdmin, verifyIdToken };
