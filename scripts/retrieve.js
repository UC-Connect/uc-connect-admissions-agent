const { retrieveRelevantChunks } = require("../lib/retriever");

function main() {
  const question = process.argv.slice(2).join(" ").trim();

  if (!question) {
    console.error('Usage: node scripts/retrieve.js "What is UC TAG?"');
    process.exitCode = 1;
    return;
  }

  const result = retrieveRelevantChunks(question);

  console.log(
    JSON.stringify(
      {
        question,
        queryTokens: result.queryTokens,
        sources: result.sources,
        retrievedChunks: result.chunks.map((chunk) => ({
          id: chunk.id,
          file: chunk.file,
          title: chunk.title,
          heading: chunk.heading,
          score: chunk.score,
          preview: chunk.content.slice(0, 240),
        })),
      },
      null,
      2
    )
  );
}

main();
