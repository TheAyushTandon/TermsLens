import assert from "node:assert/strict";
import {
  loadP05PromptTemplate,
  renderP05Prompt,
  validateP05ExecutiveSummarySchema,
  validateUpstreamPipelineOutputs,
  assembleAnalysisReport,
  formatSourceReferenceText,
  deriveContractGroundingFromP01P02,
  mapAttentionLevel,
  mapClauseCategory,
  EXPECTED_PRIVACY_TOPICS,
  runFullPolicyAnalysisPipeline,
  type P03_Output,
  type P04_Output,
  type P05_ExecutiveSummarySynthesis,
} from "../src/services/p05-final-report-generation.ts";
import {
  validateAnalysisReport,
  createDynamicReportFromText,
} from "../src/services/analysis-service.ts";
import { extractJsonFromResponse } from "../src/lib/gemini.ts";
import { reportStore } from "../src/lib/report-store.ts";
import type {
  P01_Output,
  P02_Output,
  DocumentType,
} from "../src/types/index.ts";

console.log("=======================================================");
console.log("TermsLens P05 Final Report Generation Automated Test Suite");
console.log("=======================================================");

let passed = 0;
let failed = 0;
let total = 0;

interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

const testQueue: TestCase[] = [];

function runTest(name: string, fn: () => void | Promise<void>) {
  testQueue.push({ name, fn });
}

// ============================================================================
// [SYNTHETIC-FIXTURE] Fixtures for Isolated Pipeline Testing
// ============================================================================

const SYNTHETIC_P01: P01_Output = {
  extractedClauses: [
    {
      tempClauseId: "clause_arb_001",
      segmentIndex: 0,
      sectionHeading: "Section 24.1 Dispute Resolution",
      sectionNumber: "24.1",
      sourcePage: 16,
      originalClauseText:
        "All disputes must be decided by mandatory binding individual arbitration. You waive any right to a jury trial or class action.",
      operativeSummary: "Mandatory individual binding arbitration and class action waiver.",
    },
    {
      tempClauseId: "clause_bill_002",
      segmentIndex: 1,
      sectionHeading: "Section 8.2 Subscriptions and Billing",
      sectionNumber: "8.2",
      sourcePage: 7,
      originalClauseText:
        "Subscriptions renew automatically on a monthly basis. You authorize recurring charges until you cancel.",
      operativeSummary: "Automatic monthly renewal and recurring payment authorization.",
    },
  ],
  totalClausesAnalyzed: 2,
};

const SYNTHETIC_P02: P02_Output = {
  clauseExplanations: [
    {
      tempClauseId: "clause_arb_001",
      title: "Mandatory Binding Arbitration",
      shortExplanation: "You cannot sue in court or join class actions; disputes go to a private arbitrator.",
      plainLanguageExplanation: "If you have a disagreement, you must use private arbitration rather than a court trial.",
      whyThisClauseMatters: "Eliminates access to court jury trials.",
      potentialUserImplications: [
        "No court jury trial.",
        "Cannot join other consumers in joint class lawsuits.",
      ],
      actionableAdvice: "Check whether an opt-out window is stated in complete terms.",
    },
    {
      tempClauseId: "clause_bill_002",
      title: "Automatic Subscription Renewal",
      shortExplanation: "Your card is billed each month automatically until you cancel.",
      plainLanguageExplanation: "The service keeps charging monthly fees until you navigate to account settings to cancel.",
      whyThisClauseMatters: "Recurring fees continue indefinitely without manual monthly re-approval.",
      potentialUserImplications: [
        "Continuous charges occur on your payment card.",
      ],
      actionableAdvice: "Set a calendar reminder before your monthly billing renewal date.",
    },
  ],
};

const SYNTHETIC_P03: P03_Output = {
  clauseClassifications: [
    {
      tempClauseId: "clause_arb_001",
      category: "dispute_resolution",
      attentionLevel: "high",
    },
    {
      tempClauseId: "clause_bill_002",
      category: "subscription_billing",
      attentionLevel: "moderate",
    },
  ],
  privacyFindings: [
    {
      id: "priv_synth_1",
      topic: "personal_info_collected",
      topicTitle: "Personal Information Collected",
      distinction: "explicitly_stated",
      summary: "Collects registration email and billing payment tokens.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_synth_2",
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding third-party data broker sharing.",
      silenceNotice: "The excerpt does not identify external data broker partnerships.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_synth_3",
      topic: "advertising_tracking",
      topicTitle: "Advertising and Behavioral Tracking",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding cross-app behavioral tracking.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_synth_4",
      topic: "data_retention",
      topicTitle: "Data Retention Period",
      distinction: "not_specified",
      summary: "No specific retention period is stated in the provided excerpt.",
      silenceNotice:
        "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      attentionLevel: "high",
    },
    {
      id: "priv_synth_5",
      topic: "account_deletion",
      topicTitle: "Account Deletion Rights",
      distinction: "not_specified",
      summary: "The provided excerpt does not specify account deletion procedures.",
      attentionLevel: "informational",
    },
    {
      id: "priv_synth_6",
      topic: "ai_model_training",
      topicTitle: "AI & Model Training Usage",
      distinction: "not_specified",
      summary:
        "The provided excerpt is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      silenceNotice: "The agreement is silent regarding AI model training.",
      attentionLevel: "moderate",
    },
  ],
};

