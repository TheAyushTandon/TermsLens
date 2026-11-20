import assert from "node:assert/strict";
import {
  validatePolicyInput,
  normalizePolicyText,
  parseHeading,
  segmentPolicyText,
  verifyClauseVerbatim,
} from "../src/lib/segmentation.ts";
import {
  validateP01OutputSchema,
  renderP01Prompt,
  loadP01PromptTemplate,
} from "../src/services/p01-clause-extraction.ts";
import { extractJsonFromResponse } from "../src/lib/gemini.ts";
import type { DocumentSegment, ExtractedClause } from "../src/types/index.ts";

console.log("=======================================================");
console.log("TermsLens P01 Clause Extraction Unit & Validation Tests");
console.log("=======================================================");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

// --------------------------------------------------------------------------
// 1. Text Validation & Normalization
// --------------------------------------------------------------------------
console.log("\n--- Group 1: Validation & Text Normalization ---");

runTest("Rejects empty string and whitespace", () => {
  assert.equal(validatePolicyInput("").isValid, false);
  assert.equal(validatePolicyInput("   \n\t  ").isValid, false);
});

runTest("Rejects short trivial text (< 50 chars or < 10 words)", () => {
  assert.equal(validatePolicyInput("Short text here.").isValid, false);
});

runTest("Normalizes CRLF and stitches hyphenated line-broken words", () => {
  const raw = "This is an agree-\nment that shall apply\r\nto users.";
  const normalized = normalizePolicyText(raw);
  assert.ok(normalized.includes("agreement that shall apply\nto users."));
});

// --------------------------------------------------------------------------
// 2. Heading & Page Detection
// --------------------------------------------------------------------------
console.log("\n--- Group 2: Heading & Page Detection ---");

runTest("Parses numbered sections correctly", () => {
  const h1 = parseHeading("Section 14.2 — Dispute Resolution and Arbitration");
  assert.ok(h1);
  assert.equal(h1?.sectionNumber, "14.2");

  const h2 = parseHeading("3. Billing and Subscriptions");
  assert.ok(h2);
  assert.equal(h2?.sectionNumber, "3");
});

runTest("Parses uppercase heading titles", () => {
  const h = parseHeading("LIMITATION OF LIABILITY");
  assert.ok(h);
  assert.equal(h?.sectionHeading, "LIMITATION OF LIABILITY");
});

// --------------------------------------------------------------------------
// 3. Document Segmentation & Source Tracking
// --------------------------------------------------------------------------
console.log("\n--- Group 3: Document Segmentation ---");

runTest("Segments text while preserving headings, numbers, and pages", () => {
  const doc = `
[Page 1]
Section 1. Acceptance of Terms
By accessing the service, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.

[Page 2]
Section 2. Automatic Renewal
Your subscription renews automatically every 30 days unless canceled at least 24 hours prior to the billing date.
`;
  const segments = segmentPolicyText(doc);
  assert.ok(segments.length >= 2, `Expected at least 2 segments, got ${segments.length}`);

  const seg1 = segments[0];
  assert.equal(seg1.sourcePage, 1);
  assert.ok(seg1.sectionHeading.includes("Section 1"));
  assert.ok(seg1.rawText.includes("bound by these Terms"));

  const seg2 = segments[1];
  assert.equal(seg2.sourcePage, 2);
  assert.equal(seg2.sectionNumber, "2");
  assert.ok(seg2.rawText.includes("renews automatically"));
});

runTest("Handles long documents by splitting into sub-segments", () => {
  const longParagraph = "This is a lengthy paragraph detailing extensive obligations. ".repeat(60);
  const doc = `Section 5. Long Section\n${longParagraph}`;
  const segments = segmentPolicyText(doc, { maxSegmentLength: 500 });
  assert.ok(segments.length > 1, "Expected paragraph to be chunked into multiple segments");
  for (const seg of segments) {
    assert.equal(seg.sectionHeading, "Section 5. Long Section");
  }
});

