const fs = require("node:fs");
const path = require("node:path");
const { retrieveRelevantChunks } = require("../lib/retriever");

const topicSourceHints = {
  assist: "assist-and-course-articulation.md",
  assist_need_more_context: "assist-and-course-articulation.md",
  basic_requirements: "uc-transfer-basic-requirements.md",
  deadlines: "uc-dates-and-deadlines.md",
  general_education: "igetc-cal-getc.md",
  safety: null,
  tag: "uc-tag.md",
  tap: "uc-transfer-admission-planner.md",
};

function loadQuestions() {
  const testPath = path.join(process.cwd(), "knowledge-base", "test-questions.json");
  return JSON.parse(fs.readFileSync(testPath, "utf8"));
}

function main() {
  const questions = loadQuestions();
  const results = questions.map((item) => {
    const retrieval = retrieveRelevantChunks(item.question);
    const expectedFile = topicSourceHints[item.topic] || null;
    const files = retrieval.sources.map((source) => source.file);

    return {
      id: item.id,
      topic: item.topic,
      question: item.question,
      expectedFile,
      topFile: files[0] || null,
      matchedExpected: expectedFile ? files.includes(expectedFile) : null,
      sourceFiles: files,
    };
  });

  const scored = results.filter((result) => result.matchedExpected !== null);
  const matched = scored.filter((result) => result.matchedExpected).length;

  console.log(JSON.stringify({ summary: { matched, total: scored.length }, results }, null, 2));
}

main();
