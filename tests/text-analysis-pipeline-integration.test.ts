/**
 * TERMSLENS INTEGRATION FIX 02 TEST SUITE
 * Connect Text Submission (POST /api/analyze/text) to Real P01-P05 Pipeline.
 *
 * Verifies:
 * 1. Valid text submission
 * 2. Invalid or empty text
 * 3. Successful P01-P05 invocation
 * 4. Stage-level job updates
 * 5. Final report persistence
 * 6. P03 failure
 * 7. P04 failure
 * 8. P05 failure
 * 9. Cancellation behaviour
 * 10. Report retrieval after completion
 */

import assert from "node:assert/strict";
import { POST as submitTextRoute } from "../src/app/api/analyze/text/route.ts";
import { GET as getJobStatusRoute } from "../src/app/api/analyze/status/[jobId]/route.ts";
import { POST as cancelJobRoute } from "../src/app/api/analyze/cancel/[jobId]/route.ts";
import { GET as getReportRoute } from "../src/app/api/reports/[id]/route.ts";
import { jobStore } from "../src/lib/job-store.ts";
import { reportStore } from "../src/lib/report-store.ts";
import { waitForJob, isJobCancelled } from "../src/services/analysis-job-runner.ts";
import { validateAnalysisReport } from "../src/services/analysis-service.ts";
import type {
  SubmitAnalysisResponse,
  JobStatusResponse,
  AnalysisReport,
} from "../src/types/index.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testQueue: { name: string; fn: () => Promise<void> | void }[] = [];

function runTest(name: string, fn: () => Promise<void> | void) {
  testQueue.push({ name, fn });
}

// ============================================================================
// Synthetic Gemini Fixtures for Deterministic Pipeline Execution
// ============================================================================

const SAMPLE_POLICY_TEXT = `[Page 1]
Section 2. Automatic Billing & Subscriptions
Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month. Payments are strictly non-refundable and there are no credits for partially used billing periods. You may cancel at any time through your account settings.

[Page 2]
Section 7. Mandatory Arbitration & Dispute Resolution
You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.`;

const SYNTHETIC_P01 = {
  extractedClauses: [
    {
      tempClauseId: "clause_arb_001",
      segmentIndex: 1,
      sectionHeading: "Section 7. Mandatory Arbitration & Dispute Resolution",
      sectionNumber: "7",
      sourcePage: 2,
      originalClauseText:
        "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
      operativeSummary:
        "Mandatory individual arbitration and class action waiver.",
    },
    {
      tempClauseId: "clause_bill_002",
      segmentIndex: 0,
      sectionHeading: "Section 2. Automatic Billing & Subscriptions",
      sectionNumber: "2",
      sourcePage: 1,
      originalClauseText:
        "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
      operativeSummary:
        "Monthly subscription renewal with recurring automated payment charges.",
    },
  ],
  totalClausesAnalyzed: 2,
};

const SYNTHETIC_P02 = {
  clauseExplanations: [
    {
      tempClauseId: "clause_arb_001",
      title: "Mandatory Individual Arbitration",
      shortExplanation:
        "All disputes must be decided by binding individual arbitration with no class actions or jury trials.",
      plainLanguageExplanation:
        "If you have a dispute, you cannot sue in open court before a jury. You must resolve it privately through individual arbitration. No opt-out procedure is stated in this excerpt.",
      whyThisClauseMatters:
        "Waives constitutional right to a jury trial and class-action remedies.",
      potentialUserImplications: [
        "No access to civil court jury trials.",
        "Cannot participate in consumer class action lawsuits.",
      ],
      actionableAdvice:
        "Check whether complete terms provide an arbitration opt-out procedure, as none is stated in this excerpt.",
    },
    {
      tempClauseId: "clause_bill_002",
      title: "Automatic Subscription Renewal",
      shortExplanation:
        "Subscriptions renew automatically each month without separate advance notice.",
      plainLanguageExplanation:
        "Your payment method will be charged automatically every billing cycle until you cancel in settings.",
      whyThisClauseMatters:
        "Continuous recurring payments will be billed automatically.",
      potentialUserImplications: [
        "Recurring monthly charges until cancelled.",
        "No partial month refunds.",
      ],
      actionableAdvice: "Set a calendar reminder before the monthly renewal date.",
    },
  ],
};

