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

## Architecture

```text
User Question
    ↓
Retriever
    ↓
Relevant UC Knowledge Chunks
    ↓
Gemini
    ↓
Grounded Answer + Sources
```

## Current Status

The MVP RAG framework is in place:

- Knowledge files are loaded from `knowledge-base/*.md`.
- Documents are split into source-aware chunks.
- User questions are matched to relevant chunks through local keyword scoring.
- Retrieved context is passed to Gemini with a stricter grounding prompt.
- Responses return the generated answer, source metadata, retrieved chunks, and model name.
- Each knowledge file is tagged with an `audience` (`freshman`, `transfer`, or `all`); the retriever detects the applicant type from the question and boosts matching documents.
- Retrieval evaluation: on 43 scored questions, the expected sources appear in the top 5 for 42, and the expected source ranks first for 35. The one miss is an ambiguous question that does not say freshman or transfer; it is kept as a baseline for future semantic retrieval.

Current knowledge coverage:

- First-year: minimum requirements, A-G subject requirements, UC GPA calculation, statewide guarantee and ELC, comprehensive review (13 factors) and test policy, personal insight questions, fall 2027 dates and deadlines, out-of-state and international requirements including English proficiency.
- Transfer: basic requirements, TAG, UC Transfer Pathways, comprehensive review (9 factors), personal insight questions, fall 2027 dates and deadlines, ASSIST/course articulation guardrails, UC TAP, and IGETC/Cal-GETC.
- Shared: application fees and fee waivers, the nine undergraduate campuses, Blue and Gold Opportunity Plan and financial aid forms.

## Example Output

```json
{
  "answer": "...",
  "sources": [...],
  "model": "..."
}
```
