/**
 * API INTEGRATION LAYER TEST SUITE
 * 
 * Verifies that the TermsLens frontend integration layer satisfies:
 * 1. Successful submission (submitFile, submitText, submitUrl)
 * 2. Failed submission (HTTP 422 / invalid inputs)
 * 3. Polling and cancellation (getJobStatus progression and cancelJob)
 * 4. Completed analysis (getReportById with validateAnalysisReport)
 * 5. Failed analysis (status: "failed" with ApiError)
 * 6. Invalid report response (missing required fields flagged by validateAnalysisReport)
 * 7. Demo mode operation (MockAnalysisAdapter behavior and isDemonstrationFixture)
 */

import {
  analysisService,
  MockAnalysisAdapter,
  HttpApiAnalysisAdapter,
  validateAnalysisReport,
} from "../src/services/analysis-service.ts";
import type {
  AnalysisReport,
  PipelineStage,
  JobStatusResponse,
} from "../src/types/index.ts";

let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  console.log("=======================================================");
  console.log("TERMSLENS API INTEGRATION TEST SUITE");
  console.log("=======================================================\n");

  // ----------------------------------------------------------------------------
  // 1. SUCCESSFUL SUBMISSION (Mock & HTTP Adapters)
  // ----------------------------------------------------------------------------
  console.log("--- Group 1: Successful Submissions ---");

  await runTest("MockAdapter: submitText returns valid Job submission response", async () => {
    const adapter = new MockAnalysisAdapter();
    const res = await adapter.submitText("Arbitration clause text example here.", "TestApp", "terms_of_service");
    assert(res.jobId.startsWith("job_"), "Job ID should start with job_");
    assert(res.reportId.startsWith("doc_") || res.reportId.startsWith("rep_"), "Report ID should start with doc_ or rep_");
    assert(res.currentStage === "PREPROCESSING", "Initial stage should be PREPROCESSING");
    assert(res.status === "queued" || res.status === "processing", "Initial status should be queued or processing");
    assert(typeof res.message === "string" && res.message.length > 0, "Initial message should be descriptive");
  });

  await runTest("MockAdapter: submitUrl returns valid Job submission response", async () => {
    const adapter = new MockAnalysisAdapter();
    const res = await adapter.submitUrl("https://example.com/privacy", "UrlApp", "privacy_policy");
    assert(res.jobId.startsWith("job_"), "Job ID should start with job_");
    assert(res.reportId.startsWith("doc_") || res.reportId.startsWith("rep_"), "Report ID should start with doc_ or rep_");
    assert(res.currentStage === "PREPROCESSING", "Initial stage should be PREPROCESSING");
    assert(res.status === "queued" || res.status === "processing", "Initial status should be queued or processing");
  });

  await runTest("HttpAdapter: submitText dispatches POST /api/analyze/text and returns 202 data", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: any, init: any) => {
        assert(String(url).endsWith("/api/analyze/text"), "Should call /api/analyze/text endpoint");
        assert(init.method === "POST", "Should use POST method");
        const body = JSON.parse(init.body);
        assert(body.appName === "LiveApp", "Payload appName must match");
        assert(body.documentType === "terms_of_service", "Payload documentType must match");
        return new Response(
          JSON.stringify({
            jobId: "job_live_test_01",
            reportId: "rep_live_test_01",
            status: "processing",
            currentStage: "PREPROCESSING",
            message: "Document received and queued for ingestion",
            pollIntervalMs: 2000,
          }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      const res = await httpAdapter.submitText("Sample live text terms", "LiveApp", "terms_of_service");
      assert(res.jobId === "job_live_test_01", "Returned job ID should match live mock response");
      assert(res.currentStage === "PREPROCESSING", "Returned stage should match");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await runTest("HttpAdapter: submitUrl dispatches POST /api/analyze/url with URL payload", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (url: any, init: any) => {
        assert(String(url).endsWith("/api/analyze/url"), "Should call /api/analyze/url endpoint");
        const body = JSON.parse(init.body);
        assert(body.url === "https://test.com/terms", "URL must match");
        return new Response(
          JSON.stringify({
            jobId: "job_url_test_02",
            reportId: "rep_url_test_02",
            status: "processing",
            currentStage: "PREPROCESSING",
            message: "Fetching URL server-side",
            pollIntervalMs: 2000,
          }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      const res = await httpAdapter.submitUrl("https://test.com/terms", "UrlTest", "terms_of_service");
      assert(res.jobId === "job_url_test_02", "Job ID should match");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ----------------------------------------------------------------------------
  // 2. FAILED SUBMISSION (HTTP 422 / Invalid Document Inputs)
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 2: Failed Submissions ---");

  await runTest("Input Validation: Short text is rejected", () => {
    const res = analysisService.validateText("Too short");
    assert(!res.isValid, "Short text should be invalid");
    assert(typeof res.error === "string", "Error message must be provided");
  });

  await runTest("Input Validation: Malformed URL is rejected", () => {
    const res = analysisService.validateUrl("htp://invalid-url");
    assert(!res.isValid, "Invalid protocol should be rejected");
    assert(typeof res.error === "string", "Error message must be provided");
  });

  await runTest("HttpAdapter: Handles HTTP 422 Unprocessable Entity error response", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              code: "DOCUMENT_LANGUAGE_UNSUPPORTED",
              message: "TermsLens currently supports English language policies.",
              stage: "PREPROCESSING",
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } }
        );
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      let caughtError: any = null;
      try {
        await httpAdapter.submitText("Non-English text sample...", "ForeignApp", "terms_of_service");
      } catch (err) {
        caughtError = err;
      }

      assert(caughtError !== null, "Should throw on HTTP 422");
      assert(
        caughtError.message.includes("TermsLens currently supports English") ||
        caughtError.message.includes("DOCUMENT_LANGUAGE_UNSUPPORTED"),
        "Error message should contain server failure detail"
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ----------------------------------------------------------------------------
  // 3. POLLING AND CANCELLATION (getJobStatus & cancelJob)
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 3: Polling & Cancellation ---");

  await runTest("MockAdapter: getJobStatus progresses through discrete 5 pipeline stages", async () => {
    const adapter = new MockAnalysisAdapter();
    const sub = await adapter.submitText("Policy text sample", "StepApp", "terms_of_service");
    assert(sub.currentStage === "PREPROCESSING", "Initial stage must be PREPROCESSING");

    const expectedPollingStages: PipelineStage[] = [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "P03_RISK_AND_PRIVACY_ANALYSIS",
      "P04_EVIDENCE_VERIFICATION",
      "P05_FINAL_REPORT_GENERATION",
      "COMPLETED",
    ];

    for (const expectedStage of expectedPollingStages) {
      const status = await adapter.getJobStatus(sub.jobId);
      assert(
        status.currentStage === expectedStage,
        `Expected stage ${expectedStage}, got ${status.currentStage}`
      );
      if (expectedStage === "COMPLETED") {
        assert(status.status === "completed", "Final status must be completed");
      } else {
        assert(status.status === "processing", `Stage ${expectedStage} should have processing status`);
      }
    }
  });

  await runTest("MockAdapter: cancelJob stops active processing", async () => {
    const adapter = new MockAnalysisAdapter();
    const sub = await adapter.submitText("Policy text to cancel", "CancelApp", "terms_of_service");
    
    // Step once
    await adapter.getJobStatus(sub.jobId);

    // Cancel job
    await adapter.cancelJob(sub.jobId);

    const status = await adapter.getJobStatus(sub.jobId);
    assert(status.status === "failed", "Cancelled job status should be failed");
    assert(status.error?.code === "CANCELLED", "Error code should be CANCELLED");
    assert(status.message.toLowerCase().includes("cancelled"), "Message should mention cancellation");
  });

  await runTest("HttpAdapter: cancelJob issues POST /api/analyze/cancel/:id request", async () => {
    const originalFetch = globalThis.fetch;
    let cancelCalled = false;
    try {
      globalThis.fetch = async (url: any, init: any) => {
        if (init.method === "POST" && String(url).includes("/api/analyze/cancel/job_123")) {
          cancelCalled = true;
          return new Response(JSON.stringify({ success: true, message: "Job cancelled successfully" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("Not found", { status: 404 });
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      const success = await httpAdapter.cancelJob("job_123");
      assert(cancelCalled, "POST /api/analyze/cancel/:id should be called");
      assert(success, "cancelJob should return true");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ----------------------------------------------------------------------------
  // 4. COMPLETED ANALYSIS & REPORT RETRIEVAL
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 4: Completed Analysis & Report Retrieval ---");

  await runTest("MockAdapter: getReportById returns verified report passing validateAnalysisReport", async () => {
    const adapter = new MockAnalysisAdapter();
    const sub = await adapter.submitText("Test text", "TestApp", "terms_of_service");

    // Advance to completion
    for (let i = 0; i < 7; i++) {
      await adapter.getJobStatus(sub.jobId);
    }

    const report = await adapter.getReportById(sub.reportId);
    assert(report.id === sub.reportId, "Report ID must match");
    assert(report.clauses.length > 0, "Report must have extracted clauses");
    assert(report.privacyFindings.length > 0, "Report must have privacy findings");

    const validation = validateAnalysisReport(report);
    assert(validation.isValid, `Report validation failed: ${validation.errors.join("; ")}`);
  });

  await runTest("validateAnalysisReport: Confirms production Spotify demo report is valid", async () => {
    const spotifyReport = await analysisService.getReportById("doc_demo_spotify_01");
    const validation = validateAnalysisReport(spotifyReport);
    assert(validation.isValid, `Spotify demo report validation failed: ${validation.errors.join("; ")}`);
  });

  // ----------------------------------------------------------------------------
  // 5. FAILED ANALYSIS (status: 'failed' with ApiError)
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 5: Failed Analysis ---");

  await runTest("HttpAdapter: getJobStatus parses backend failure details and ApiError", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            jobId: "job_err_99",
            reportId: "rep_err_99",
            status: "failed",
            currentStage: "P04_EVIDENCE_VERIFICATION",
            message: "Evidence grounding failed: hallucinated deadline detected.",
            error: {
              code: "EVIDENCE_VERIFICATION_FAILED",
              message: "AI assertion could not be matched against source policy excerpt.",
              stage: "P04_EVIDENCE_VERIFICATION",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      const status = await httpAdapter.getJobStatus("job_err_99");
      assert(status.status === "failed", "Status must be failed");
      assert(status.error !== undefined, "Error object must be present");
      assert(status.error?.code === "EVIDENCE_VERIFICATION_FAILED", "Error code must match");
      assert(status.currentStage === "P04_EVIDENCE_VERIFICATION", "Current stage must match P04");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ----------------------------------------------------------------------------
  // 6. INVALID REPORT RESPONSE VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 6: Invalid Report Response Validation ---");

  await runTest("validateAnalysisReport: Rejects null or primitive data", () => {
    assert(!validateAnalysisReport(null).isValid, "null report must be invalid");
    assert(!validateAnalysisReport(undefined).isValid, "undefined report must be invalid");
    assert(!validateAnalysisReport("string").isValid, "string report must be invalid");
  });

  await runTest("validateAnalysisReport: Rejects report missing top-level identity fields", () => {
    const brokenReport: any = {
      // missing id
      appName: "NoIdApp",
      clauses: [],
    };
    const val = validateAnalysisReport(brokenReport);
    assert(!val.isValid, "Report missing ID must be invalid");
    assert(val.errors.some((e) => e.includes("id")), "Error must mention id");
  });

  await runTest("validateAnalysisReport: Rejects report where clauses lack evidence.exactQuote", () => {
    const brokenClauseReport: any = {
      id: "rep_broken_01",
      appName: "BrokenApp",
      documentTitle: "Broken Terms",
      documentType: "terms_of_service",
      analysisDate: "2026-11-04T00:00:00Z",
      documentSummary: "A broken report test",
      clauses: [
        {
          id: "clause_01",
          title: "Ungrounded Clause",
          shortExplanation: "Explanation",
          originalClauseText: "Full text",
          evidence: {
            // missing exactQuote
            clauseNumber: "Section 1",
          },
          analysis: {
            plainLanguageExplanation: "Exp",
            whyThisClauseMatters: "Why",
            potentialUserImplications: [],
            attentionLevel: "high",
            category: "arbitration",
          },
          verification: {
            status: "verified",
            evidenceMatchesOriginal: true,
            reviewerType: "automated_pipeline",
            notes: "Grounded",
            verifiedAt: "2026-11-04T00:00:00Z",
          },
        },
      ],
      privacyFindings: [],
      executiveSummary: {
        bottomLine: "Test",
        unusualOrAggressiveProvisions: [],
        positiveConsumerProtections: [],
        overallFairnessScore: 50,
      },
      verificationSummary: {
        verifiedCount: 1,
        unverifiedCount: 0,
        rejectedCount: 0,
        methodologyDescription: "Test",
      },
    };

    const val = validateAnalysisReport(brokenClauseReport);
    assert(!val.isValid, "Report with unevidenced clause must be invalid");
    assert(val.errors.some((e) => e.includes("exactQuote")), "Error must specify exactQuote");
  });

  await runTest("HttpAdapter: getReportById throws when response fails validateAnalysisReport", async () => {
    const originalFetch = globalThis.fetch;
    try {
      globalThis.fetch = async () => {
        // Return payload missing required clauses
        return new Response(
          JSON.stringify({
            id: "rep_malformed_01",
            appName: "MalformedApp",
            // missing documentTitle, clauses, etc.
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const httpAdapter = new HttpApiAnalysisAdapter("/api");
      let threw = false;
      try {
        await httpAdapter.getReportById("rep_malformed_01");
      } catch (err: any) {
        threw = true;
        assert(
          err.message.includes("malformed") || err.message.includes("schema validation"),
          "Error must mention malformed or schema validation failure"
        );
      }
      assert(threw, "getReportById should throw on malformed data");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // ----------------------------------------------------------------------------
  // 7. DEMO MODE OPERATION & TRANSPARENT LABELING
  // ----------------------------------------------------------------------------
  console.log("\n--- Group 7: Demo Mode Operation & Transparent Labeling ---");

  await runTest("Demo Mode: Defaults to mock adapter and disabled live API", () => {
    assert(!analysisService.isLiveApiEnabled(), "isLiveApiEnabled should default to false");
    assert(analysisService.getActiveAdapter().mode === "mock", "Active adapter mode should default to mock");
  });

  await runTest("Demo Mode: Can toggle to live API mode and back", () => {
    analysisService.setLiveApiEnabled(true);
    assert(analysisService.isLiveApiEnabled(), "Live API should be enabled");
    assert(analysisService.getActiveAdapter().mode === "live", "Active adapter mode should be live");

    analysisService.setLiveApiEnabled(false);
    assert(!analysisService.isLiveApiEnabled(), "Live API should be disabled");
    assert(analysisService.getActiveAdapter().mode === "mock", "Active adapter mode should revert to mock");
  });

  await runTest("Demo Mode: Demonstration records include explicit disclaimer notice", async () => {
    const igReport = await analysisService.getReportById("doc_demo_instagram_02");
    assert(igReport.isDemonstrationFixture === true, "Must have isDemonstrationFixture flag");
    assert(
      typeof igReport.demonstrationNotice === "string" && igReport.demonstrationNotice.length > 0,
      "Must include demonstrative disclaimer notice"
    );
    assert(
      igReport.demonstrationNotice.includes("demonstration") || igReport.demonstrationNotice.includes("Sample"),
      "Disclaimer notice must clarify non-official demonstration content"
    );
  });

  console.log("\n=======================================================");
  console.log(`API Integration Test Results: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test execution runner error:", err);
  process.exit(1);
});
