# uc-connect-admissions-agent

UC Connect Admissions Agent is a grounded AI assistant for UC admissions and transfer questions. The goal is to answer from official-source knowledge files, cite sources, and avoid unsupported claims such as admission predictions, guaranteed eligibility, or invented course articulation.

## Technology

- Node.js, CommonJS
- Local Markdown knowledge base
- Frontmatter metadata parsing
- Heading-based document chunking
- Lightweight keyword retrieval with domain-specific query expansion
- Gemini API for answer generation
- Simple JSON-based retrieval and agent evaluation scripts

## Current Status

The MVP RAG framework is in place:

- Knowledge files are loaded from `knowledge-base/*.md`.
- Documents are split into source-aware chunks.
- User questions are matched to relevant chunks through local keyword scoring.
- Retrieved context is passed to Gemini with a stricter grounding prompt.
- Responses return the generated answer, source metadata, retrieved chunks, and model name.
- Retrieval evaluation currently matches the expected source set for the starter questions.

Current knowledge coverage includes UC transfer basic requirements, TAG, fall 2027 transfer dates and deadlines, ASSIST/course articulation guardrails, UC TAP, and IGETC/Cal-GETC basics.