const SYNTHETIC_P04_SUPPORTED: P04_Output = {
  verifiedClauses: [
    {
      tempClauseId: "clause_arb_001",
      evidence: {
        exactQuote: "All disputes must be decided by mandatory binding individual arbitration.",
        highlightExcerpt: "mandatory binding individual arbitration",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against Section 24.1 verbatim text.",
        verifiedAt: "2026-11-21T00:00:00Z",
        evidenceMatchesOriginal: true,
      },
    },
    {
      tempClauseId: "clause_bill_002",
      evidence: {
        exactQuote: "Subscriptions renew automatically on a monthly basis.",
        highlightExcerpt: "renew automatically on a monthly basis",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against Section 8.2 verbatim text.",
        verifiedAt: "2026-11-21T00:00:00Z",
        evidenceMatchesOriginal: true,
      },
    },
  ],
};

const SYNTHETIC_SYNTHESIS: P05_ExecutiveSummarySynthesis = {
  documentSummary:
    "Governs user access to TermsLens Cloud, specifying mandatory individual binding arbitration and monthly automatic subscription renewals.",
  executiveSummary: {
    documentOverview:
      "This agreement establishes the legal framework between TermsLens Cloud and consumer subscribers.",
    mainObligations: [
      "Pay recurring monthly subscription fees until you cancel in account settings.",
      "Submit any legal claims exclusively through individual binding arbitration.",
    ],
    companyPermissions: [
      "Automatically charge your payment method on file at the start of each monthly billing cycle.",
    ],
    majorAttentionAreas: [
      "Dispute Resolution: Mandatory private binding arbitration; no jury trial or class action rights. (No opt-out procedure is mentioned in this excerpt).",
      "Billing: Subscriptions renew automatically every month without separate email notices.",
      "Data Retention: No specific retention period is stated in the provided excerpt.",
    ],
    preAgreementChecklist: [
      "Check your monthly renewal date and understand cancellation terms.",
      "Check complete dispute terms to see if an opt-out window is provided, as none is stated in this excerpt.",
      "Review account privacy settings for third-party sharing preferences.",
    ],
  },
};

// ============================================================================
// Group 1: Prompt Loading and Rendering Tests
// ============================================================================
console.log("\n--- Group 1: Prompt Loading and Template Rendering ---");

runTest("Loads P05 prompt templates for V1, V2, and V3", () => {
  const v1 = loadP05PromptTemplate("v1");
  const v2 = loadP05PromptTemplate("v2");
  const v3 = loadP05PromptTemplate("v3");

  assert.ok(v1.includes("{{appName}}") && v1.includes("{{verifiedFindingsJson}}"));
  assert.ok(v2.includes("Strict Verbatim Evidence Grounding") && v2.includes("Transparent Silence Disclosures"));
  assert.ok(v3.includes("FEW-SHOT EXAMPLES") && v3.includes("<VERIFIED_INPUTS>"));
});

runTest("Renders V3 prompt interpolating verified findings and document metadata", () => {
  const rendered = renderP05Prompt(
    "v3",
    SYNTHETIC_P01,
    SYNTHETIC_P02,
    SYNTHETIC_P03,
    SYNTHETIC_P04_SUPPORTED,
    "TermsLens Cloud",
    "terms_of_service",
    "TermsLens Cloud Terms of Service"
  );

  assert.ok(rendered.includes("TermsLens Cloud"));
  assert.ok(rendered.includes("terms_of_service"));
  assert.ok(rendered.includes("clause_arb_001"));
  assert.ok(rendered.includes("clause_bill_002"));
  assert.ok(rendered.includes("priv_synth_4"));
});

// ============================================================================
// Group 2: Schema Validation & Malformed JSON Handling
// ============================================================================
console.log("\n--- Group 2: Schema Validation & Malformed JSON ---");

runTest("Validates compliant P05 executive summary synthesis", () => {
  const validation = validateP05ExecutiveSummarySchema(SYNTHETIC_SYNTHESIS);
  assert.equal(validation.isValid, true);
  assert.ok(validation.synthesis);
  assert.equal(validation.synthesis.executiveSummary.mainObligations.length, 2);
});

