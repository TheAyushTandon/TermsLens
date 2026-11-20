# P01 — Clause Extraction Implementation & Testing Guide

## Overview
**P01 — Clause Extraction** is the first operational stage of the 5-stage TermsLens prompt engineering and analysis pipeline. It accepts raw policy text (or pre-split `DocumentSegment[]`) and outputs a structured JSON payload conforming to the contract specified in [`docs/frontend-backend-contract.md`](file:///Users/aashimamakani/TermsLens/docs/frontend-backend-contract.md#L127-L144).

The extracted clauses are verified against the source text to ensure 100% verbatim grounding, preventing downstream stages (P02 through P05) from hallucinating non-existent contractual terms, deadlines, or conditions.

---

## Architecture & File Structure

```
├── .env.example                                  # Template for GEMINI_API_KEY and model settings
├── docs/p01-implementation-guide.md              # This guide
├── prompts/
│   ├── v1/p01-clause-extraction.v1.md            # P01-V1: Zero-shot baseline
│   └── experiments/refined-prompts/
│       ├── p01-clause-extraction.v2.md           # P01-V2: Role-based + constraints
│       └── p01-clause-extraction.v3.md           # P01-V3: Few-shot + JSON schema enforcement
├── src/
│   ├── types/index.ts                            # P01 TypeScript interfaces (ExtractedClause, P01_Output, etc.)
│   ├── lib/
│   │   ├── segmentation.ts                       # Normalization, heading/page detection, chunking & verbatim audit
│   │   └── gemini.ts                             # Server-side Gemini API client (native fetch, error & rate limit handling)
│   ├── services/
│   │   └── p01-clause-extraction.ts              # Core P01 extraction orchestration service
│   └── app/api/pipeline/p01/route.ts             # Modular Next.js POST endpoint for P01
└── tests/
    ├── p01-clause-extraction.test.ts             # 25 deterministic unit & domain scenario tests
    └── p01-live-gemini.test.ts                   # Real Gemini API integration test runner
```

---

## Output Contract (`P01_Output`)

```typescript
interface P01_Output {
  extractedClauses: Array<{
    tempClauseId: string;        // Unique clause ID (e.g., "clause_1")
    segmentIndex: number;        // Zero-based index of source segment
    sectionHeading: string;      // Section heading (or "" if absent)
    sectionNumber?: string;      // Section number (or undefined if absent)
    sourcePage?: number;         // Page number (or undefined if absent)
    originalClauseText: string;  // Verbatim quote from original policy
    operativeSummary: string;    // Objective 1-2 sentence plain summary
  }>;
  totalClausesAnalyzed: number;
}
```

---

## How to Test P01

### 1. Deterministic Unit & Domain Tests (No API Key Required)
Run the 25 deterministic tests covering text normalization, section heading detection, long document chunking, verbatim matching, JSON parsing, prompt rendering, and all 10 domain scenarios:

```bash
npm run test:p01
```

Or run the full test suite:
```bash
npm test
```

### 2. Live Gemini Integration Test (Requires API Key)
Set your Gemini API key in your terminal session or `.env.local`:

```bash
export GEMINI_API_KEY="AIzaSy..."
npm run test:p01:live
```

When no key is configured, the live runner gracefully logs instructions and exits without faking results.

### 3. Testing via the HTTP API Endpoint
Start the development server:

```bash
npm run dev
```

Issue a POST request to `/api/pipeline/p01`:

```bash
curl -X POST http://localhost:3000/api/pipeline/p01 \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "TestApp",
    "documentType": "terms_of_service",
    "rawText": "[Page 1]\nSection 3. Billing\nSubscription fees renew automatically each month and are strictly non-refundable."
  }'
```

Response format:
```json
{
  "success": true,
  "stage": "P01_CLAUSE_EXTRACTION",
  "data": {
    "extractedClauses": [
      {
        "tempClauseId": "clause_001",
        "segmentIndex": 0,
        "sectionHeading": "Section 3. Billing",
        "sectionNumber": "3",
        "sourcePage": 1,
        "originalClauseText": "Subscription fees renew automatically each month and are strictly non-refundable.",
        "operativeSummary": "Subscriptions renew automatically every month and fees are completely non-refundable."
      }
    ],
    "totalClausesAnalyzed": 1
  },
  "metadata": {
    "model": "gemini-2.5-flash",
    "promptVersion": "v3",
    "durationMs": 850,
    "segmentsProcessed": 1,
    "verbatimVerificationRate": 1.0
  }
}
```
