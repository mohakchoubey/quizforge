// =========================================================
// QuizForge — PDF working-copy store
// Small IndexedDB wrapper so a PDF (and its page count/name)
// can move from upload.html → editor.html → quiz-settings.html
// without a server round trip. IndexedDB is used instead of
// sessionStorage because PDFs can be tens of MB.
// =========================================================

const DB_NAME = "quizforge";
const STORE = "working-pdf";
const KEY = "current";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Saves the working PDF. `bytes` is an ArrayBuffer. */
export async function savePdf({ bytes, name, pageCount }) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ bytes, name, pageCount, savedAt: Date.now() }, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Loads the working PDF, or null if none is stored. */
export async function loadPdf() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/** Clears the working PDF (call once quiz generation has started). */
export async function clearPdf() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
