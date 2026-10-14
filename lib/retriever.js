const { loadKnowledgeBase } = require("./knowledge-base");

const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 4;
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
  act: ["standardized", "test"],
  articulate: ["articulation", "articulated", "equivalency", "assist"],
  articulates: ["articulation", "articulated", "equivalency", "assist"],
  articulated: ["articulation", "equivalency", "assist"],
  course: ["courses"],
  deadline: ["dates", "deadlines"],
  essay: ["personal", "insight"],
  essays: ["personal", "insight"],
  fee: ["fees"],
  freshman: ["first-year"],
  freshmen: ["freshman", "first-year"],
  "first-year": ["freshman"],
  guarantee: ["guaranteed", "eligibility", "eligible"],
  guaranteed: ["guarantee", "eligibility", "eligible"],
  piq: ["personal", "insight", "questions"],
  piqs: ["personal", "insight", "questions"],
  qualify: ["eligibility", "eligible", "requirements"],
  sat: ["standardized", "test"],
  transfer: ["transferable", "transferability"],
  transfers: ["transferable", "transferability"],
};

const AUDIENCE_SIGNALS = {
  freshman: ["freshman", "first-year", "high", "a-g", "elc", "senior", "junior"],
  transfer: ["transfer", "community", "ccc", "tag", "assist", "igetc", "cal-getc", "tap", "units"],
};
const AUDIENCE_BOOST = 4;

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

function detectAudience(queryTokens) {
  const matches = Object.entries(AUDIENCE_SIGNALS)
    .filter(([, signals]) => signals.some((signal) => queryTokens.includes(signal)))
    .map(([audience]) => audience);

  return matches.length === 1 ? matches[0] : null;
}

function applyAudienceBoost(score, audience, chunk) {
  if (!audience || score === 0 || chunk.audience === "all") {
    return score;
  }

  return chunk.audience === audience ? score + AUDIENCE_BOOST : score - AUDIENCE_BOOST;
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
      audience: chunk.audience,
    });
  }

  return sources;
}

function retrieveRelevantChunks(question, options = {}) {
  const topK = options.topK || DEFAULT_TOP_K;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const chunks = options.chunks || loadKnowledgeBase(options.rootDir);
  const queryTokens = tokenize(question);
  const audience = options.audience || detectAudience(queryTokens);

  if (queryTokens.length === 0) {
    return { chunks: [], sources: [], queryTokens, audience: null };
  }

  const ranked = chunks
    .map((chunk) => ({
      chunk,
      score: applyAudienceBoost(scoreChunk(queryTokens, chunk), audience, chunk),
    }))
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, topK)
    .map((result) => ({ ...result.chunk, score: result.score }));

  return {
    chunks: ranked,
    sources: uniqueSources(ranked),
    queryTokens,
    audience,
  };
}

module.exports = {
  detectAudience,
  retrieveRelevantChunks,
  tokenize,
};