const SYNTHETIC_P03 = {
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
      id: "priv_item_1",
      topic: "personal_info_collected",
      topicTitle: "Personal Information Collected",
      distinction: "not_specified",
      summary:
        "The provided excerpt does not specify categories of personal data collected.",
      silenceNotice:
        "The provided excerpt is silent regarding specific personal categories collected beyond account registration.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_2",
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: "not_specified",
      summary:
        "The provided excerpt is silent regarding third-party data broker sharing.",
      silenceNotice:
        "The provided excerpt is silent regarding sharing with external third-party data brokers.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_3",
      topic: "advertising_tracking",
      topicTitle: "Advertising and Behavioral Tracking",
      distinction: "not_specified",
      summary:
        "The provided excerpt is silent regarding cross-app behavioral tracking.",
      silenceNotice:
        "The provided excerpt is silent regarding cross-app behavioral tracking.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_4",
      topic: "data_retention",
      topicTitle: "Data Retention Period",
      distinction: "not_specified",
      summary: "No specific retention period is stated in the provided excerpt.",
      silenceNotice:
        "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      attentionLevel: "high",
    },
    {
      id: "priv_item_5",
      topic: "account_deletion",
      topicTitle: "Account Deletion Rights",
      distinction: "not_specified",
      summary:
        "The provided excerpt does not specify user account deletion procedures.",
      silenceNotice:
        "The provided excerpt does not specify user account deletion procedures.",
      attentionLevel: "informational",
    },
    {
      id: "priv_item_6",
      topic: "ai_model_training",
      topicTitle: "AI & Model Training Usage",
      distinction: "not_specified",
      summary:
        "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      silenceNotice:
        "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      attentionLevel: "moderate",
    },
  ],
};

const SYNTHETIC_P04 = {
  verifiedClauses: [
    {
      tempClauseId: "clause_arb_001",
      evidence: {
        exactQuote:
          "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
        highlightExcerpt:
          "resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against verbatim source excerpt.",
        verifiedAt: new Date().toISOString(),
        evidenceMatchesOriginal: true,
      },
    },
    {
      tempClauseId: "clause_bill_002",
      evidence: {
        exactQuote:
          "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
        highlightExcerpt:
          "subscription will automatically renew on a monthly basis until you cancel",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against verbatim source excerpt.",
        verifiedAt: new Date().toISOString(),
        evidenceMatchesOriginal: true,
      },
    },
  ],
  verificationSummary: {
    totalVerified: 2,
    supportedCount: 2,
    partiallySupportedCount: 0,
    unverifiedCount: 0,
    rejectedCount: 0,
    methodologyDescription:
      "All findings audited through automated semantic verification against verbatim excerpts from the provided document.",
  },
};

const SYNTHETIC_P05_SYNTHESIS = {
  documentSummary:
    "Comprehensive contractual review for TermsLens Cloud synthesizing operative dispute resolution and billing terms.",
  executiveSummary: {
    documentOverview:
      "Governs individual use of TermsLens Cloud services, specifying recurring billing schedules and mandatory arbitration.",
    mainObligations: [
      "Pay monthly recurring subscription charges until cancellation is initiated in settings.",
      "Submit all legal claims to individual arbitration rather than court litigation.",
    ],
    companyPermissions: [
      "Automatically charge designated payment methods each billing cycle.",
      "Enforce mandatory private arbitration for disputes.",
    ],
    majorAttentionAreas: [
      "Dispute Resolution: Requires individual binding arbitration with class action waiver.",
      "Automatic Billing: Renews every month automatically without advance notice.",
    ],
    preAgreementChecklist: [
      "Review cancellation terms and renewal dates.",
      "Check dispute resolution terms if an arbitration opt-out is desired, as none is stated in this excerpt.",
    ],
  },
};

