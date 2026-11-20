# P03 — Risk and Privacy Analysis

P03 accepts a validated `P01_Output` and, optionally, the relevant policy text. It returns one category and attention level per P01 clause, plus one privacy finding for each of the six contract topics. When no full policy context is supplied, privacy conclusions are explicitly limited to the extracted clause excerpts.

## API

`POST /api/pipeline/p03`

```json
{
  "appName": "Example App",
  "documentType": "privacy_policy",
  "promptVersion": "v3",
  "policyContext": "Full or relevant policy text...",
  "p01Output": {
    "extractedClauses": [
      {
        "tempClauseId": "clause_001",
        "segmentIndex": 0,
        "sectionHeading": "Subscriptions",
        "originalClauseText": "Your subscription renews automatically every month until canceled.",
        "operativeSummary": "The subscription renews monthly until canceled."
      }
    ],
    "totalClausesAnalyzed": 1
  }
}
```

The route also accepts `p01P02Output.p01` or `pipelineOutput.p01` for a combined P01→P02 result. `policyContext` may be omitted when P01 contains clauses; in that case, the service does not treat excerpt silence as evidence about the full policy. The API ignores client-supplied Gemini credentials and uses the server-side `GEMINI_API_KEY` and `GEMINI_MODEL`.

## Prompts and tests

- V1 baseline: `prompts/v1/p03-risk-privacy-analysis.v1.md`
- V2 refined: `prompts/experiments/refined-prompts/p03-risk-privacy-analysis.v2.md`
- V3 default: `prompts/experiments/refined-prompts/p03-risk-privacy-analysis.v3.md`
- Deterministic tests: `npm run test:p03` (included in `npm test`)
- Live synthetic Gemini test: `npm run test:p03:live`

The live test loads `.env.local` without printing its contents. It makes a real Gemini request; configure `GEMINI_API_KEY` in the server environment or `.env.local` first.

## Live Gemini evidence

Executed 2026-11-20 using synthetic policy text only:

- Result: passed; output schema and every privacy evidence quote passed server-side validation.
- Model / prompt: `gemini-3.5-flash-lite` / V3; 6,134 ms.
- Clause classifications: `synthetic_collection` → `data_collection` (moderate); `synthetic_sharing` → `data_sharing` (moderate); `synthetic_billing` → `subscription_billing` (moderate).
- Privacy findings: all six topics returned as `explicitly_stated`. The returned evidence exactly matched the synthetic text for collection, payment-processor sharing, cookies/interest-based advertising, 24-month retention, account deletion/30-day backup retention, and the statement that documents are not used to train generative AI models.

This is one live integration check, not a comparative prompt-quality benchmark; V1/V2 remain available for later evaluation.
