// =========================================================
// QuizForge — Upload
// =========================================================

import { protectPage } from "./auth.js";
import { savePdf } from "./pdf-store.js";

protectPage("login.html");

const MAX_PAGES = 40;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB — keep in sync with api/config.js

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("pdf-input");
const fileChip = document.getElementById("file-chip");
const fileChipName = document.getElementById("file-chip-name");
const removeBtn = document.getElementById("file-chip-remove");
const errorBox = document.getElementById("upload-error");
const continueBtn = document.getElementById("continue-btn");
const progressTrack = document.getElementById("upload-progress");
const progressFill = document.getElementById("upload-progress-fill");

let selectedFile = null;
let selectedPageCount = null;

function showError(message) {
  window.QF.showAlert(errorBox, "error", message);
  resetSelection();
}

function resetSelection() {
  selectedFile = null;
  selectedPageCount = null;
  fileChip.classList.remove("is-visible");
  continueBtn.disabled = true;
  fileInput.value = "";
}

function formatSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function handleFile(file) {
  window.QF.hideAlert(errorBox);

  if (!file || file.type !== "application/pdf") {
    showError("Please upload a valid PDF file.");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError(`That file is ${formatSize(file.size)} — the limit is ${formatSize(MAX_FILE_SIZE)}.`);
    return;
  }

  progressTrack.classList.add("is-visible");
  progressFill.style.width = "35%";

  try {
    const buffer = await file.arrayBuffer();
    progressFill.style.width = "65%";

    const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    const pageCount = pdf.numPages;
    progressFill.style.width = "100%";

    if (pageCount > MAX_PAGES) {
      showError(`This PDF contains ${pageCount} pages.\nPlease upload a PDF containing ${MAX_PAGES} pages or fewer.`);
      progressTrack.classList.remove("is-visible");
      return;
    }

    selectedFile = { buffer, name: file.name };
    selectedPageCount = pageCount;

    fileChipName.textContent = `${file.name} · ${pageCount} page${pageCount === 1 ? "" : "s"} · ${formatSize(file.size)}`;
    fileChip.classList.add("is-visible");
    continueBtn.disabled = false;
  } catch (err) {
    showError("Couldn't read that PDF. It may be corrupted or image-only.");
  } finally {
    setTimeout(() => progressTrack.classList.remove("is-visible"), 300);
  }
}

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") fileInput.click();
});

["dragenter", "dragover"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragover");
  })
);
["dragleave", "drop"].forEach((evt) =>
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

removeBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  resetSelection();
});

continueBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  continueBtn.disabled = true;
  continueBtn.textContent = "Preparing…";
  try {
    await savePdf({
      bytes: selectedFile.buffer,
      name: selectedFile.name,
      pageCount: selectedPageCount,
    });
    window.location.href = "editor.html";
  } catch (err) {
    showError("Couldn't prepare that file for editing. Please try again.");
    continueBtn.textContent = "Continue to editor";
  }
});