runTest("Rejects malformed synthesis missing required fields", () => {
  const broken1 = { documentSummary: "" };
  assert.equal(validateP05ExecutiveSummarySchema(broken1).isValid, false);

  const broken2 = {
    documentSummary: "Valid summary",
    executiveSummary: {
      documentOverview: "Overview",
      mainObligations: [], // empty array
      companyPermissions: ["perm"],
      majorAttentionAreas: ["risk"],
      preAgreementChecklist: ["check"],
    },
  };
  const val2 = validateP05ExecutiveSummarySchema(broken2);
  assert.equal(val2.isValid, false);
  assert.ok(val2.errors.some((e) => e.includes("mainObligations")));
});

runTest("extractJsonFromResponse parses code-fenced and clean JSON", () => {
  const fenced = "```json\n{\"documentSummary\": \"Test summary\"}\n```";
  const parsed = extractJsonFromResponse(fenced) as any;
  assert.equal(parsed.documentSummary, "Test summary");

  assert.throws(() => {
    extractJsonFromResponse("Not a valid json string { broken");
  });
});

// ============================================================================
// Group 3: Clause ID Preservation & Lineage Checks
// ============================================================================
console.log("\n--- Group 3: Clause ID Preservation & Lineage ---");

runTest("Preserves exact upstream clause IDs from P01 into final report", () => {
  const report = assembleAnalysisReport({
    p01: SYNTHETIC_P01,
    p02: SYNTHETIC_P02,
    p03: SYNTHETIC_P03,
    p04: SYNTHETIC_P04_SUPPORTED,
    synthesis: SYNTHETIC_SYNTHESIS,
    appName: "TermsLens Cloud",
    documentType: "terms_of_service",
  });

  assert.equal(report.clauses.length, 2);
  assert.equal(report.clauses[0].id, "clause_arb_001");
  assert.equal(report.clauses[1].id, "clause_bill_002");
  assert.equal(report.totalClausesAnalyzed, 2);
});

runTest("validateUpstreamPipelineOutputs detects missing or mismatched clause IDs", () => {
  const mismatchedP02: P02_Output = {
    clauseExplanations: [
      {
        tempClauseId: "different_id_999", // Does NOT match clause_arb_001
        title: "Title",
        shortExplanation: "Explanation",
        plainLanguageExplanation: "Plain",
        whyThisClauseMatters: "Why",
        potentialUserImplications: ["Imp"],
      },
    ],
  };

  const validation = validateUpstreamPipelineOutputs(
    SYNTHETIC_P01,
    mismatchedP02,
    SYNTHETIC_P03,
    SYNTHETIC_P04_SUPPORTED
  );

  assert.equal(validation.isValid, false);
  assert.ok(validation.errors.some((e) => e.includes("missing from P02 explanations")));
});

// ============================================================================
// Group 4: Evidence Grounding & Verbatim Fidelity
// ============================================================================
console.log("\n--- Group 4: Evidence Grounding & Verbatim Fidelity ---");

runTest("Evidence references contain exact quotes and formatted section references", () => {
  const report = assembleAnalysisReport({
    p01: SYNTHETIC_P01,
    p02: SYNTHETIC_P02,
    p03: SYNTHETIC_P03,
    p04: SYNTHETIC_P04_SUPPORTED,
    synthesis: SYNTHETIC_SYNTHESIS,
    appName: "TermsLens Cloud",
    documentType: "terms_of_service",
  });

  const c1 = report.clauses[0];
  assert.ok(c1.evidence.exactQuote.includes("mandatory binding individual arbitration"));
  assert.equal(c1.evidence.sourcePage, 16);
  assert.equal(c1.evidence.sectionNumber, "24.1");
  assert.ok(c1.evidence.sourceReferenceText.includes("Section 24.1 Dispute Resolution (Page 16)"));
});

runTest("formatSourceReferenceText handles missing headings and pages gracefully", () => {
  assert.equal(formatSourceReferenceText("Section 1", "1", 5), "Section 1 (Page 5)");
  assert.equal(formatSourceReferenceText(undefined, "2.1", 3), "Section 2.1 (Page 3)");
  assert.equal(formatSourceReferenceText(undefined, undefined, undefined), "Reference unavailable");
});

// ============================================================================
// Group 5: Rejection Handling & Verification Integrity
// ============================================================================
console.log("\n--- Group 5: Rejection Handling & Verification Integrity ---");

