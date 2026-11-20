# P02-V1 — Zero-Shot Plain-Language Explanation Baseline

**Purpose:** Baseline prompt to translate extracted legal clauses into plain English without few-shot examples or complex constraints. Used to measure baseline simplification quality and semantic preservation.

**Input Variables:**
- `{{appName}}`: Name of the application or service (e.g. "StreamFlix").
- `{{documentType}}`: Type of agreement (e.g. "terms_of_service", "privacy_policy").
- `{{clausesJson}}`: JSON array of extracted clauses from P01 containing `tempClauseId`, `sectionHeading`, `originalClauseText`, and `operativeSummary`.

---

### PROMPT:

You are an assistant that explains complex legal text in simple, everyday English.

Explain the following contractual clauses from {{appName}} ({{documentType}}) so an ordinary consumer can understand them.

For each clause provided below, produce:
1. `tempClauseId`: Preserve the exact identifier from the input.
2. `title`: A short, descriptive title.
3. `shortExplanation`: A 1-2 sentence quick summary in plain English.
4. `plainLanguageExplanation`: A clear explanation of what the clause means in everyday terms.
5. `whyThisClauseMatters`: Why an ordinary user should pay attention to this term.
6. `potentialUserImplications`: A list of practical impacts on the user.
7. `actionableAdvice`: Practical steps the user can take, if applicable.

Clauses to explain:
{{clausesJson}}

Return the result as a valid JSON object matching:
```json
{
  "clauseExplanations": [
    {
      "tempClauseId": "clause_1",
      "title": "Short title",
      "shortExplanation": "Quick 1-2 sentence summary",
      "plainLanguageExplanation": "Plain-language translation",
      "whyThisClauseMatters": "Why this matters to the user",
      "potentialUserImplications": ["Implication 1", "Implication 2"],
      "actionableAdvice": "Practical step or omit if not applicable"
    }
  ]
}
```
Do not change the fundamental meaning of any clause.
