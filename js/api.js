// =========================================================
// QuizForge — Backend API helper
// Wraps fetch() to attach the signed-in user's Firebase ID
// token, so /api/* routes can verify the caller server-side
// instead of trusting a client-supplied user ID.
// =========================================================

import { getAuth } from "./firebase.js";

/**
 * Calls a same-origin /api/* route with the caller's Firebase ID token.
 * @param {string} path e.g. "/api/generate-quiz"
 * @param {{method?: string, body?: FormData|object, signal?: AbortSignal}} options
 */
export async function callApi(path, { method = "POST", body, signal } = {}) {
  const user = getAuth().currentUser;
  if (!user) throw new Error("You need to be signed in to do that.");

  const idToken = await user.getIdToken();
  const headers = { Authorization: `Bearer ${idToken}` };

  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(path, { method, headers, body: payload, signal });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
