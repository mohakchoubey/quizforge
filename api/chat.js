// =========================================================
// QuizForge — POST /api/chat
// =========================================================

const crypto = require("crypto");
const { verifyIdToken } = require("./_firebaseAdmin");
const { GROQ_MODEL, GROQ_URL } = require("./config");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    await verifyIdToken(req.headers.authorization);

    const { message, sessionId } = req.body || {};
    if (!message || typeof message !== "string") {
      throw Object.assign(new Error("Message is required."), { statusCode: 400 });
    }
    if (!process.env.GROQ_API_KEY) {
      throw Object.assign(new Error("Chat isn't configured on the server yet."), { statusCode: 500 });
    }

    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      throw Object.assign(new Error("Chat request failed."), { statusCode: 502 });
    }

    const data = await response.json();
    res.status(200).json({
      sessionId: sessionId || crypto.randomUUID(),
      reply: data.choices?.[0]?.message?.content || "",
    });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
};