runTest("Rejected P04 findings are NEVER presented as supported or verified", () => {
  const rejectedP04: P04_Output = {
    verifiedClauses: [
      {
        tempClauseId: "clause_arb_001",
        evidence: {
          exactQuote: "All disputes must be decided by mandatory binding individual arbitration.",
        },
        verification: {
          status: "rejected", // REJECTED
          reviewerType: "automated_pipeline",
          notes: "Claim asserted an unevidenced 30-day opt-out window absent from source text.",
          verifiedAt: "2026-11-21T00:00:00Z",
          evidenceMatchesOriginal: false,
        },
      },
      {
        tempClauseId: "clause_bill_002",
        evidence: {
          exactQuote: "Subscriptions renew automatically on a monthly basis.",
        },
        verification: {
          status: "supported",
          reviewerType: "automated_pipeline",
          notes: "Audited against Section 8.2 verbatim text.",
          verifiedAt: "2026-11-21T00:00:00Z",
          evidenceMatchesOriginal: true,
        },
      },
    ],
  };

  const report = assembleAnalysisReport({
    p01: SYNTHETIC_P01,
    p02: SYNTHETIC_P02,
    p03: SYNTHETIC_P03,
    p04: rejectedP04,
    synthesis: SYNTHETIC_SYNTHESIS,
    appName: "TermsLens Cloud",
    documentType: "terms_of_service",
  });

  const rejectedClause = report.clauses.find((c) => c.id === "clause_arb_001");
  assert.ok(rejectedClause, "Rejected clause must exist in report");
  assert.equal(rejectedClause.verification.status, "rejected");
  assert.equal(rejectedClause.verification.evidenceMatchesOriginal, false);

  // Verification Summary counts
  assert.equal(report.verificationSummary.supportedCount, 1);
  assert.equal(report.verificationSummary.rejectedCount, 1);
  assert.equal(report.verificationSummary.totalVerified, 2);
});

// ============================================================================
// Group 6: Privacy Topics & Silence Disclosures
// ============================================================================
console.log("\n--- Group 6: Privacy Findings & Silence Disclosures ---");

runTest("Report preserves all 6 mandatory privacy findings with required retention silence", () => {
  const report = assembleAnalysisReport({
    p01: SYNTHETIC_P01,
    p02: SYNTHETIC_P02,
    p03: SYNTHETIC_P03,
    p04: SYNTHETIC_P04_SUPPORTED,
    synthesis: SYNTHETIC_SYNTHESIS,
    appName: "TermsLens Cloud",
    documentType: "terms_of_service",
  });

  assert.equal(report.privacyFindings.length, 6);

  const retention = report.privacyFindings.find((pf) => pf.topic === "data_retention");
  assert.ok(retention, "Retention topic must be present");
  assert.equal(retention.distinction, "not_specified");
  assert.ok(retention.summary.includes("No specific retention period is stated in the provided excerpt."));
  assert.ok(retention.silenceNotice?.includes("Silence in this policy does not imply data is deleted immediately"));
});

// ============================================================================
// Group 7: End-to-End Contract Validation
// ============================================================================
console.log("\n--- Group 7: End-to-End Contract Validation ---");

runTest("Assembled report passes authoritative validateAnalysisReport contract check", () => {
  const report = assembleAnalysisReport({
    p01: SYNTHETIC_P01,
    p02: SYNTHETIC_P02,
    p03: SYNTHETIC_P03,
    p04: SYNTHETIC_P04_SUPPORTED,
    synthesis: SYNTHETIC_SYNTHESIS,
    appName: "TermsLens Cloud",
    documentType: "terms_of_service",
  });

  const validation = validateAnalysisReport(report);
  assert.equal(validation.isValid, true, `Validation errors: ${validation.errors.join("; ")}`);
  assert.equal(report.isDemonstrationFixture, false);
});

// ============================================================================
// Group 8: Dynamic Policy Analysis (Frontend Integration)
// ============================================================================
console.log("\n--- Group 8: Dynamic Policy Analysis Integration ---");

runTest("createDynamicReportFromText processes real custom policy text into reportStore", () => {
  const customPolicyText = `
[Page 1]
Section 1. Mandatory Arbitration
You agree that any dispute between you and Acme Cloud will be resolved by binding individual arbitration. You waive jury trial rights.

[Page 2]
Section 2. Recurring Charges
Your Acme Cloud subscription renews monthly until you cancel in settings. Payments are strictly non-refundable.
`;

  const reportId = `rep_test_custom_${Date.now()}`;
  const report = createDynamicReportFromText(reportId, customPolicyText, "Acme Cloud", "terms_of_service");

  assert.equal(report.id, reportId);
  assert.equal(report.appName, "Acme Cloud");
  assert.ok(report.clauses.length >= 2, `Expected >= 2 clauses, got ${report.clauses.length}`);
  assert.ok(report.clauses.some((c) => c.category === "dispute_resolution"));
  assert.ok(report.clauses.some((c) => c.category === "subscription_billing"));

  // Check that it was persisted in reportStore
  const retrieved = reportStore.get(reportId);
  assert.ok(retrieved, "Report must be retrievable from reportStore");
  assert.equal(retrieved.id, reportId);

  // Validate contract
  const validation = validateAnalysisReport(retrieved);
  assert.equal(validation.isValid, true, `Report failed validation: ${validation.errors.join("; ")}`);
});

// ============================================================================
// Group 9: Upstream Bridge for Missing Stages P03 & P04
// ============================================================================
console.log("\n--- Group 9: Upstream Bridge for Missing Stages ---");

