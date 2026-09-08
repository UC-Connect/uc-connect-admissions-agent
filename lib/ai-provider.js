const fs = require("node:fs");
const path = require("node:path");
const { formatChunkForPrompt } = require("./knowledge-base");
const { retrieveRelevantChunks } = require("./retriever");

const DEFAULT_MODEL = "gemini-2.0-flash";

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function loadSystemPrompt() {
  return readText("prompts/admissions-assistant.md");
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured.");
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  return { apiKey, model };
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
  const { apiKey, model } = getGeminiConfig();
  const systemPrompt = loadSystemPrompt();
  const retrieval = retrieveRelevantChunks(question);
  const knowledgeContext = retrieval.chunks
    .map((chunk, index) => `[${index + 1}]\n${formatChunkForPrompt(chunk)}`)
    .join("\n\n---\n\n");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userPrompt = [
    "User question:",
    question,
    "",
    "Retrieved UC Connect knowledge-base excerpts:",
    knowledgeContext ||
      "[No relevant local knowledge-base excerpts were retrieved. Follow the insufficient-evidence rule.]",
  ].join("\n");

  const response = await fetch(endpoint, {
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
        maxOutputTokens: 900,
      },
    }),
  });

  if (!response.ok) {
    const error = new Error(`Gemini request failed with status ${response.status}.`);
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
    model,
  };
}

module.exports = {
  generateAdmissionsAnswer,
};
