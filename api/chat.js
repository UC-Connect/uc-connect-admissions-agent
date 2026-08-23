const { generateAdmissionsAnswer } = require("../lib/ai-provider");

const MAX_QUESTION_LENGTH = 2000;

function sendJson(res, statusCode, payload, headers = {}) {
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  if (req.body) {
    if (typeof req.body === "string") {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch (error) {
        return Promise.reject(
          Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_JSON" })
        );
      }
    }

    return Promise.resolve(req.body);
  }

  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      if (raw.length > 32 * 1024) {
        reject(Object.assign(new Error("Request body is too large."), { code: "BODY_TOO_LARGE" }));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(Object.assign(new Error("Request body must be valid JSON."), { code: "INVALID_JSON" }));
      }
    });

    req.on("error", reject);
  });
}

module.exports = async function chatHandler(req, res) {
  if (req.method !== "POST") {
    return sendJson(
      res,
      405,
      { error: "Method not allowed. Use POST /api/chat." },
      { Allow: "POST" }
    );
  }

  let body;

  try {
    body = await readRequestBody(req);
  } catch (error) {
    const statusCode = error.code === "BODY_TOO_LARGE" ? 413 : 400;
    return sendJson(res, statusCode, { error: error.message });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";

  if (!question) {
    return sendJson(res, 400, { error: "question is required." });
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return sendJson(res, 413, {
      error: `question is too long. Please keep it under ${MAX_QUESTION_LENGTH} characters.`,
    });
  }

  try {
    const result = await generateAdmissionsAnswer(question);
    return sendJson(res, 200, result);
  } catch (error) {
    const isConfigError = error.code === "MISSING_GEMINI_API_KEY";
    const statusCode = isConfigError ? 500 : 500;
    const message = isConfigError
      ? "Server is missing Gemini configuration."
      : "Unable to generate an answer right now.";

    return sendJson(res, statusCode, { error: message });
  }
};