// --------------------------------------------------------------------------
// 4. Verbatim Matching & Anti-Hallucination
// --------------------------------------------------------------------------
console.log("\n--- Group 4: Verbatim Evidence Matching ---");

const testSegments: DocumentSegment[] = [
  {
    segmentIndex: 0,
    sectionHeading: "Section 3. Billing",
    sectionNumber: "3",
    sourcePage: 1,
    rawText: "Subscription fees are non-refundable. You authorize us to bill your payment card monthly.",
  },
  {
    segmentIndex: 1,
    sectionHeading: "Section 8. Termination",
    sectionNumber: "8",
    sourcePage: 3,
    rawText: "We may terminate or suspend your account immediately without prior notice for any reason.",
  },
];

runTest("Accepts genuine verbatim excerpt", () => {
  const clause: ExtractedClause = {
    tempClauseId: "c1",
    segmentIndex: 0,
    sectionHeading: "Section 3. Billing",
    originalClauseText: "Subscription fees are non-refundable.",
    operativeSummary: "Fees cannot be refunded.",
  };
  const res = verifyClauseVerbatim(clause, testSegments);
  assert.equal(res.isVerbatim, true);
  assert.equal(res.matchedSegmentIndex, 0);
});

runTest("Rejects paraphrased or hallucinated clause not in text", () => {
  const clause: ExtractedClause = {
    tempClauseId: "c2",
    segmentIndex: 0,
    sectionHeading: "Section 3. Billing",
    originalClauseText: "You have 30 days to request a full cash refund via email.", // Invented!
    operativeSummary: "30 day refund window.",
  };
  const res = verifyClauseVerbatim(clause, testSegments);
  assert.equal(res.isVerbatim, false);
});

runTest("Correctly matches clause even if segmentIndex was slightly mismatched", () => {
  const clause: ExtractedClause = {
    tempClauseId: "c3",
    segmentIndex: 0, // Points to 0, but text is actually in segment 1
    sectionHeading: "Section 8. Termination",
    originalClauseText: "We may terminate or suspend your account immediately without prior notice",
    operativeSummary: "Immediate termination without notice.",
  };
  const res = verifyClauseVerbatim(clause, testSegments);
  assert.equal(res.isVerbatim, true);
  assert.equal(res.matchedSegmentIndex, 1);
});

// --------------------------------------------------------------------------
// 5. Schema Validation & JSON Parsing
// --------------------------------------------------------------------------
console.log("\n--- Group 5: Schema Validation & Response Parsing ---");

runTest("Parses markdown code-fenced JSON cleanly", () => {
  const fenced = "```json\n{\"extractedClauses\": [], \"totalClausesAnalyzed\": 0}\n```";
  const parsed = extractJsonFromResponse(fenced);
  assert.equal(parsed.totalClausesAnalyzed, 0);
});

runTest("Validates compliant P01 payload", () => {
  const payload = {
    extractedClauses: [
      {
        tempClauseId: "clause_1",
        segmentIndex: 0,
        sectionHeading: "Arbitration",
        sectionNumber: "14",
        sourcePage: 5,
        originalClauseText: "All disputes must be resolved through binding arbitration.",
        operativeSummary: "Mandatory binding arbitration.",
      },
    ],
    totalClausesAnalyzed: 1,
  };
  const validation = validateP01OutputSchema(payload);
  assert.equal(validation.isValid, true);
  assert.equal(validation.output?.extractedClauses.length, 1);
});

runTest("Rejects payload missing required fields", () => {
  const invalid = {
    extractedClauses: [
      {
        tempClauseId: "clause_1",
        // missing segmentIndex, originalClauseText, operativeSummary
      },
    ],
  };
  const validation = validateP01OutputSchema(invalid);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.length > 0);
});

