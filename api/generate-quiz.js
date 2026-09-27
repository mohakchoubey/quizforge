// =========================================================
// QuizForge — POST /api/generate-quiz
// =========================================================

const crypto = require("crypto");
const { processPDF } = require("./pdf");
const { GROQ_MODEL, GROQ_URL } = require("./config");

const VALID_COUNTS = [5, 10, 15, 20];
const VALID_DIFFICULTY = ["Easy", "Medium", "Hard"];
const VALID_TYPES = ["MCQ", "True-False", "Mixed"];

function clampSettings(s) {
  return {
    questionCount: VALID_COUNTS.includes(s.questionCount) ? s.questionCount : 10,
    difficulty: VALID_DIFFICULTY.includes(s.difficulty) ? s.difficulty : "Medium",
    questionType: VALID_TYPES.includes(s.questionType) ? s.questionType : "MCQ",
  };
}

function buildPrompt(text, settings) {
  return [
    "You are a quiz generator. Create a quiz strictly from the SOURCE TEXT below — never invent facts not present in it.",
    'Return ONLY valid JSON, no prose, no markdown fences, in this exact shape:',
    '{"questions":[{"question":"...","options":["...","...","...","..."],"answer":0,"explanation":"..."}]}',
    '"answer" is the zero-based index into "options".',
    `Generate exactly ${settings.questionCount} questions.`,
    `Difficulty: ${settings.difficulty}.`,
    `Question type: ${settings.questionType}${
      settings.questionType === "True-False" ? ' (use exactly two options per question: "True" and "False")' : ""
    }.`,
    "SOURCE TEXT:",
    text.slice(0, 18000),
  ].join("\n");
}

function parseQuizJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw badGateway("The AI response wasn't valid JSON.");
    parsed = JSON.parse(match[0]);
  }
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw badGateway("The AI didn't return any questions.");
  }
  return parsed;
}

function badGateway(message) {
  return Object.assign(new Error(message), { statusCode: 502 });
}

export default async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { text, pages, settings: rawSettings } = await processPDF(req);
    const settings = clampSettings(rawSettings);

    if (!process.env.GROQ_API_KEY) {
      throw Object.assign(new Error("Quiz generation isn't configured on the server yet."), { statusCode: 500 });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: buildPrompt(text, settings) }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw badGateway("The AI service couldn't generate a quiz right now. Please try again.");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
    const quiz = parseQuizJson(raw);

    res.status(200).json({
      quiz,
      pages,
      settings,
      chatId: crypto.randomUUID(),
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
};
