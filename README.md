# uc-connect-admissions-agent

AI-powered UC admissions assistant using local UC admissions knowledge-base files and Gemini.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` to your Gemini API key.
3. Optionally set `GEMINI_MODEL`.

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
  "sources": [],
  "model": "gemini-2.0-flash"
}
```

## Local Test

```bash
npm run test:agent
```

You can pass a custom question:

```bash
npm run test:agent -- "What is UC TAG?"
```
