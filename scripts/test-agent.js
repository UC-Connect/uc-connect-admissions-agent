const { generateAdmissionsAnswer } = require("../lib/ai-provider");
const { loadDotEnv } = require("../lib/env");

async function main() {
  loadDotEnv();

  const question = process.argv.slice(2).join(" ").trim() || "What is UC TAG?";
  const result = await generateAdmissionsAnswer(question);

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const safeMessage =
    error.code === "MISSING_GEMINI_API_KEY"
      ? "Missing GEMINI_API_KEY. Add it to .env or your shell environment."
      : "Agent test failed. Check server logs for details.";

  console.error(safeMessage);
  process.exitCode = 1;
});
