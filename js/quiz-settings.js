// =========================================================
// QuizForge — Quiz Settings
// =========================================================

import { protectPage } from "./auth.js";
import { loadPdf, clearPdf } from "./pdf-store.js";
import { callApi } from "./api.js";

protectPage("login.html");

const form = document.getElementById("settings-form");
const alertBox = document.getElementById("settings-alert");
const statusBox = document.getElementById("generation-status");
const statusLabel = document.getElementById("generation-status-label");
const generateBtn = document.getElementById("generate-btn");
const noPdfNotice = document.getElementById("no-pdf-notice");

let settings = { count: 10, difficulty: "Medium", type: "MCQ" };

function bindPillGroup(name, onChange) {
  const pills = form.querySelectorAll(`.option-pill[data-group="${name}"]`);
  pills.forEach((pill) => {
    const input = pill.querySelector("input");
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("is-selected"));
      pill.classList.add("is-selected");
      input.checked = true;
      onChange(input.value);
    });
  });
}

bindPillGroup("count", (v) => (settings.count = parseInt(v, 10)));
bindPillGroup("difficulty", (v) => (settings.difficulty = v));
bindPillGroup("type", (v) => (settings.type = v));

function setGenerating(isGenerating, label) {
  generateBtn.disabled = isGenerating;
  statusBox.classList.toggle("is-visible", isGenerating);
  if (label) statusLabel.textContent = label;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  window.QF.hideAlert(alertBox);

  const record = await loadPdf();
  if (!record) {
    noPdfNotice.classList.add("is-visible");
    return;
  }

  setGenerating(true, "Reading your PDF…");
  try {
    const blob = new Blob([record.bytes], { type: "application/pdf" });
    const body = new FormData();
    body.append("pdf", blob, record.name || "document.pdf");
    body.append("questionCount", String(settings.count));
    body.append("difficulty", settings.difficulty);
    body.append("questionType", settings.type);

    setGenerating(true, "Generating your quiz with AI…");
    const data = await callApi("/api/generate-quiz", { body });

    sessionStorage.setItem(
      "currentQuiz",
      JSON.stringify({ ...data.quiz, chatId: data.chatId, settings })
    );
    await clearPdf();
    window.location.href = "quiz.html";
  } catch (err) {
    window.QF.showAlert(alertBox, "error", err.message || "Couldn't generate a quiz from that PDF. Please try again.");
  } finally {
    setGenerating(false);
  }
});

(async function init() {
  const record = await loadPdf();
  if (!record) noPdfNotice.classList.add("is-visible");
})();
