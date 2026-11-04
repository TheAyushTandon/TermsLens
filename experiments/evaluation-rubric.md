# TermsLens Prompt Pipeline Evaluation Rubric

This rubric defines the qualitative and quantitative scoring criteria used to evaluate prompt iterations across the 5-stage TermsLens pipeline:
- **P01**: Clause Extraction
- **P02**: Plain-Language Explanation
- **P03**: Risk & Privacy Analysis
- **P04**: Independent Evidence Verification
- **P05**: Final Report Generation

---

## 1. Evaluation Dimensions

### Dimension 1: Evidence Grounding & Zero Hallucination (Weight: 35%)
*Evaluates whether all generated claims, rights, and warnings are strictly grounded in verbatim policy text.*

* **Score 5 (Exemplary)**: 100% of claims are anchored in verbatim source quotes. Zero hallucinated deadlines (e.g., invented 30-day windows), postal addresses, unmentioned data brokers, or unstated tracking mechanisms. Ambiguity is explicitly acknowledged (e.g., *"contains no mention of an opt-out window"*).
* **Score 4 (Good)**: All substantive claims are evidenced; minor unevidenced general context without misleading contractual assertions.
* **Score 3 (Marginal)**: General findings match, but minor inferential leaps or unevidenced procedural steps are present.
* **Score 2 (Deficient)**: Extrapolates specific contractual mechanisms (deadlines, opt-out addresses, external recipients) not present in the source text.
* **Score 1 (Critical Failure)**: Severe hallucination; fabricates core contractual rights or obligations that directly contradict or exceed the text.

### Dimension 2: Plain-Language Accessibility (Weight: 25%)
*Evaluates clarity, readability, and consumer comprehension.*

* **Score 5 (Exemplary)**: Translates dense legal boilerplate into conversational, accessible language (~8th-grade reading level). Explains practical everyday user impact clearly without patronizing tone.
* **Score 4 (Good)**: Clear and understandable for ordinary users; minimal lingering legal jargon.
* **Score 3 (Marginal)**: Understandable but relies on legalistic phrases (e.g., *"indemnify"*, *"severability"*, *"remedy"*).
* **Score 2 (Deficient)**: Paraphrases legalese into slightly simpler legalese; remains difficult for average consumers.
* **Score 1 (Critical Failure)**: Merely repeats the original legalese with no meaningful simplification.

### Dimension 3: Risk & Privacy Identification Accuracy (Weight: 20%)
*Evaluates classification precision and appropriate attention level assignment.*

* **Score 5 (Exemplary)**: Correctly flags critical consumer hazards (binding arbitration, class action waivers, unilateral modification, biometric data collection, third-party selling) with appropriate attention levels (`high`, `moderate`, `informational`).
* **Score 4 (Good)**: Identifies all major risks; minor disagreement on moderate vs informational severity.
* **Score 3 (Marginal)**: Misses one secondary risk or over-inflates benign operational notices.
* **Score 2 (Deficient)**: Fails to detect high-attention clauses (e.g., mislabels mandatory arbitration as low risk).
* **Score 1 (Critical Failure)**: Completely fails to identify obvious consumer rights waivers.

### Dimension 4: Verification & Honesty Transparency (Weight: 10%)
*Evaluates adherence to explicit qualification of unstated practices.*

* **Score 5 (Exemplary)**: Accurately tags privacy practices as `explicitly_stated`, `reasonable_interpretation`, or `not_specified`. Enforces standard phrases when retention or deletion timelines are unspecified.
* **Score 4 (Good)**: Accurately qualifies distinctions with minor phrasing differences.
* **Score 3 (Marginal)**: Conflates reasonable interpretation with explicit statements on non-critical points.
* **Score 2 (Deficient)**: Treats unstated retention periods as confirmed indefinite retention without qualification.
* **Score 1 (Critical Failure)**: Marks contradictory or fabricated claims as verified.

### Dimension 5: Schema & Format Compliance (Weight: 10%)
*Evaluates deterministic JSON structure against TypeScript contracts.*

* **Score 5 (Exemplary)**: Valid JSON matching target TypeScript interface (`AnalysisReport`, `Clause`, `PrivacyFinding`). All required fields, IDs, enums, and quote references are strictly populated.
* **Score 4 (Good)**: Valid JSON with minor optional field omissions.
* **Score 3 (Marginal)**: Valid JSON but requires post-processing normalization of enum casing or field keys.
* **Score 2 (Deficient)**: Malformed JSON or missing required arrays (`clauses`, `privacyFindings`).
* **Score 1 (Critical Failure)**: Non-parseable output or severe markdown wrapping causing parser failures.

---

## 2. Evaluation Scorecard Template

```markdown
### Evaluation Run: [RUN-YYYY-XXXX]
- **Date**: YYYY-MM-DD
- **Evaluator**: [Name / Agent]
- **Test Case ID**: [e.g., TC-ARB-001]
- **Stage Evaluated**: [P01 | P02 | P03 | P04 | P05]
- **Prompt Version**: [e.g., baseline vs refined-v1]
- **Model / Engine**: [e.g., Claude 3.5 Sonnet / Gemini 1.5 Pro / GPT-4o]

#### Dimension Scores (1 - 5)
1. **Evidence Grounding (35%)**: [ ] / 5
2. **Plain-Language Accessibility (25%)**: [ ] / 5
3. **Risk & Privacy Accuracy (20%)**: [ ] / 5
4. **Verification Transparency (10%)**: [ ] / 5
5. **Schema Compliance (10%)**: [ ] / 5

**Weighted Overall Score**: [ ] / 5.0
**Pass / Fail Decision**: [PASS (>= 4.0 with Grounding >= 4) | FAIL]

#### Qualitative Notes & Findings
- **Strengths**:
  - [Observed positive behaviors]
- **Weaknesses / Hallucinations**:
  - [Specific unevidenced text or failures observed]
- **Prompt Refinement Recommendations**:
  - [Suggested instructions or few-shot additions]
```

