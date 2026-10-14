const fs = require("node:fs");
const path = require("node:path");
const { retrieveRelevantChunks } = require("../lib/retriever");

function loadQuestions() {
  const testPath = path.join(process.cwd(), "knowledge-base", "test-questions.json");
  return JSON.parse(fs.readFileSync(testPath, "utf8"));
}

function main() {
  const questions = loadQuestions();
  const results = questions.map((item) => {
    const retrieval = retrieveRelevantChunks(item.question);
    const expectedFiles = item.expectedSources || [];
    const files = retrieval.sources.map((source) => source.file);

    return {
      id: item.id,
      topic: item.topic,
      question: item.question,
      audience: retrieval.audience,
      expectedFiles,
      topFile: files[0] || null,
      topMatched: expectedFiles.length ? expectedFiles.includes(files[0]) : null,
      matchedExpected: expectedFiles.length
        ? expectedFiles.every((file) => files.includes(file))
        : null,
      sourceFiles: files,
    };
  });

  const scored = results.filter((result) => result.matchedExpected !== null);
  const matched = scored.filter((result) => result.matchedExpected).length;
  const topMatched = scored.filter((result) => result.topMatched).length;

  console.log(
    JSON.stringify({ summary: { matched, topMatched, total: scored.length }, results }, null, 2)
  );
}

main();
