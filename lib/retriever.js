const { loadKnowledgeBase } = require("./knowledge-base");

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 2;
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "the",
  "to",
  "uc",
  "what",
  "when",
  "which",
  "with",
  "you",
]);

const QUERY_EXPANSIONS = {
  articulate: ["articulation", "articulated", "equivalency", "assist"],
  articulates: ["articulation", "articulated", "equivalency", "assist"],
  articulated: ["articulation", "equivalency", "assist"],
  course: ["courses"],
  guarantee: ["guaranteed", "eligibility", "eligible"],
  guaranteed: ["guarantee", "eligibility", "eligible"],
  qualify: ["eligibility", "eligible", "requirements"],
  transfer: ["transferable", "transferability"],
  transfers: ["transferable", "transferability"],
};

function tokenize(text) {
  const tokens = String(text)
    .toLowerCase()
    .match(/[a-z0-9]+(?:-[a-z0-9]+)?/g)
    ?.filter((token) => token.length > 1 && !STOPWORDS.has(token)) || [];

  return expandTokens(tokens);
}

function expandTokens(tokens) {
  const expanded = new Set();

  for (const token of tokens) {
    expanded.add(token);

    if (token.endsWith("s") && token.length > 3) {
      expanded.add(token.slice(0, -1));
    }

    for (const relatedToken of QUERY_EXPANSIONS[token] || []) {
      expanded.add(relatedToken);
    }
  }

  return [...expanded];
}

function scoreChunk(queryTokens, chunk) {
  const haystack = [
    chunk.title,
    chunk.heading,
    chunk.content,
    chunk.applicableCycle,
    chunk.sourceType,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;

  for (const token of queryTokens) {
    if (chunk.title.toLowerCase().includes(token)) {
      score += 5;
    }

    if (chunk.heading.toLowerCase().includes(token)) {
      score += 3;
    }

    const matches = haystack.match(new RegExp(`\\b${escapeRegExp(token)}\\b`, "g"));
    score += matches ? matches.length : 0;
  }

  return score;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueSources(chunks) {
  const seen = new Set();
  const sources = [];

  for (const chunk of chunks) {
    const key = `${chunk.title}|${chunk.sourceUrl}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    sources.push({
      title: chunk.title,
      url: chunk.sourceUrl,
      file: chunk.file,
      lastReviewed: chunk.lastReviewed,
    });
  }

  return sources;
}

function retrieveRelevantChunks(question, options = {}) {
  const topK = options.topK || DEFAULT_TOP_K;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const chunks = options.chunks || loadKnowledgeBase(options.rootDir);
  const queryTokens = tokenize(question);

  if (queryTokens.length === 0) {
    return { chunks: [], sources: [], queryTokens };
  }

  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreChunk(queryTokens, chunk) }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, topK)
    .map((result) => ({ ...result.chunk, score: result.score }));

  return {
    chunks: ranked,
    sources: uniqueSources(ranked),
    queryTokens,
  };
}

module.exports = {
  retrieveRelevantChunks,
  tokenize,
};
