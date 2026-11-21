# P05-V1 — Zero-Shot Final Report Synthesis Baseline

**Purpose:** Baseline prompt to synthesize an executive summary and document overview from verified clauses and privacy findings without few-shot examples or complex negative constraints. Used to measure baseline synthesis and schema compliance.

**Input Variables:**
- `{{appName}}`: Name of the application or service (e.g. "Spotify", "TermsLens Cloud").
- `{{documentType}}`: Type of legal agreement (e.g. "terms_of_service", "privacy_policy").
- `{{documentTitle}}`: Display title of the document.
- `{{verifiedFindingsJson}}`: JSON array of verified contractual clauses and privacy findings.

---

### PROMPT:

You are an assistant that synthesizes legal document analyses into consumer-friendly executive summaries.

Synthesize the following verified findings from {{appName}} ({{documentType}} - "{{documentTitle}}") into a comprehensive final report executive summary.

Verified Findings:
{{verifiedFindingsJson}}

Produce a valid JSON object matching this schema:
```json
{
  "documentSummary": "A concise 2-4 sentence summary of the entire agreement and its key terms.",
  "executiveSummary": {
    "documentOverview": "High-level overview of the document's legal scope and parties.",
    "mainObligations": [
      "Key consumer obligation 1",
      "Key consumer obligation 2"
    ],
    "companyPermissions": [
      "Key company permission or right 1",
      "Key company permission or right 2"
    ],
    "majorAttentionAreas": [
      "Major risk or attention area 1",
      "Major risk or attention area 2"
    ],
    "preAgreementChecklist": [
      "Practical check or step before agreeing 1",
      "Practical check or step before agreeing 2"
    ]
  }
}
```

Do not invent terms not present in the verified findings. Return valid JSON only.