runTest("deriveContractGroundingFromP01P02 bridges P01/P02 to P03/P04 with verbatim grounding", () => {
  const rawText = `
Section 24.1 Dispute Resolution
All disputes must be decided by mandatory binding individual arbitration. You waive any right to a jury trial or class action.

Section 8.2 Subscriptions and Billing
Subscriptions renew automatically on a monthly basis. You authorize recurring charges until you cancel.
`;

  const bridge = deriveContractGroundingFromP01P02(SYNTHETIC_P01, SYNTHETIC_P02, rawText);

  assert.ok(bridge.p03, "Bridge must output P03 classifications");
  assert.ok(bridge.p04, "Bridge must output P04 verified clauses");
  assert.equal(bridge.p03.clauseClassifications.length, 2);
  assert.equal(bridge.p04.verifiedClauses.length, 2);

  // Arbitration should be categorized as dispute_resolution / high
  const arbCls = bridge.p03.clauseClassifications.find((c) => c.tempClauseId === "clause_arb_001");
  assert.equal(arbCls?.category, "dispute_resolution");
  assert.equal(arbCls?.attentionLevel, "high");

  // Verification status should be supported with verbatim match
  const arbVer = bridge.p04.verifiedClauses.find((v) => v.tempClauseId === "clause_arb_001");
  assert.equal(arbVer?.verification.status, "supported");
  assert.equal(arbVer?.verification.evidenceMatchesOriginal, true);
});

// ============================================================================
// Group 10: Complete P01-P05 Pipeline Orchestration & Service Integration
// ============================================================================
console.log("\n--- Group 10: Complete P01-P05 Orchestration Integration Tests ---");

const SAMPLE_RAW_TEXT = `
Section 24.1 Dispute Resolution
All disputes must be decided by mandatory binding individual arbitration. You waive any right to a jury trial or class action.

Section 8.2 Subscriptions and Billing
Subscriptions renew automatically on a monthly basis. You authorize recurring charges until you cancel.
`;

const MOCK_P03_PIPELINE_OUTPUT = {
  clauseClassifications: [
    {
      tempClauseId: "clause_arb_001",
      category: "dispute_resolution",
      attentionLevel: "high",
    },
    {
      tempClauseId: "clause_bill_002",
      category: "subscription_billing",
      attentionLevel: "moderate",
    },
  ],
  privacyFindings: [
    {
      id: "priv_p03_1",
      topic: "personal_info_collected",
      topicTitle: "Personal Information Collected",
      distinction: "not_specified",
      summary: "Real P03 Output: No personal info categories specified in excerpt.",
      silenceNotice: "The provided excerpt is silent regarding personal data categories collected.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_p03_2",
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: "not_specified",
      summary: "Real P03 Output: No data sharing disclosures in excerpt.",
      silenceNotice: "The provided excerpt is silent regarding third-party data broker sharing.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_p03_3",
      topic: "advertising_tracking",
      topicTitle: "Advertising and Behavioral Tracking",
      distinction: "not_specified",
      summary: "Real P03 Output: No advertising tracking disclosures in excerpt.",
      silenceNotice: "The provided excerpt is silent regarding behavioral cross-site advertising tracking.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_p03_4",
      topic: "data_retention",
      topicTitle: "Data Retention Period",
      distinction: "not_specified",
      summary: "Real P03 Output: No specific retention period is stated in the provided excerpt.",
      silenceNotice:
        "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      attentionLevel: "high",
    },
    {
      id: "priv_p03_5",
      topic: "account_deletion",
      topicTitle: "Account Deletion Rights",
      distinction: "not_specified",
      summary: "Real P03 Output: No account deletion timeline specified in excerpt.",
      silenceNotice: "The provided excerpt does not specify user account deletion procedures.",
      attentionLevel: "informational",
    },
    {
      id: "priv_p03_6",
      topic: "ai_model_training",
      topicTitle: "AI & Model Training Usage",
      distinction: "not_specified",
      summary: "Real P03 Output: The provided excerpt is silent regarding AI model training.",
      silenceNotice:
        "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence models.",
      attentionLevel: "moderate",
    },
  ],
};

function buildMockGeminiApiResponse(content: string, status = 200) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: content }],
          },
          finishReason: "STOP",
        },
      ],
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}

runTest("Normalization functions map non-standard attention levels and categories", () => {
  assert.equal(mapAttentionLevel("high"), "high");
  assert.equal(mapAttentionLevel("critical"), "high");
  assert.equal(mapAttentionLevel("moderate"), "moderate");
  assert.equal(mapAttentionLevel("medium"), "moderate");
  assert.equal(mapAttentionLevel("caution"), "moderate");
  assert.equal(mapAttentionLevel("informational"), "informational");
  assert.equal(mapAttentionLevel("low"), "informational");
  assert.equal(mapAttentionLevel("invalid_val"), "informational");

  assert.equal(mapClauseCategory("dispute_resolution"), "dispute_resolution");
  assert.equal(mapClauseCategory("subscription_billing"), "subscription_billing");
  assert.equal(mapClauseCategory("unknown_arbitrary_category"), "other");

  assert.equal(EXPECTED_PRIVACY_TOPICS.length, 6);
});

