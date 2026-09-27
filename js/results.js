// =========================================================
// QuizForge — Results
// =========================================================

import { protectPage } from "./auth.js";

protectPage("login.html");

const result = JSON.parse(sessionStorage.getItem("lastQuizResult") || "null");

const summaryCard = document.getElementById("results-summary");
const emptyState = document.getElementById("results-empty");
const scoreEl = document.getElementById("results-score");
const scoreLabelEl = document.getElementById("results-score-label");
const reviewList = document.getElementById("review-list");

function correctIndex(q) {
  let correct = q.answer ?? q.correctAnswer ?? q.correct;
  if (typeof correct === "string") correct = (q.options || q.choices || []).indexOf(correct);
  return correct;
}

if (!result) {
  emptyState.classList.remove("hidden");
  summaryCard.classList.add("hidden");
} else {
  const pct = result.total ? Math.round((result.score / result.total) * 100) : 0;
  scoreEl.textContent = `${result.score}/${result.total}`;

  const mood =
    pct === 100 ? "🎉 Perfect score!" :
    pct >= 80 ? "✨ Great job!" :
    pct >= 60 ? "👍 Solid effort." :
    pct >= 40 ? "📚 Worth another pass." :
    "🔁 That PDF needs a re-read.";
  scoreLabelEl.textContent = `${pct}% correct · ${mood}`;

  result.questions.forEach((q, i) => {
    const options = q.options || q.choices || [];
    const correct = correctIndex(q);
    const given = result.answers[i];
    const isCorrect = given === correct;

    const item = document.createElement("div");
    item.className = "card review-item";
    item.innerHTML = `
      <p class="review-question">${i + 1}. ${q.question || q.text || ""}</p>
      <div class="review-answer-row ${isCorrect ? "correct" : "incorrect"}">
        <span class="label">Your answer</span>
        <span class="value">${given !== undefined ? options[given] : "— skipped —"}</span>
      </div>
      ${
        !isCorrect
          ? `<div class="review-answer-row correct"><span class="label">Correct answer</span><span class="value">${options[correct] ?? "—"}</span></div>`
          : ""
      }
      ${q.explanation ? `<div class="review-explanation">${q.explanation}</div>` : ""}
    `;
    reviewList.appendChild(item);
  });
}