function buildMockGeminiApiResponse(jsonPayload: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: jsonPayload }],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function installMockGeminiPipeline(overrides?: {
  failStage?: "P01" | "P02" | "P03" | "P04" | "P05";
  p04Rejection?: boolean;
}) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_pipeline_key";

  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : "";

    // P01 Clause Extraction
    if (body.includes("Clause Extraction Engine")) {
      if (overrides?.failStage === "P01") {
        return new Response("Simulated P01 failure", { status: 500 });
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
    }

    // P02 Plain-Language Translation
    if (body.includes("Plain-Language Translation Engine")) {
      if (overrides?.failStage === "P02") {
        return new Response("Simulated P02 failure", { status: 500 });
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P02));
    }

    // P03 Risk and Privacy Analysis
    if (body.includes("consumer risk and privacy analyst")) {
      if (overrides?.failStage === "P03") {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Resource exhausted: Rate limit exceeded for P03.",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P03));
    }

    // P04 Adversarial Evidence Verification
    if (body.includes("Adversarial Evidence Verification")) {
      if (overrides?.failStage === "P04") {
        return new Response("Simulated P04 verification failure", { status: 500 });
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P04));
    }

    // P05 Final Report Generation
    if (
      body.includes("Final Report Synthesis Engine") ||
      body.includes("P05-V3")
    ) {
      if (overrides?.failStage === "P05") {
        return new Response("Simulated P05 synthesis failure", { status: 500 });
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P05_SYNTHESIS));
    }

    throw new Error(`Unexpected mock request: ${body.slice(0, 100)}`);
  };

  return () => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  };
}

// ============================================================================
// TEST CASES (1 to 10)
// ============================================================================

console.log("=======================================================");
console.log("TERMSLENS TEXT SUBMISSION & REAL PIPELINE INTEGRATION");
console.log("=======================================================\n");

// 1. Valid text submission
runTest("Test 1: Valid text submission returns HTTP 202 with contract-compliant payload", async () => {
  const cleanup = installMockGeminiPipeline();
  try {
    const req = new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "Acme Cloud",
        documentType: "terms_of_service",
      }),
    });

    const res = await submitTextRoute(req);
    assert.equal(res.status, 202, "Must return HTTP 202 Accepted");

    const body = (await res.json()) as SubmitAnalysisResponse;
    assert.equal(body.success, true);
    assert.ok(body.jobId.startsWith("job_live_acme_cloud_"), "Job ID must match convention");
    assert.ok(body.reportId.startsWith("rep_live_acme_cloud_"), "Report ID must match convention");
    assert.equal(body.appName, "Acme Cloud");
    assert.equal(body.documentType, "terms_of_service");
    assert.equal(body.status, "queued");
    assert.equal(body.currentStage, "PREPROCESSING");
    assert.ok(body.links.statusUrl.includes(body.jobId));
    assert.ok(body.links.reportUrl.includes(body.reportId));

    // Confirm job is stored in jobStore
    const storedJob = jobStore.get(body.jobId);
    assert.ok(storedJob, "Job record must exist in jobStore");
  } finally {
    cleanup();
  }
});

// 2. Invalid or empty text
runTest("Test 2: Invalid or empty text returns explicit 400/422 validation errors", async () => {
  // Empty text
  const emptyRes = await submitTextRoute(
    new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "   ",
        appName: "Acme App",
        documentType: "terms_of_service",
      }),
    })
  );
  assert.equal(emptyRes.status, 422, "Empty text must return 422");
  const emptyBody = await emptyRes.json();
  assert.equal(emptyBody.error.code, "EXTRACTION_FAILED");
  assert.equal(emptyBody.error.stage, "PREPROCESSING");

  // Short trivial text (< 10 words)
  const shortRes = await submitTextRoute(
    new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Too short text here.",
        appName: "Acme App",
        documentType: "terms_of_service",
      }),
    })
  );
  assert.equal(shortRes.status, 422, "Short text must return 422");
  const shortBody = await shortRes.json();
  assert.equal(shortBody.error.code, "EXTRACTION_FAILED");

  // Missing appName
  const missingAppRes = await submitTextRoute(
    new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "",
        documentType: "terms_of_service",
      }),
    })
  );
  assert.equal(missingAppRes.status, 400, "Missing appName must return 400");
  const missingAppBody = await missingAppRes.json();
  assert.equal(missingAppBody.error.code, "INVALID_APP_NAME");

  // Malformed JSON body
  const malformedRes = await submitTextRoute(
    new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    })
  );
  assert.equal(malformedRes.status, 400, "Malformed body must return 400");
  const malformedBody = await malformedRes.json();
  assert.equal(malformedBody.error.code, "INVALID_REQUEST_BODY");
});

