const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_MODEL = "gemini-2.0-flash";
const MAX_KNOWLEDGE_CHARS = 24000;

function readText(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function loadSystemPrompt() {
  return readText("prompts/admissions-assistant.md");
}

function loadKnowledgeBaseContext() {
  const knowledgeDir = path.join(process.cwd(), "knowledge-base");

  if (!fs.existsSync(knowledgeDir)) {
    return "";
  }

  const files = fs
    .readdirSync(knowledgeDir)
    .filter((file) => file.endsWith(".md") && file !== "system-prompt-draft.md" && file !== "README.md")
    .sort();

  const context = files
    .map((file) => {
      const content = fs.readFileSync(path.join(knowledgeDir, file), "utf8");
      return `\n\n---\nKnowledge file: ${file}\n${content}`;
    })
    .join("");

  return context.length > MAX_KNOWLEDGE_CHARS
    ? `${context.slice(0, MAX_KNOWLEDGE_CHARS)}\n\n[Knowledge base context truncated for MVP request size.]`
    : context;
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
  const knowledgeContext = loadKnowledgeBaseContext();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const userPrompt = [
    "User question:",
    question,
    "",
    "UC Connect knowledge-base context for this MVP:",
    knowledgeContext || "[No local knowledge-base context is available.]",
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
    sources: [],
    model,
  };
}

module.exports = {
  generateAdmissionsAnswer,
};
