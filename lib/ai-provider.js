const fs = require("node:fs");
const path = require("node:path");
const { formatChunkForPrompt } = require("./knowledge-base");
const { retrieveRelevantChunks } = require("./retriever");

const DEFAULT_MODEL = "gemini-flash-lite-latest";
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_MAX_OUTPUT_TOKENS = 2048;
const DEFAULT_REQUEST_TIMEOUT_MS = 90000;
const RETRYABLE_STATUS_CODES = new Set([429, 503, 504]);

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function loadSystemPrompt() {
  return readText("prompts/admissions-assistant.md");
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const maxOutputTokens = parsePositiveInteger(
    process.env.GEMINI_MAX_OUTPUT_TOKENS,
    DEFAULT_MAX_OUTPUT_TOKENS
  );
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const maxAttempts = parsePositiveInteger(process.env.GEMINI_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS);
  const timeoutMs = parsePositiveInteger(process.env.GEMINI_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  return { apiKey, maxAttempts, maxOutputTokens, model, timeoutMs };
}

function formatGeminiModelPath(model) {
  return model.startsWith("models/") ? model : `models/${model}`;
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return "";
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function generateAdmissionsAnswer(question) {
  const { apiKey, maxAttempts, maxOutputTokens, model, timeoutMs } = getGeminiConfig();
  const systemPrompt = loadSystemPrompt();
  const retrieval = retrieveRelevantChunks(question);
  const knowledgeContext = retrieval.chunks
    .map((chunk, index) => `[${index + 1}]\n${formatChunkForPrompt(chunk)}`)
    .join("\n\n---\n\n");
  const modelPath = formatGeminiModelPath(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  const userPrompt = [
    "User question:",
    question,
    "",
    "Retrieved UC Connect knowledge-base excerpts:",
    knowledgeContext ||
      "[No relevant local knowledge-base excerpts were retrieved. Follow the insufficient-evidence rule.]",
  ].join("\n");

  const response = await fetchWithRetry(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens,
        },
      }),
    },
    { maxAttempts, timeoutMs }
  );

  if (!response.ok) {
    const errorMessage = await readGeminiErrorMessage(response);
    const error = new Error(errorMessage || `Gemini request failed with status ${response.status}.`);
    error.code = "GEMINI_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const answer = extractGeminiText(payload);

  if (!answer) {
    const error = new Error("Gemini returned an empty answer.");
    error.code = "GEMINI_EMPTY_RESPONSE";
    throw error;
  }

  return {
    answer,
    sources: retrieval.sources,
    retrievedChunks: retrieval.chunks.map((chunk) => ({
      id: chunk.id,
      file: chunk.file,
      title: chunk.title,
      heading: chunk.heading,
      score: chunk.score,
    })),
    model: modelPath,
  };
}

async function fetchWithRetry(url, options, retryOptions = {}) {
  const maxAttempts = retryOptions.maxAttempts || DEFAULT_MAX_ATTEMPTS;
  const timeoutMs = retryOptions.timeoutMs || DEFAULT_REQUEST_TIMEOUT_MS;
  let lastResponse;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      if (!RETRYABLE_STATUS_CODES.has(response.status) || attempt === maxAttempts) {
        return response;
      }

      lastResponse = response;
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }
    }

    await delay(500 * 2 ** (attempt - 1));
  }

  if (lastError) {
    throw lastError;
  }

  return lastResponse;
}

function isRetryableError(error) {
  return error.code === "GEMINI_REQUEST_TIMEOUT" || error.code === "UND_ERR_CONNECT_TIMEOUT";
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`Gemini request timed out after ${timeoutMs / 1000} seconds.`);
      timeoutError.code = "GEMINI_REQUEST_TIMEOUT";
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readGeminiErrorMessage(response) {
  try {
    const payload = await response.json();
    return payload?.error?.message;
  } catch (error) {
    return "";
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  generateAdmissionsAnswer,
};