runTest("runFullPolicyAnalysisPipeline executes P01 -> P02 -> P03 -> P04 -> P05 invoking real P03/P04", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_api_key";

  const capturedPrompts: string[] = [];
  const transitions: Array<{ stage: string; progress: number }> = [];

  try {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";
      capturedPrompts.push(body);

      // 1. P01 Clause Extraction
      if (body.includes("Clause Extraction Engine")) {
        const p01Mock = {
          extractedClauses: [
            {
              tempClauseId: "clause_arb_001",
              segmentIndex: 0,
              sectionHeading: "Section 24.1 Dispute Resolution",
              sectionNumber: "24.1",
              sourcePage: 16,
              originalClauseText:
                "All disputes must be decided by mandatory binding individual arbitration. You waive any right to a jury trial or class action.",
              operativeSummary: "Mandatory individual binding arbitration and class action waiver.",
            },
            {
              tempClauseId: "clause_bill_002",
              segmentIndex: 1,
              sectionHeading: "Section 8.2 Subscriptions and Billing",
              sectionNumber: "8.2",
              sourcePage: 7,
              originalClauseText:
                "Subscriptions renew automatically on a monthly basis. You authorize recurring charges until you cancel.",
              operativeSummary: "Automatic monthly renewal and recurring payment authorization.",
            },
          ],
          totalClausesAnalyzed: 2,
        };
        return buildMockGeminiApiResponse(JSON.stringify(p01Mock));
      }

      // 2. P02 Plain-Language Explanation
      if (body.includes("Plain-Language Translation Engine")) {
        const p02Mock = {
          clauseExplanations: [
            {
              tempClauseId: "clause_arb_001",
              title: "Mandatory Binding Arbitration",
              shortExplanation: "You must resolve legal disputes through private individual arbitration rather than court.",
              plainLanguageExplanation: "Disputes go to an arbitrator; no court trial or class actions permitted.",
              whyThisClauseMatters: "Eliminates access to court jury trials.",
              potentialUserImplications: ["No court trials", "Cannot join class actions"],
              actionableAdvice: "Check for any stated opt-out procedure.",
            },
            {
              tempClauseId: "clause_bill_002",
              title: "Automatic Subscription Renewal",
              shortExplanation: "Your subscription bills continuously every month until you cancel.",
              plainLanguageExplanation: "Recurring fees are billed monthly automatically.",
              whyThisClauseMatters: "Charges recur without requiring manual approval each month.",
              potentialUserImplications: ["Automatic ongoing charges"],
              actionableAdvice: "Set a reminder prior to your renewal date.",
            },
          ],
        };
        return buildMockGeminiApiResponse(JSON.stringify(p02Mock));
      }

      // 3. P03 Risk and Privacy Analysis
      if (body.includes("consumer risk and privacy analyst")) {
        const p03Mock = {
          clauseClassifications: [
            {
              tempClauseId: "clause_arb_001",
              category: "dispute_resolution",
              attentionLevel: "high",
            },
            {
              tempClauseId: "clause_bill_002",
              category: "subscription_billing",
              attentionLevel: "moderate",
            },
          ],
          privacyFindings: [
            {
              id: "priv_p03_1",
              topic: "personal_info_collected",
              topicTitle: "Personal Information Collected",
              distinction: "not_specified",
              summary: "Real P03 Output: No personal info categories specified in excerpt.",
              silenceNotice: "The provided excerpt is silent regarding personal data categories collected.",
              attentionLevel: "moderate",
            },
            {
              id: "priv_p03_2",
              topic: "third_party_sharing",
              topicTitle: "Third-Party Data Sharing",
              distinction: "not_specified",
              summary: "Real P03 Output: No data sharing disclosures in excerpt.",
              silenceNotice: "The provided excerpt is silent regarding third-party data broker sharing.",
              attentionLevel: "moderate",
            },
            {
              id: "priv_p03_3",
              topic: "advertising_tracking",
              topicTitle: "Advertising and Behavioral Tracking",
              distinction: "not_specified",
              summary: "Real P03 Output: No advertising tracking disclosures in excerpt.",
              silenceNotice: "The provided excerpt is silent regarding behavioral cross-site advertising tracking.",
              attentionLevel: "moderate",
            },
            {
              id: "priv_p03_4",
              topic: "data_retention",
              topicTitle: "Data Retention Period",
              distinction: "not_specified",
              summary: "Real P03 Output: No specific retention period is stated in the provided excerpt.",
              silenceNotice: "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
              attentionLevel: "high",
            },
            {
              id: "priv_p03_5",
              topic: "account_deletion",
              topicTitle: "Account Deletion Rights",
              distinction: "not_specified",
              summary: "Real P03 Output: No account deletion timeline specified in excerpt.",
              silenceNotice: "The provided excerpt does not specify user account deletion procedures.",
              attentionLevel: "informational",
            },
            {
              id: "priv_p03_6",
              topic: "ai_model_training",
              topicTitle: "AI & Model Training Usage",
              distinction: "not_specified",
              summary: "Real P03 Output: The provided excerpt is silent regarding AI model training.",
              silenceNotice: "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence models.",
              attentionLevel: "moderate",
            },
          ],
        };
        return buildMockGeminiApiResponse(JSON.stringify(p03Mock));
      }

      // 4. P04 Evidence Verification
      if (body.includes("Adversarial Evidence Verification")) {
        const p04Mock = {
          verifiedClauses: [
            {
              tempClauseId: "clause_arb_001",
              evidence: {
                exactQuote: "All disputes must be decided by mandatory binding individual arbitration.",
                highlightExcerpt: "mandatory binding individual arbitration",
              },
              verification: {
                status: "supported",
                reviewerType: "automated_pipeline",
                notes: "P04 Real Verification: Audited against Section 24.1 verbatim contract text.",
                verifiedAt: new Date().toISOString(),
                evidenceMatchesOriginal: true,
              },
            },
            {
              tempClauseId: "clause_bill_002",
              evidence: {
                exactQuote: "Subscriptions renew automatically on a monthly basis.",
                highlightExcerpt: "renew automatically on a monthly basis",
              },
              verification: {
                status: "supported",
                reviewerType: "automated_pipeline",
                notes: "P04 Real Verification: Audited against Section 8.2 verbatim contract text.",
                verifiedAt: new Date().toISOString(),
                evidenceMatchesOriginal: true,
              },
            },
          ],
        };
        return buildMockGeminiApiResponse(JSON.stringify(p04Mock));
      }

      // 5. P05 Final Report Synthesis
      if (body.includes("Final Report Synthesis Engine") || body.includes("P05-V3")) {
        // Verify that P05 received real P03 classifications and P04 verification notes in its prompt!
        assert.ok(body.includes("dispute_resolution"), "P05 prompt must receive P03 dispute_resolution category");
        assert.ok(body.includes("P04 Real Verification"), "P05 prompt must receive P04 verification notes");
        assert.ok(body.includes("Real P03 Output"), "P05 prompt must receive P03 privacy findings");

        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_SYNTHESIS));
      }

      throw new Error(`Unexpected prompt dispatched: ${body.slice(0, 100)}`);
    };

    const result = await runFullPolicyAnalysisPipeline(
      {
        rawText: SAMPLE_RAW_TEXT,
        appName: "Acme Cloud",
        documentType: "terms_of_service",
        documentTitle: "Acme Cloud Terms of Service",
      },
      {
        onStageTransition: (stage, progress) => {
          transitions.push({ stage, progress });
        },
      }
    );

    assert.equal(result.success, true, `Pipeline returned error: ${result.error}`);
    assert.ok(result.data, "Pipeline must return report data");

    // Verify all 5 stages completed in order
    assert.deepEqual(result.stagesCompleted, [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "P03_RISK_AND_PRIVACY_ANALYSIS",
      "P04_EVIDENCE_VERIFICATION",
      "P05_FINAL_REPORT_GENERATION",
    ]);

    // Verify stage transition callbacks
    assert.ok(transitions.some((t) => t.stage === "P01_CLAUSE_EXTRACTION"));
    assert.ok(transitions.some((t) => t.stage === "P02_EXPLANATION"));
    assert.ok(transitions.some((t) => t.stage === "P03_RISK_ANALYSIS"));
    assert.ok(transitions.some((t) => t.stage === "P04_VERIFICATION"));
    assert.ok(transitions.some((t) => t.stage === "P05_REPORT_GENERATION"));
    assert.ok(transitions.some((t) => t.stage === "COMPLETED" && t.progress === 100));

    // Verify that report received real P03 outputs
    const arbClause = result.data.clauses.find((c) => c.id === "clause_arb_001");
    assert.ok(arbClause, "clause_arb_001 must exist");
    assert.equal(arbClause.category, "dispute_resolution");
    assert.equal(arbClause.attentionLevel, "high");

    // Verify that report received real P04 outputs
    assert.equal(arbClause.verification.status, "supported");
    assert.ok(arbClause.verification.notes.includes("P04 Real Verification"));

    // Verify that report received real P03 privacy findings
    assert.ok(result.data.privacyFindings.some((pf) => pf.summary.includes("Real P03 Output")));

    // Verify report contract validation
    const validation = validateAnalysisReport(result.data);
    assert.equal(validation.isValid, true, `Validation errors: ${validation.errors.join("; ")}`);

    // Verify saved to reportStore
    const inStore = reportStore.get(result.data.id);
    assert.ok(inStore, "Report must be persisted in reportStore");
    assert.equal(inStore.id, result.data.id);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

