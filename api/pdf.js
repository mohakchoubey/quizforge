// =========================================================
// QuizForge — PDF processing (server-side)
// Verifies the caller, parses the uploaded PDF, enforces the
// page/size limits server-side (never trust the client check
// alone), and extracts text for quiz generation.
// =========================================================

const Busboy = require("busboy");
const pdfParse = require("pdf-parse");
const { MAX_PAGES, MAX_FILE_SIZE } = require("./config");
const { verifyIdToken } = require("./_firebaseAdmin");

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_SIZE } });
    const fields = {};
    let fileBuffer = null;
    let fileTooLarge = false;

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (_name, stream) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("limit", () => {
        fileTooLarge = true;
        stream.resume();
      });
      stream.on("end", () => {
        if (!fileTooLarge) fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("error", reject);
    bb.on("close", () => {
      if (fileTooLarge) {
        reject(badRequest(`File exceeds the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`));
        return;
      }
      resolve({ fields, fileBuffer });
    });

    req.pipe(bb);
  });
}

function validateUploadedPDF(buffer) {
  if (!buffer || buffer.length === 0) {
    throw badRequest("No PDF file was provided.");
  }
  // Magic-number check — first 4 bytes of every PDF are "%PDF".
  if (buffer.toString("utf8", 0, 4) !== "%PDF") {
    throw badRequest("That file isn't a valid PDF.");
  }
}

async function getPageCount(buffer) {
  const data = await pdfParse(buffer, { max: 1 });
  return data.numpages;
}

function enforcePageLimit(pages) {
  if (pages > MAX_PAGES) {
    throw badRequest(
      `This PDF contains more than ${MAX_PAGES} pages.\nPlease upload a PDF containing ${MAX_PAGES} pages or fewer.`
    );
  }
}

async function extractPDFText(buffer) {
  const data = await pdfParse(buffer);
  return data.text;
}

function validatePDFContent(text) {
  if (!text || text.trim().length < 50) {
    throw badRequest(
      "This PDF doesn't have enough extractable text to build a quiz. Image-only (scanned) PDFs aren't supported yet."
    );
  }
}

/**
 * Verifies the caller, parses the multipart request, and returns
 * everything generate-quiz needs: { text, pages, uid, settings }.
 */
async function processPDF(req) {
  const decoded = await verifyIdToken(req.headers.authorization);
  const { fields, fileBuffer } = await parseMultipart(req);

  validateUploadedPDF(fileBuffer);
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw badRequest(`File is larger than the ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
  }

  const pages = await getPageCount(fileBuffer);
  enforcePageLimit(pages);

  const text = await extractPDFText(fileBuffer);
  validatePDFContent(text);

  return {
    text,
    pages,
    uid: decoded.uid,
    settings: {
      questionCount: parseInt(fields.questionCount, 10) || 10,
      difficulty: fields.difficulty || "Medium",
      questionType: fields.questionType || "MCQ",
    },
  };
}

module.exports = {
  processPDF,
  validateUploadedPDF,
  getPageCount,
  enforcePageLimit,
  extractPDFText,
  validatePDFContent,
};