// --------------------------------------------------------------------------
// 6. Prompt Version Integrity
// --------------------------------------------------------------------------
console.log("\n--- Group 6: Prompt Version Integrity ---");

runTest("Loads all 3 prompt versions (V1, V2, V3) without error", () => {
  const v1 = loadP01PromptTemplate("v1");
  const v2 = loadP01PromptTemplate("v2");
  const v3 = loadP01PromptTemplate("v3");

  assert.ok(v1.includes("{{appName}}") && v1.includes("{{segmentsBlock}}"));
  assert.ok(v2.includes("OPERATING RULES & CONSTRAINTS") && v2.includes("VERBATIM REQUIREMENT"));
  assert.ok(v3.includes("FEW-SHOT EXAMPLES") && v3.includes("ADVERSARIAL GROUNDING"));
});

runTest("Renders prompt with interpolated values", () => {
  const prompt = renderP01Prompt("v3", testSegments, "TestService", "terms_of_service");
  assert.ok(prompt.includes("TestService"));
  assert.ok(prompt.includes("terms_of_service"));
  assert.ok(prompt.includes("[Segment 0 | Section: \"Section 3. Billing\""));
});

// --------------------------------------------------------------------------
// 7. Core Contractual Domain Scenarios
// --------------------------------------------------------------------------
console.log("\n--- Group 7: 10 Contractual Domain Scenarios ---");

const domainScenarios = [
  {
    name: "1. Automatic Subscription Renewal",
    text: "Your subscription automatically renews at $14.99/mo unless canceled at least 24 hours prior to expiration.",
    expectedHeading: "Auto-Renewal",
  },
  {
    name: "2. Personal-Data Collection",
    text: "We collect precise GPS geolocation, biometric voiceprints, device identifiers, and full contact address lists.",
    expectedHeading: "Data Collection",
  },
  {
    name: "3. Third-Party Data Sharing",
    text: "We share your hashed browsing data and demographic profile with advertising exchanges and third-party data brokers.",
    expectedHeading: "Data Sharing",
  },
  {
    name: "4. Account Termination",
    text: "The company reserves the right to terminate your account immediately without cause, leading to forfeiture of all content.",
    expectedHeading: "Termination",
  },
  {
    name: "5. Refund Restrictions",
    text: "All digital purchases and monthly subscription fees are strictly non-refundable under all circumstances.",
    expectedHeading: "Refunds",
  },
  {
    name: "6. Arbitration & Class Action Waiver",
    text: "You waive your right to a jury trial and agree to resolve disputes solely through binding individual arbitration.",
    expectedHeading: "Dispute Resolution",
  },
  {
    name: "7. Missing Section Headings (Unstructured)",
    text: "Notwithstanding anything to the contrary, users are liable for all indemnification costs incurred by the platform.",
    expectedHeading: "General Terms",
  },
  {
    name: "8. Ambiguous Contractual Language",
    text: "We may retain certain customer records for an indefinite or unspecified period as deemed appropriate by our security team.",
    expectedHeading: "Retention",
  },
  {
    name: "9. Long Policy Section with Multiple Provisions",
    text: "Section 9. Liability.\n" + "In no event shall the platform be liable for indirect damages. ".repeat(15),
    expectedHeading: "Section 9. Liability",
  },
  {
    name: "10. Empty or Irrelevant Input (Rejection)",
    text: "This is merely a random sentence without legal content.",
    shouldReject: true,
  },
];

for (const scenario of domainScenarios) {
  runTest(`Domain Scenario: ${scenario.name}`, () => {
    if (scenario.shouldReject) {
      const val = validatePolicyInput(scenario.text);
      assert.equal(val.isValid, false);
    } else {
      const segs = segmentPolicyText(scenario.text);
      assert.ok(segs.length > 0);
      assert.ok(segs[0].rawText.length > 0);
    }
  });
}

console.log("\n=======================================================");
console.log(`P01 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
}