runTest("runFullPolicyAnalysisPipeline halts with explicit error when P03 fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_api_key";

  try {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";

      if (body.includes("Clause Extraction Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
      }
      if (body.includes("Plain-Language Translation Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P02));
      }
      if (body.includes("consumer risk and privacy analyst")) {
        // P03 fails with HTTP 429 rate limit
        return buildMockGeminiApiResponse("Rate limit exceeded", 429);
      }

      throw new Error(`Should not reach stages after failed P03: ${body.slice(0, 80)}`);
    };

    const result = await runFullPolicyAnalysisPipeline({
      rawText: SAMPLE_RAW_TEXT,
      appName: "Acme Cloud",
      documentType: "terms_of_service",
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Pipeline failed at stage P03"));
    assert.deepEqual(result.stagesCompleted, [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

runTest("runFullPolicyAnalysisPipeline halts with explicit error when P04 fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_api_key";

  try {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";

      if (body.includes("Clause Extraction Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
      }
      if (body.includes("Plain-Language Translation Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P02));
      }
      if (body.includes("consumer risk and privacy analyst")) {
        return buildMockGeminiApiResponse(JSON.stringify(MOCK_P03_PIPELINE_OUTPUT));
      }
      if (body.includes("Adversarial Evidence Verification")) {
        // P04 fails with 500 server error
        return buildMockGeminiApiResponse("Internal server error during verification", 500);
      }

      throw new Error(`Should not reach stages after failed P04: ${body.slice(0, 80)}`);
    };

    const result = await runFullPolicyAnalysisPipeline({
      rawText: SAMPLE_RAW_TEXT,
      appName: "Acme Cloud",
      documentType: "terms_of_service",
    });

    assert.equal(result.success, false);
    assert.ok(result.error?.includes("Pipeline failed at stage P04"));
    assert.deepEqual(result.stagesCompleted, [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "P03_RISK_AND_PRIVACY_ANALYSIS",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

runTest("runFullPolicyAnalysisPipeline propagates P04 rejected status and preserves verbatim quotes", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_api_key";

  try {
    globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : "";

      if (body.includes("Clause Extraction Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
      }
      if (body.includes("Plain-Language Translation Engine")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P02));
      }
      if (body.includes("consumer risk and privacy analyst")) {
        return buildMockGeminiApiResponse(JSON.stringify(MOCK_P03_PIPELINE_OUTPUT));
      }
      if (body.includes("Adversarial Evidence Verification")) {
        // P04 rejects clause_arb_001 due to hallucinated claims
        const p04WithRejection = {
          verifiedClauses: [
            {
              tempClauseId: "clause_arb_001",
              evidence: {
                exactQuote: "All disputes must be decided by mandatory binding individual arbitration.",
                highlightExcerpt: "mandatory binding individual arbitration",
              },
              verification: {
                status: "rejected",
                reviewerType: "automated_pipeline",
                notes: "Rejected: explanation claims 30-day opt-out window absent from source text.",
                verifiedAt: new Date().toISOString(),
                evidenceMatchesOriginal: false,
              },
            },
            {
              tempClauseId: "clause_bill_002",
              evidence: {
                exactQuote: "Subscriptions renew automatically on a monthly basis.",
                highlightExcerpt: "renew automatically on a monthly basis",
              },
              verification: {
                status: "supported",
                reviewerType: "automated_pipeline",
                notes: "Supported by verbatim text.",
                verifiedAt: new Date().toISOString(),
                evidenceMatchesOriginal: true,
              },
            },
          ],
        };
        return buildMockGeminiApiResponse(JSON.stringify(p04WithRejection));
      }
      if (body.includes("Final Report Synthesis Engine") || body.includes("P05-V3")) {
        return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_SYNTHESIS));
      }

      throw new Error(`Unexpected request: ${body.slice(0, 100)}`);
    };

    const result = await runFullPolicyAnalysisPipeline({
      rawText: SAMPLE_RAW_TEXT,
      appName: "Acme Cloud",
      documentType: "terms_of_service",
    });

    assert.equal(result.success, true);
    assert.ok(result.data);

    const rejectedClause = result.data.clauses.find((c) => c.id === "clause_arb_001");
    assert.ok(rejectedClause);
    assert.equal(rejectedClause.verification.status, "rejected");
    assert.equal(rejectedClause.verification.evidenceMatchesOriginal, false);
    assert.ok(rejectedClause.verification.notes.includes("Rejected:"));

    // Verbatim text must be strictly preserved
    assert.equal(
      rejectedClause.originalClauseText,
      SYNTHETIC_P01.extractedClauses[0].originalClauseText
    );

    // Summary counts must reflect rejected clause
    assert.equal(result.data.verificationSummary.rejectedCount, 1);
    assert.equal(result.data.verificationSummary.supportedCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

// ============================================================================
// Execution Runner
// ============================================================================
async function runSuite() {
  for (const { name, fn } of testQueue) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [FAIL] ${name}: ${msg}`);
      failed++;
    }
  }

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passed}/${total} Passed (${failed} Failed)`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
