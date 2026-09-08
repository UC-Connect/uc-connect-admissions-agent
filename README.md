# uc-connect-admissions-agent

AI-powered UC admissions assistant using local UC admissions knowledge-base files and Gemini.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` to your Gemini API key.
3. Optionally set `GEMINI_MODEL`.
4. Optionally tune `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_TIMEOUT_MS`, and `GEMINI_MAX_ATTEMPTS`.

Never commit `.env` or API keys.

## API

`POST /api/chat`

Request:

```json
{
  "question": "What is UC TAG?"
}
```

Response:

```json
{
  "answer": "...",
  "sources": [
    {
      "title": "UC Transfer Admission Guarantee (TAG)",
      "url": "https://admission.universityofcalifornia.edu/...",
      "file": "uc-tag.md",
      "lastReviewed": "2026-08-06"
    }
  ],
  "retrievedChunks": [
    {
      "id": "uc-tag.md#1",
      "file": "uc-tag.md",
      "title": "UC Transfer Admission Guarantee (TAG)",
      "heading": "UC Transfer Admission Guarantee (TAG)",
      "score": 12
    }
  ],
  "model": "models/gemini-flash-lite-latest"
}
```

## RAG Flow

The current framework is intentionally small:

1. `lib/knowledge-base.js` loads `knowledge-base/*.md`, parses metadata, and splits files into chunks.
2. `lib/retriever.js` scores chunks against the user question and returns the top matches.
3. `lib/ai-provider.js` sends the system prompt, user question, and retrieved excerpts to Gemini.
4. `api/chat.js` validates the request and returns the model answer plus retrieval metadata.

## Local Test

Inspect retrieval without calling Gemini:

```bash
npm run retrieve -- "What is UC TAG?"
```

Run retrieval against the starter test questions:

```bash
npm run eval:retrieval
```

Run the full answer-quality evaluation. This calls Gemini and requires `GEMINI_API_KEY`:

```bash
npm run eval:agent
```

```bash
npm run test:agent
```

You can pass a custom question:

```bash
npm run test:agent -- "What is UC TAG?"
```
