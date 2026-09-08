const fs = require("node:fs");
const path = require("node:path");

const KNOWLEDGE_DIR = "knowledge-base";
const EXCLUDED_FILES = new Set(["README.md", "system-prompt-draft.md"]);

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { metadata: {}, body: raw.trim() };
  }

  const end = raw.indexOf("\n---", 3);

  if (end === -1) {
    return { metadata: {}, body: raw.trim() };
  }

  const frontmatter = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).trim();
  const metadata = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (key) {
      metadata[key] = value;
    }
  }

  return { metadata, body };
}

function splitSections(body) {
  const sections = [];
  const lines = body.split(/\r?\n/);
  let currentHeading = "Overview";
  let currentLines = [];

  function flush() {
    const content = currentLines.join("\n").trim();

    if (content) {
      sections.push({ heading: currentHeading, content });
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);

    if (headingMatch) {
      flush();
      currentHeading = headingMatch[1].trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  flush();
  return sections;
}

function loadKnowledgeBase(rootDir = process.cwd()) {
  const knowledgeDir = path.join(rootDir, KNOWLEDGE_DIR);

  if (!fs.existsSync(knowledgeDir)) {
    return [];
  }

  return fs
    .readdirSync(knowledgeDir)
    .filter((file) => file.endsWith(".md") && !EXCLUDED_FILES.has(file))
    .sort()
    .flatMap((file) => {
      const filePath = path.join(knowledgeDir, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { metadata, body } = parseFrontmatter(raw);
      const title = metadata.title || path.basename(file, ".md");

      return splitSections(body).map((section, index) => ({
        id: `${file}#${index + 1}`,
        file,
        title,
        sourceUrl: metadata.source_url || "",
        sourceType: metadata.source_type || "",
        applicableCycle: metadata.applicable_cycle || "",
        lastReviewed: metadata.last_reviewed || "",
        heading: section.heading,
        content: section.content,
      }));
    });
}

function formatChunkForPrompt(chunk) {
  return [
    `Source title: ${chunk.title}`,
    `Source URL: ${chunk.sourceUrl || "Not provided"}`,
    `Applicable cycle/date: ${chunk.applicableCycle || "Not provided"}`,
    `Last reviewed: ${chunk.lastReviewed || "Not provided"}`,
    `Section: ${chunk.heading}`,
    "",
    chunk.content,
  ].join("\n");
}

module.exports = {
  formatChunkForPrompt,
  loadKnowledgeBase,
  parseFrontmatter,
};