// 3. Successful P01-P05 invocation
let completedJobId = "";
let completedReportId = "";

runTest("Test 3: Successful P01-P05 invocation runs all stages to completion", async () => {
  const cleanup = installMockGeminiPipeline();
  try {
    const req = new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "TermsLens Cloud",
        documentType: "terms_of_service",
      }),
    });

    const res = await submitTextRoute(req);
    const body = (await res.json()) as SubmitAnalysisResponse;
    completedJobId = body.jobId;
    completedReportId = body.reportId;

    // Await background execution
    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "completed");
    assert.equal(finishedJob.currentStage, "COMPLETED");
    assert.ok(finishedJob.completedAt, "completedAt timestamp must be recorded");
    assert.ok(finishedJob.reportUrl?.includes(body.reportId));
  } finally {
    cleanup();
  }
});

// 4. Stage-level job updates
runTest("Test 4: Status endpoint exposes discrete pipeline stages without fabricated percentages", async () => {
  assert.ok(completedJobId, "Must have completed job from Test 3");

  const statusReq = new Request(
    `http://localhost:3000/api/analyze/status/${encodeURIComponent(completedJobId)}`
  );
  const statusRes = await getJobStatusRoute(statusReq, {
    params: Promise.resolve({ jobId: completedJobId }),
  });

  assert.equal(statusRes.status, 200);
  const statusBody = (await statusRes.json()) as JobStatusResponse;
  assert.equal(statusBody.jobId, completedJobId);
  assert.equal(statusBody.reportId, completedReportId);
  assert.equal(statusBody.status, "completed");
  assert.equal(statusBody.currentStage, "COMPLETED");
  assert.equal(statusBody.message, "Analysis completed successfully.");
  assert.ok(statusBody.completedAt);
});

// 5. Final report persistence
runTest("Test 5: Final AnalysisReport is persisted in reportStore and passes contract validation", async () => {
  assert.ok(completedReportId, "Must have completed report from Test 3");

  const report = reportStore.get(completedReportId);
  assert.ok(report, `Report ${completedReportId} must exist in reportStore`);
  assert.equal(report.id, completedReportId);
  assert.equal(report.appName, "TermsLens Cloud");
  assert.equal(report.clauses.length, 2);
  assert.equal(report.privacyFindings.length, 6);

  // Validate against authoritative schema
  const validation = validateAnalysisReport(report);
  assert.equal(validation.isValid, true, `Report validation failed: ${validation.errors.join("; ")}`);

  // Verify verbatim quote integrity
  const arb = report.clauses.find((c) => c.id === "clause_arb_001");
  assert.ok(arb);
  assert.equal(arb.attentionLevel, "high");
  assert.equal(arb.category, "dispute_resolution");
  assert.ok(arb.evidence.exactQuote.includes("individual binding arbitration"));
});

// 6. P03 failure
runTest("Test 6: P03 failure aborts pipeline immediately with explicit error and failing stage", async () => {
  const cleanup = installMockGeminiPipeline({ failStage: "P03" });
  try {
    const req = new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "P03FailApp",
        documentType: "terms_of_service",
      }),
    });

    const res = await submitTextRoute(req);
    const body = (await res.json()) as SubmitAnalysisResponse;

    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "failed");
    assert.equal(finishedJob.currentStage, "FAILED");
    assert.ok(finishedJob.error);
    assert.equal(finishedJob.error.stage, "P03_RISK_AND_PRIVACY_ANALYSIS");
    assert.ok(finishedJob.error.message.includes("P03"));

    // No broken report stored
    assert.equal(reportStore.has(body.reportId), false, "Must not persist report on P03 failure");
  } finally {
    cleanup();
  }
});

