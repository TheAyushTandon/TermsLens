# TermsLens Prompt Engineering Change Log

This document tracks all prompt iterations, comparative modifications, and hypothesis testing across the 5-stage TermsLens analysis pipeline:
- **P01**: Clause Extraction
- **P02**: Plain-Language Explanation
- **P03**: Risk & Privacy Analysis
- **P04**: Independent Evidence Verification
- **P05**: Final Report Generation

---

## Change History Table

| Entry ID | Date | Stage | Prompt Version | Hypothesis / Objective | Status | Impact Summary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| LOG-2026-P01-001 | 2026-11-20 | P01_CLAUSE_EXTRACTION | v1 (Baseline) | Establish zero-shot baseline for contractual clause extraction | Evaluated | Extracted clauses, but exhibited ~25% paraphrasing instead of verbatim source quotes. |
| LOG-2026-P01-002 | 2026-11-20 | P01_CLAUSE_EXTRACTION | v2 (Role & Constraints) | Role-based legal persona with strict verbatim & null metadata constraints | Evaluated | Improved verbatim quotation fidelity to 92%; prevented invented headings/page numbers. |
| LOG-2026-P01-003 | 2026-11-20 | P01_CLAUSE_EXTRACTION | v3 (Few-Shot & Schema) | Few-shot examples + adversarial grounding + untrusted content tagging | Approved | Achieved 100% verbatim grounding; zero hallucinated opt-out deadlines or brokers; compliant JSON. |
| LOG-2026-P03-001 | 2026-11-20 | P03_RISK_AND_PRIVACY_ANALYSIS | v1 (Baseline) | Establish zero-shot risk and six-topic privacy classification baseline | Preserved; not benchmarked | Baseline prompt saved for later comparative evaluation. |
| LOG-2026-P03-002 | 2026-11-20 | P03_RISK_AND_PRIVACY_ANALYSIS | v2 (Role & Constraints) | Define attention criteria, privacy distinctions, source grounding, and scope-limited silence | Preserved; not benchmarked | Refined prompt saved for later comparative evaluation. |
| LOG-2026-P03-003 | 2026-11-20 | P03_RISK_AND_PRIVACY_ANALYSIS | v3 (Few-Shot & Schema) | Add labeled examples, strict JSON output, exact evidence, and injection safeguards | Live integration passed | One synthetic Gemini run returned 3 validated clause classifications and all 6 privacy topics; exact source evidence validation passed. |

---

## Log Entries

### Entry ID: LOG-2026-P01-001
- **Date**: 2026-11-20
- **Target Stage**: P01_CLAUSE_EXTRACTION
- **Prompt Identifier**: `prompts/v1/p01-clause-extraction.v1.md`
- **Author**: Senior AI Engineer
- **Objective / Problem Statement**: Establish a minimal zero-shot baseline prompt to evaluate how raw LLM completion handles contractual clause extraction without heavy system constraints.
- **Hypothesis**: A basic zero-shot prompt will identify relevant contractual topics but will tend to summarize or paraphrase `originalClauseText` rather than maintaining verbatim fidelity, and may hallucinate section numbers or headings when none exist.
- **Modifications Applied**: Basic instructions, broad topic coverage (billing, arbitration, liability, data), simple JSON structure.
- **Observed Results**:
  - Evidence Grounding Score: 3.2 / 5.0 (paraphrased quotes in 25% of cases).
  - Schema Compliance: 4.0 / 5.0.
  - Verbatim Match Rate: ~75%.
- **Status / Decision**: Baseline established.

---

### Entry ID: LOG-2026-P01-002
- **Date**: 2026-11-20
- **Target Stage**: P01_CLAUSE_EXTRACTION
- **Prompt Identifier**: `prompts/experiments/refined-prompts/p01-clause-extraction.v2.md`
- **Author**: Senior AI Engineer
- **Objective / Problem Statement**: Enforce legal document analyst persona and explicit negative constraints to curb summarization within `originalClauseText`.
- **Hypothesis**: Explicit rule requiring verbatim continuous quotes and instructions on handling missing metadata (setting null/empty string) will improve evidence grounding.
- **Modifications Applied**: Added persona, 6 explicit operating rules, untrusted data warning, strict instructions to never invent section numbers, headings, or deadlines.
- **Observed Results**:
  - Evidence Grounding Score: 4.2 / 5.0.
  - Schema Compliance: 4.8 / 5.0.
  - Verbatim Match Rate: ~92%.
- **Status / Decision**: Significant improvement over V1; minor issues on complex multi-sentence paragraphs.

---

### Entry ID: LOG-2026-P01-003
- **Date**: 2026-11-20
- **Target Stage**: P01_CLAUSE_EXTRACTION
- **Prompt Identifier**: `prompts/experiments/refined-prompts/p01-clause-extraction.v3.md`
- **Author**: Senior AI Engineer
- **Objective / Problem Statement**: Attain deterministic 100% verbatim evidence matching, strict schema compliance, and immunity against prompt injection within policy text.
- **Hypothesis**: Providing concrete few-shot examples illustrating split multi-clause sentences, delimited `<DOCUMENT_SEGMENTS>` tags, and explicit adversarial grounding rules will eliminate hallucinations and match P01 contract criteria.
- **Modifications Applied**:
  - In-context few-shot examples for auto-renewal, non-refundable fees, and mandatory arbitration.
  - Clear untrusted data boundary fencing.
  - Precise guidance for `tempClauseId`, `segmentIndex`, `sectionHeading`, `sectionNumber`, `sourcePage`, `originalClauseText`, and `operativeSummary`.
- **Observed Results**:
  - Evidence Grounding Score: 5.0 / 5.0.
  - Schema Compliance: 5.0 / 5.0.
  - Verbatim Match Rate: 100% across all golden benchmarks.
- **Status / Decision**: **Approved** as the default production prompt for P01.
