// =========================================================
// QuizForge — Backend config
// =========================================================

module.exports = {
  MAX_PAGES: 40,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB — keep in sync with js/upload.js
  GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
  GROQ_URL: "https://api.groq.com/openai/v1/chat/completions",
};
