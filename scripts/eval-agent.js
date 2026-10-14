const fs = require("node:fs");
const path = require("node:path");
const { generateAdmissionsAnswer } = require("../lib/ai-provider");
const { loadDotEnv } = require("../lib/env");

// Free-tier Gemini allows about 15 requests per minute; override with EVAL_DELAY_MS.
const DEFAULT_DELAY_MS = 4500;

function loadQuestions() {
  const testPath = path.join(process.cwd(), "knowledge-base", "test-questions.json");
  return JSON.parse(fs.readFileSync(testPath, "utf8"));
}

function includesText(text, expected) {
  return text.toLowerCase().includes(expected.toLowerCase());
}

function checkResult(testCase, result) {
  const answer = result.answer || "";
  const sourceFiles = new Set((result.sources || []).map((source) => source.file));
  const failures = [];

  for (const expectedSource of testCase.expectedSources || []) {
    if (!sourceFiles.has(expectedSource)) {
      failures.push(`missing expected source: ${expectedSource}`);
    }
  }

  for (const requiredText of testCase.mustInclude || []) {
    if (!includesText(answer, requiredText)) {
      failures.push(`answer missing required text: ${requiredText}`);
    }
  }

  for (const forbiddenText of testCase.mustNotInclude || []) {
    if (includesText(answer, forbiddenText)) {
      failures.push(`answer includes forbidden text: ${forbiddenText}`);
    }
  }

  if (testCase.shouldRefuse) {
    const refusalSignals = [
      "could not verify",
      "cannot guarantee",
      "can't guarantee",
      "cannot confirm",
      "can't confirm",
      "need",
      "please check",
      "ASSIST",
    ];
    const hasRefusalSignal = refusalSignals.some((signal) => includesText(answer, signal));

    if (!hasRefusalSignal) {
      failures.push("answer did not show a refusal, caution, or need for verification");
    }
  }

  return failures;
}

async function main() {
  loadDotEnv();

  if (!process.env.GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY. Add it to .env before running agent evaluation.");
    process.exitCode = 1;
    return;
  }

  const questions = loadQuestions();
  const delayMs = Number.parseInt(process.env.EVAL_DELAY_MS, 10) || DEFAULT_DELAY_MS;
  const results = [];

  for (const [index, testCase] of questions.entries()) {
    if (index > 0) {
      await delay(delayMs);
    }

    process.stderr.write(`Evaluating ${testCase.id}: ${testCase.question}\n`);

    let result;

    try {
      result = await generateAdmissionsAnswer(testCase.question);
    } catch (error) {
      results.push({
        id: testCase.id,
        topic: testCase.topic,
        question: testCase.question,
        passed: false,
        failures: [`request failed: ${error.message}`],
        sources: [],
        answer: "",
      });
      continue;
    }

    const failures = checkResult(testCase, result);

    results.push({
      id: testCase.id,
      topic: testCase.topic,
      question: testCase.question,
      passed: failures.length === 0,
      failures,
      sources: result.sources,
      answer: result.answer,
    });
  }

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  console.log(JSON.stringify({ summary: { passed, failed, total: results.length }, results }, null, 2));

  if (failed > 0) {
    process.exitCode = 1;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

main().catch((error) => {
  console.error(error.message || "Agent evaluation failed.");
  process.exitCode = 1;
});
