const { generateAdmissionsAnswer } = require("../lib/ai-provider");
const { loadDotEnv } = require("../lib/env");

async function main() {
  loadDotEnv();

  const question = process.argv.slice(2).join(" ").trim() || "What is UC TAG?";
  const result = await generateAdmissionsAnswer(question);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const safeMessage = formatErrorMessage(error);

  console.error(safeMessage);
  process.exitCode = 1;
});

function formatErrorMessage(error) {
  if (error.code === "MISSING_GEMINI_API_KEY") {
    return "Missing GEMINI_API_KEY. Add it to .env or your shell environment.";
  }

  if (error.status) {
    return `Agent test failed: ${error.message} (status ${error.status})`;
  }

  return `Agent test failed: ${error.message || "Unknown error"}`;
}
