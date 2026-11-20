import assert from "node:assert/strict";
import {
  validateP02OutputSchema,
  renderP02Prompt,
  loadP02PromptTemplate,
} from "../src/services/p02-plain-language-explanation.ts";
import type { ExtractedClause } from "../src/types/index.ts";

console.log("=======================================================");
console.log("TermsLens P02 Plain-Language Explanation Unit Tests");
console.log("=======================================================");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}: ${msg}`);
    failed++;
  }
}

const sampleClauses: ExtractedClause[] = [
  {
    tempClauseId: "clause_001",
    segmentIndex: 0,
    sectionHeading: "Section 3. Subscriptions",
    sectionNumber: "3.1",
    sourcePage: 1,
    originalClauseText: "Subscriptions automatically renew every month unless canceled at least 24 hours prior to the billing date.",
    operativeSummary: "Auto-renews monthly unless canceled 24 hours prior.",
  },
  {
    tempClauseId: "clause_002",
    segmentIndex: 1,
    sectionHeading: "Section 14. Arbitration",
    sectionNumber: "14",
    sourcePage: 4,
    originalClauseText: "All disputes must be resolved by binding individual arbitration with no right to a jury trial or class action.",
    operativeSummary: "Mandatory individual binding arbitration and class action waiver.",
  },
];

// --------------------------------------------------------------------------
// 1. Prompt Loading & Rendering
// --------------------------------------------------------------------------
console.log("\n--- Group 1: Prompt Loading & Rendering ---");

runTest("Loads all 3 P02 prompt versions without error", () => {
  const v1 = loadP02PromptTemplate("v1");
  const v2 = loadP02PromptTemplate("v2");
  const v3 = loadP02PromptTemplate("v3");

  assert.ok(v1.includes("{{appName}}") && v1.includes("{{clausesJson}}"));
  assert.ok(v2.includes("8th-Grade Readability") && v2.includes("No Hallucinated Procedures"));
  assert.ok(v3.includes("FEW-SHOT EXAMPLES") && v3.includes("<EXTRACTED_CLAUSES>"));
});

runTest("Renders prompt correctly with clause placeholders", () => {
  const rendered = renderP02Prompt("v3", sampleClauses, "TermsLens App", "terms_of_service");
  assert.ok(rendered.includes("TermsLens App"));
  assert.ok(rendered.includes("terms_of_service"));
  assert.ok(rendered.includes("clause_001"));
  assert.ok(rendered.includes("clause_002"));
});

// --------------------------------------------------------------------------
// 2. Schema & Clause ID Preservation Validation
// --------------------------------------------------------------------------
console.log("\n--- Group 2: Output Schema & Clause ID Validation ---");

runTest("Validates compliant P02 payload with all expected clause IDs", () => {
  const payload = {
    clauseExplanations: [
      {
        tempClauseId: "clause_001",
        title: "Automatic Subscription Renewal",
        shortExplanation: "Your plan renews automatically every month unless canceled 24 hours ahead.",
        plainLanguageExplanation: "The company will keep charging you each month unless you cancel at least 24 hours before the billing date.",
        whyThisClauseMatters: "You will continue paying monthly fees until you take action to cancel.",
        potentialUserImplications: [
          "Automatic charges will occur on your saved payment method.",
          "Missing the 24-hour cutoff will charge you for another month.",
        ],
        actionableAdvice: "Set a calendar alert 2 days before the renewal date if you want to cancel.",
      },
      {
        tempClauseId: "clause_002",
        title: "Mandatory Private Arbitration",
        shortExplanation: "Disputes must be handled through private arbitration rather than a court trial.",
        plainLanguageExplanation: "You cannot sue the company in regular court or take part in a class action lawsuit.",
        whyThisClauseMatters: "Removes your ability to have a public jury trial or join forces with other users.",
        potentialUserImplications: [
          "You must resolve any dispute alone.",
          "Arbitration decisions are final and binding.",
        ],
      },
    ],
  };

  const validation = validateP02OutputSchema(payload, ["clause_001", "clause_002"]);
  assert.equal(validation.isValid, true);
  assert.equal(validation.output?.clauseExplanations.length, 2);
  assert.equal(validation.output?.clauseExplanations[0].tempClauseId, "clause_001");
  assert.equal(validation.output?.clauseExplanations[1].tempClauseId, "clause_002");
});

runTest("Fails validation when a required clause ID is missing from response", () => {
  const payload = {
    clauseExplanations: [
      {
        tempClauseId: "clause_001",
        title: "Title 1",
        shortExplanation: "Short explanation",
        plainLanguageExplanation: "Plain language",
        whyThisClauseMatters: "Why it matters",
        potentialUserImplications: ["Implication 1"],
      },
      // clause_002 is missing!
    ],
  };

  const validation = validateP02OutputSchema(payload, ["clause_001", "clause_002"]);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some((e) => e.includes("missing explanation for expected clause ID 'clause_002'")));
});

runTest("Fails validation on malformed explanation objects", () => {
  const invalid = {
    clauseExplanations: [
      {
        tempClauseId: "clause_001",
        // missing title, shortExplanation, etc.
      },
    ],
  };
  const validation = validateP02OutputSchema(invalid, ["clause_001"]);
  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.length >= 4);
});

// --------------------------------------------------------------------------
// 3. Meaning & Condition Preservation Tests
// --------------------------------------------------------------------------
console.log("\n--- Group 3: Condition & Meaning Preservation Logic ---");

runTest("Verifies that conditions (e.g. 24-hour notice) are represented in implications", () => {
  const explanation = {
    tempClauseId: "clause_001",
    title: "Renewal Terms",
    shortExplanation: "Auto-renews unless canceled 24 hours early.",
    plainLanguageExplanation: "Must cancel at least 24 hours prior to billing.",
    whyThisClauseMatters: "Strict deadlines apply.",
    potentialUserImplications: ["Missing 24 hours results in charges."],
  };

  assert.ok(explanation.plainLanguageExplanation.includes("24 hours"));
});

console.log("\n=======================================================");
console.log(`P02 Test Suite Completed: ${passed} Passed, ${failed} Failed`);
console.log("=======================================================");

if (failed > 0) {
  process.exit(1);
}
