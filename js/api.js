import { getAuth } from "./firebase.js";

const API_BASE = "https://quizforge-orpin.vercel.app";

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

  const res = await fetch(`${API_BASE}${path}`, { 
    method, 
    headers, 
    body: payload, 
    signal 
  });
  
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}
