// =========================================================
// QuizForge — Quiz taking
// =========================================================

import { protectPage, getCurrentUser } from "./auth.js";
import { getFirestore } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

protectPage("login.html");

const quiz = JSON.parse(sessionStorage.getItem("currentQuiz") || "null");
const answers = [];
let index = 0;

const questionCard = document.getElementById("question-card");
const emptyState = document.getElementById("quiz-empty");
const questionText = document.getElementById("question-text");
const answerList = document.getElementById("answer-list");
const progressFill = document.getElementById("quiz-progress-fill");
const progressLabel = document.getElementById("quiz-progress-label");
const nextBtn = document.getElementById("next-btn");
const finishBtn = document.getElementById("finish-btn");

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function render() {
  const q = quiz.questions[index];
  const options = q.options || q.choices || [];

  questionText.textContent = q.question || q.text || "";
  progressLabel.textContent = `Question ${index + 1} of ${quiz.questions.length}`;
  progressFill.style.width = `${(index / quiz.questions.length) * 100}%`;

  answerList.innerHTML = "";
  options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "answer" + (answers[index] === i ? " selected" : "");
    btn.innerHTML = `<span class="answer-letter">${LETTERS[i] || i + 1}</span><span>${opt}</span>`;
    btn.addEventListener("click", () => {
      answers[index] = i;
      render();
    });
    answerList.appendChild(btn);
  });

  const isLast = index === quiz.questions.length - 1;
  nextBtn.classList.toggle("hidden", isLast);
  finishBtn.classList.toggle("hidden", !isLast);
}

function requireAnswer() {
  if (answers[index] === undefined) {
    alert("Please select an answer before continuing.");
    return false;
  }
  return true;
}

nextBtn.addEventListener("click", () => {
  if (!requireAnswer()) return;
  index++;
  render();
});

finishBtn.addEventListener("click", async () => {
  if (!requireAnswer()) return;
  finishBtn.disabled = true;
  finishBtn.textContent = "Scoring…";
  await finish();
});

function correctIndex(q) {
  let correct = q.answer ?? q.correctAnswer ?? q.correct;
  if (typeof correct === "string") correct = (q.options || q.choices || []).indexOf(correct);
  return correct;
}

async function finish() {
  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] === correctIndex(q)) score++;
  });

  const result = {
    score,
    total: quiz.questions.length,
    answers,
    questions: quiz.questions, // full text — question, options, answer, explanation, all saved
    settings: quiz.settings || null,
    chatId: quiz.chatId || null,
    createdAt: new Date().toISOString(), // used for local display before the write resolves
  };

  const user = getCurrentUser();
  if (user) {
    try {
      const quizzesRef = collection(getFirestore(), "quizforge", user.uid, "quizzes");
      const docRef = await addDoc(quizzesRef, { ...result, createdAt: serverTimestamp() });
      result.resultId = docRef.id;
    } catch (err) {
      console.error("QuizForge: couldn't save quiz result", err);
    }
  }

  sessionStorage.setItem("lastQuizResult", JSON.stringify(result));
  sessionStorage.removeItem("currentQuiz");
  window.location.href = "results.html";
}

if (!quiz || !quiz.questions?.length) {
  emptyState.classList.remove("hidden");
  questionCard.classList.add("hidden");
} else {
  render();
}
