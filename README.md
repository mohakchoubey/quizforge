# QuizForge

Turn a PDF into an AI-generated quiz. Upload a document (≤40 pages), trim it if needed,
pick your quiz settings, and get back questions with explanations — scored and saved
to your account.

## Stack

- **Frontend:** plain HTML/CSS/JS (ES modules), no build step. PDF.js for rendering,
  pdf-lib for page edits — both loaded from CDN.
- **Auth & data:** Firebase Authentication + Firestore (same project as your other tools —
  Toolify, CheckMate, Day Passer — sharing the `/users/{uid}` profile doc).
- **AI:** Groq (`llama-3.1-8b-instant` by default) for quiz generation.
- **Backend:** Node serverless functions in `/api` (Vercel-style `module.exports = async (req, res) => {}`).

## Project structure

```
index.html, about.html, contact.html, questions.html,  → public marketing pages
feedback.html, sites.html, privacy-policy.html, terms.html
login.html, signup.html                                 → Firebase auth
dashboard.html, upload.html, editor.html,                → authenticated app flow
quiz-settings.html, quiz.html, results.html
header.html, navbar.html, footer.html, 404.html          → shared partials (fetched at runtime)

css/            → style.css (core design system), navbar.css, auth.css,
                  dashboard.css, editor.css, quiz.css
js/             → firebase.js, auth.js, navbar.js, main.js (shared)
                  api.js, pdf-store.js (shared helpers)
                  upload.js, editor.js, quiz-settings.js, quiz.js, results.js, dashboard.js

api/            → generate-quiz.js, pdf.js, chat.js, config.js, _firebaseAdmin.js
firestore.rules → Firestore security rules
```

## App flow

```
signup/login → dashboard → upload.html → editor.html → quiz-settings.html
                                                              ↓
                                                    /api/generate-quiz (Groq)
                                                              ↓
                                                    quiz.html → results.html (saved to Firestore)
```

The PDF never touches your own server storage — it's held in the browser
(IndexedDB, via `js/pdf-store.js`) between upload/edit/settings, then sent once
to `/api/generate-quiz` as `multipart/form-data`. The Groq key stays server-side.

## Setup

1. **Firebase**
   - Use your existing Toolify/CheckMate/Day Passer project → enable **Authentication → Email/Password** and **Firestore**.
   - Copy the web app config into `js/firebase.js` (`firebaseConfig`).
   - Publish `firestore.rules` (Firestore → Rules tab, or `firebase deploy --only firestore:rules`) — it keeps your
     existing TOOLIFY and DAY PASSER blocks and adds a new QUIZFORGE one.
   - Generate a **service account key** (Project settings → Service accounts) for the backend, if you don't
     already have one from another tool.

2. **Groq**
   - Get an API key from console.groq.com.

3. **Environment variables** — copy `.env.example` to `.env` and fill in:
   ```
   GROQ_API_KEY=
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   ```
   `FIREBASE_PRIVATE_KEY` comes from the service account JSON — keep the `\n` escapes as-is,
   the backend un-escapes them (`api/_firebaseAdmin.js`).

4. **Install backend dependencies**
   ```
   npm install
   ```

## Deployment

The static pages alone will run on **GitHub Pages**, but `/api/*` needs a Node
runtime — GitHub Pages can't execute it, and the Groq key must never end up in
frontend code. Recommended: deploy the whole repo to **Vercel**, which serves the
static files and turns `/api/*.js` into serverless functions automatically —
add the environment variables above in the Vercel project settings.

## Known limitations

- Image-only (scanned) PDFs aren't supported — quiz generation needs extractable text.
- `js/chat.js` calls `/api/chat` but no UI hooks it up yet — it's there for a future
  "ask about this quiz" feature.
- `favicon.ico` and `assets/icons/` referenced in the HTML aren't included —
  drop in your own before shipping.
- Replace the `YOUR_FORM_ID` placeholders in `contact.html`/`feedback.html` (Formspree)
  and the `YOUR-DOMAIN.example` placeholders in `sitemap.xml`/`robots.txt`.

## Security notes

- Every `/api` call that touches a PDF or writes data requires a valid Firebase ID
  token (`Authorization: Bearer <token>`, sent by `js/api.js`) — verified server-side
  in `api/_firebaseAdmin.js`. The client-supplied user ID is never trusted.
- Page count and file size are enforced both client-side (`js/upload.js`, fast feedback)
  and server-side (`api/pdf.js`, the real gate — client checks can be bypassed).
- `firestore.rules` restricts every user to reading/writing only their own
  `quizforge/{uid}/quizzes/...` subtree, and only lets them write their own
  `/users/{uid}` profile fields.

## What's saved where

- `/users/{uid}` — shared profile doc (`uid`, `displayName`, `email`), written on
  signup. Same doc your other tools read.
- `/quizforge/{uid}/quizzes/{quizId}` — one doc per finished quiz: every question,
  its options, the correct answer, the AI's explanation, your picked answers,
  score, and the settings used. This is the full textual record, not just a score.

## Header

The nav has a **Tools** dropdown (`navbar.html`) linking to Toolify, CheckMate,
Day Passer, and FinFlow, plus "See all projects" → `sites.html`. Swap the
`github.com/mohakdev1220` placeholders for the real live links once you have them.
