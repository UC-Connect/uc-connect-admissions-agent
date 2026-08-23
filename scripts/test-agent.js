const fs = require("node:fs");
const path = require("node:path");
const { generateAdmissionsAnswer } = require("../lib/ai-provider");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

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