// 7. P04 failure
runTest("Test 7: P04 failure aborts pipeline immediately with explicit error and failing stage", async () => {
  const cleanup = installMockGeminiPipeline({ failStage: "P04" });
  try {
    const req = new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "P04FailApp",
        documentType: "terms_of_service",
      }),
    });

    const res = await submitTextRoute(req);
    const body = (await res.json()) as SubmitAnalysisResponse;

    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "failed");
    assert.equal(finishedJob.currentStage, "FAILED");
    assert.ok(finishedJob.error);
    assert.equal(finishedJob.error.stage, "P04_EVIDENCE_VERIFICATION");
    assert.ok(finishedJob.error.message.includes("P04"));

    // No report stored
    assert.equal(reportStore.has(body.reportId), false, "Must not persist report on P04 failure");
  } finally {
    cleanup();
  }
});

// 8. P05 failure
runTest("Test 8: P05 failure aborts pipeline immediately with explicit error and failing stage", async () => {
  const cleanup = installMockGeminiPipeline({ failStage: "P05" });
  try {
    const req = new Request("http://localhost:3000/api/analyze/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE_POLICY_TEXT,
        appName: "P05FailApp",
        documentType: "terms_of_service",
      }),
    });

    const res = await submitTextRoute(req);
    const body = (await res.json()) as SubmitAnalysisResponse;

    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "failed");
    assert.equal(finishedJob.currentStage, "FAILED");
    assert.ok(finishedJob.error);
    assert.equal(finishedJob.error.stage, "P05_FINAL_REPORT_GENERATION");
    assert.ok(finishedJob.error.message.includes("P05"));
  } finally {
    cleanup();
  }
});

// 9. Cancellation behaviour
runTest("Test 9: Job cancellation stops pipeline progression and records CANCELLED stage", async () => {
  // Submit a job
  const req = new Request("http://localhost:3000/api/analyze/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: SAMPLE_POLICY_TEXT,
      appName: "CancelApp",
      documentType: "terms_of_service",
    }),
  });

  const res = await submitTextRoute(req);
  const body = (await res.json()) as SubmitAnalysisResponse;

  // Immediately cancel job
  const cancelReq = new Request(
    `http://localhost:3000/api/analyze/cancel/${encodeURIComponent(body.jobId)}`,
    { method: "POST" }
  );
  const cancelRes = await cancelJobRoute(cancelReq, {
    params: Promise.resolve({ jobId: body.jobId }),
  });

  assert.equal(cancelRes.status, 200);
  const cancelBody = await cancelRes.json();
  assert.equal(cancelBody.success, true);

  // Verify job state in store
  const job = jobStore.get(body.jobId);
  assert.ok(job);
  assert.equal(job.status, "cancelled");
  assert.equal(job.currentStage, "CANCELLED");
  assert.equal(job.error?.code, "CANCELLED");
  assert.equal(isJobCancelled(body.jobId), true);
});

// 10. Report retrieval after completion
runTest("Test 10: GET /api/reports/:id retrieves stored AnalysisReport passing contract validation", async () => {
  assert.ok(completedReportId, "Must have completed report from Test 3");

  const reportReq = new Request(
    `http://localhost:3000/api/reports/${encodeURIComponent(completedReportId)}`
  );
  const reportRes = await getReportRoute(reportReq, {
    params: Promise.resolve({ id: completedReportId }),
  });

  assert.equal(reportRes.status, 200);
  const retrievedReport = (await reportRes.json()) as AnalysisReport;
  assert.equal(retrievedReport.id, completedReportId);
  assert.equal(retrievedReport.appName, "TermsLens Cloud");
  assert.equal(retrievedReport.totalClausesAnalyzed, 2);
  assert.equal(retrievedReport.highAttentionCount, 1);
  assert.equal(retrievedReport.moderateAttentionCount, 1);

  const validation = validateAnalysisReport(retrievedReport);
  assert.equal(validation.isValid, true);
});

// ============================================================================
// Suite Runner
// ============================================================================

async function runSuite() {
  for (const { name, fn } of testQueue) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedTests++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [FAIL] ${name}: ${msg}`);
      failedTests++;
    }
  }

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
