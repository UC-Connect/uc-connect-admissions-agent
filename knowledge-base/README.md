# UC Connect Admissions Knowledge Base

This folder is the starter knowledge base for the UC Connect Admissions Assistant.

## Scope of the first version

The assistant should answer general UC transfer questions using official sources. It should not:
- predict admission chances;
- guarantee eligibility;
- replace a college counselor;
- invent an answer when the source material is insufficient;
- treat campus- or major-specific requirements as universal.

## File metadata

Each knowledge file contains:
- title;
- source URL;
- source type;
- applicable cycle or date;
- last reviewed date;
- factual content;
- answer guardrails.

## Suggested RAG behavior

1. Retrieve 3–5 relevant chunks.
2. Answer only from retrieved material.
3. Cite the source title and URL.
4. State when campus or major requirements may be higher.
5. When evidence is insufficient, say:  
   “I could not verify this from the current UC Connect knowledge base. Please check the official campus or department website.”

## Privacy

Do not ask users to enter SSNs, passport numbers, student IDs, complete financial records, or other highly sensitive information.
