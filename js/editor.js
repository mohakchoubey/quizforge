// =========================================================
// QuizForge — PDF Editor
// Rendering: PDF.js. Structural edits (delete/rotate pages): pdf-lib.
// =========================================================

import { protectPage } from "./auth.js";
import { loadPdf, savePdf, clearPdf } from "./pdf-store.js";

protectPage("login.html");

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const editorLayout = document.getElementById("editor-layout");
const editorEmpty = document.getElementById("editor-empty");
const thumbnailRail = document.getElementById("thumbnail-rail");
const canvas = document.getElementById("pdf-render-canvas");
const ctx = canvas.getContext("2d");
const pageNumEl = document.getElementById("page-num");
const pageCountEl = document.getElementById("page-count");
const editorMeta = document.getElementById("editor-meta");
const deleteBtn = document.getElementById("delete-page-btn");
const rotateBtn = document.getElementById("rotate-page-btn");
const saveBtn = document.getElementById("save-btn");
const cancelBtn = document.getElementById("cancel-btn");

let pdfDoc = null; // pdf.js document, for rendering
let originalBytes = null; // ArrayBuffer, for pdf-lib on save
let fileName = "document.pdf";
let pageNum = 1;
let scale = 1.3;
const rotations = new Map(); // 1-based page -> degrees (0/90/180/270)
const removed = new Set(); // 1-based pages marked for removal

function activePages() {
  const all = Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
  return all.filter((p) => !removed.has(p));
}

async function renderPage(num) {
  const page = await pdfDoc.getPage(num);
  const rotation = rotations.get(num) || 0;
  const viewport = page.getViewport({ scale, rotation });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  pageNumEl.textContent = num;
  updateToolbarState(num);
}

function updateToolbarState(num) {
  deleteBtn.textContent = removed.has(num) ? "Restore page" : "Delete page";
  const pages = activePages();
  pageCountEl.textContent = `${pages.length} of ${pdfDoc.numPages}`;
  saveBtn.disabled = pages.length === 0;
}

async function renderThumbnails() {
  thumbnailRail.innerHTML = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const rotation = rotations.get(i) || 0;
    const viewport = page.getViewport({ scale: 0.22, rotation });
    const thumbCanvas = document.createElement("canvas");
    thumbCanvas.width = viewport.width;
    thumbCanvas.height = viewport.height;
    await page.render({ canvasContext: thumbCanvas.getContext("2d"), viewport }).promise;

    const wrap = document.createElement("div");
    wrap.className = "thumb" + (removed.has(i) ? " is-removed" : "") + (i === pageNum ? " is-active" : "");
    wrap.dataset.page = String(i);
    wrap.appendChild(thumbCanvas);
    const label = document.createElement("span");
    label.className = "thumb-label";
    label.textContent = String(i);
    wrap.appendChild(label);
    wrap.addEventListener("click", () => {
      pageNum = i;
      renderPage(pageNum);
      highlightActiveThumb();
    });
    thumbnailRail.appendChild(wrap);
  }
}

function highlightActiveThumb() {
  thumbnailRail.querySelectorAll(".thumb").forEach((el) => {
    el.classList.toggle("is-active", Number(el.dataset.page) === pageNum);
  });
}

function goToPage(step) {
  const next = pageNum + step;
  if (next >= 1 && next <= pdfDoc.numPages) {
    pageNum = next;
    renderPage(pageNum);
    highlightActiveThumb();
  }
}

deleteBtn.addEventListener("click", () => {
  if (removed.has(pageNum)) {
    removed.delete(pageNum);
  } else {
    if (activePages().length <= 1) {
      window.QF.showAlert(document.getElementById("editor-alert"), "error", "A quiz needs at least one page.");
      return;
    }
    removed.add(pageNum);
  }
  renderThumbnails();
  updateToolbarState(pageNum);
});

rotateBtn.addEventListener("click", () => {
  const current = rotations.get(pageNum) || 0;
  rotations.set(pageNum, (current + 90) % 360);
  renderPage(pageNum);
  renderThumbnails();
});

document.getElementById("prev-btn").addEventListener("click", () => goToPage(-1));
document.getElementById("next-btn").addEventListener("click", () => goToPage(1));

cancelBtn.addEventListener("click", async () => {
  if (confirm("Discard this PDF and start over?")) {
    await clearPdf();
    window.location.href = "upload.html";
  }
});

saveBtn.addEventListener("click", async () => {
  const pages = activePages();
  if (pages.length === 0) return;

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    const { PDFDocument, degrees } = PDFLib;
    const srcDoc = await PDFDocument.load(originalBytes);
    const outDoc = await PDFDocument.create();

    const copied = await outDoc.copyPages(srcDoc, pages.map((p) => p - 1));
    copied.forEach((page, idx) => {
      const originalPageNum = pages[idx];
      const rotation = rotations.get(originalPageNum) || 0;
      if (rotation) page.setRotation(degrees(rotation));
      outDoc.addPage(page);
    });

    const outBytes = await outDoc.save();
    await savePdf({ bytes: outBytes.buffer, name: fileName, pageCount: pages.length });
    window.location.href = "quiz-settings.html";
  } catch (err) {
    window.QF.showAlert(document.getElementById("editor-alert"), "error", "Couldn't save your edits. Please try again.");
    saveBtn.disabled = false;
    saveBtn.textContent = "Save & continue";
  }
});

(async function init() {
  const record = await loadPdf();
  if (!record) {
    editorEmpty.classList.remove("hidden");
    editorLayout.classList.add("hidden");
    return;
  }

  originalBytes = record.bytes;
  fileName = record.name || "document.pdf";
  editorMeta.textContent = fileName;

  pdfDoc = await pdfjsLib.getDocument({ data: record.bytes.slice(0) }).promise;
  await renderThumbnails();
  await renderPage(1);
})();
