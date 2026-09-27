// =========================================================
// QuizForge — Dashboard
// =========================================================

import { handleAuthState } from "./auth.js";
import { getFirestore } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const greetingEl = document.getElementById("dashboard-greeting");
const statTotal = document.getElementById("stat-total");
const statAvg = document.getElementById("stat-avg");
const statBest = document.getElementById("stat-best");
const historyList = document.getElementById("history-list");
const emptyState = document.getElementById("history-empty");
const skeleton = document.getElementById("history-skeleton");

function greet(user) {
  const name = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "there";
  greetingEl.textContent = `Welcome back, ${name}`;
}

function renderHistory(items) {
  skeleton.classList.add("hidden");

  if (!items.length) {
    emptyState.classList.remove("hidden");
    statTotal.textContent = "0";
    statAvg.textContent = "—";
    statBest.textContent = "—";
    return;
  }

  const pct = items.map((r) => Math.round((r.score / r.total) * 100));
  statTotal.textContent = String(items.length);
  statAvg.textContent = `${Math.round(pct.reduce((a, b) => a + b, 0) / pct.length)}%`;
  statBest.textContent = `${Math.max(...pct)}%`;

  historyList.innerHTML = "";
  items
    .slice()
    .reverse()
    .forEach((r) => {
      const row = document.createElement("div");
      row.className = "card history-item";
      const when = r.createdAt?.toDate ? r.createdAt.toDate() : r.createdAt ? new Date(r.createdAt) : null;
      const date = when ? when.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
      row.innerHTML = `
        <div class="history-item-main">
          <span class="history-item-title">Quiz · ${r.total} question${r.total === 1 ? "" : "s"}</span>
          <span class="history-item-meta">${date}${r.settings ? ` · ${r.settings.difficulty}` : ""}</span>
        </div>
        <span class="history-score">${r.score}/${r.total}</span>
      `;
      historyList.appendChild(row);
    });
}

async function loadHistory(user) {
  try {
    const quizzesRef = collection(getFirestore(), "quizforge", user.uid, "quizzes");
    const snap = await getDocs(query(quizzesRef, orderBy("createdAt", "asc")));
    renderHistory(snap.docs.map((d) => d.data()));
  } catch (err) {
    console.error("QuizForge: couldn't load quiz history", err);
    renderHistory([]);
  }
}

handleAuthState((user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  greet(user);
  loadHistory(user);
});
