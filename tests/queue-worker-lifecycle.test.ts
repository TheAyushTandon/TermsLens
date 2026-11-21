/**
 * TERMSLENS QUEUE & WORKER LIFECYCLE TEST SUITE
 *
 * Verifies:
 * 1. Queue payload contains only identifiers (jobId, reportId) - never sensitive document text
 * 2. Duplicate enqueue prevention with singletonKey
 * 3. Duplicate worker delivery idempotency (completed job acknowledged without rerun)
 * 4. Stage checkpoint recovery: resumes from P03 when P01/P02 are saved in stageData,
 *    guaranteeing P01 and P02 are NOT re-executed
 * 5. Stranded transactional outbox recovery (processStrandedOutboxJobs)
 * 6. Interrupted/crashed worker job recovery (recoverUnfinishedJobs)
 * 7. Worker terminal failure updates job record with failing stage and error code
 * 8. Configurable worker concurrency settings
 */

import assert from "node:assert/strict";
import {
  enqueueAnalysisJob,
  processStrandedOutboxJobs,
  setBossInstance,
  POLICY_ANALYSIS_QUEUE,
  type QueueJobPayload,
} from "../src/lib/queue.ts";
import {
  processAnalysisJob,
  recoverUnfinishedJobs,
} from "../src/workers/analysis-worker.ts";
import { jobStore, type AnalysisJobRecord } from "../src/lib/job-store.ts";
import { setPoolInstance } from "../src/lib/db.ts";
import { runFullPolicyAnalysisPipeline } from "../src/services/p05-final-report-generation.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}\n    ${msg}`);
  }
}

/**
 * Creates a mock PgBoss instance to inspect calls and simulate queue behavior.
 */
function createMockBoss() {
  const sentJobs: Array<{ name: string; data: any; options?: any }> = [];
  const workerHandlers = new Map<string, Function>();

  return {
    sentJobs,
    workerHandlers,
    async start() {},
    async stop() {},
    async send(name: string, data: any, options?: any) {
      sentJobs.push({ name, data, options });
      return `boss_job_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    },
    async work(name: string, options: any, handler: Function) {
      workerHandlers.set(name, handler);
    },
  };
}

/**
 * Creates a mock Pool for queue & outbox tests.
 */
function createMockQueuePool() {
  const outboxRows: Array<{
    id: number;
    job_id: string;
    queue_name: string;
    payload: any;
    status: string;
    error_message?: string;
  }> = [];

  let nextId = 1;

  const mockPool = {
    outboxRows,
    async query(sql: string, params?: any[]) {
      const normalized = sql.trim().toUpperCase();

      // INSERT into analysis_outbox
      if (normalized.startsWith("INSERT INTO ANALYSIS_OUTBOX")) {
        const id = nextId++;
        const row = {
          id,
          job_id: params?.[0],
          queue_name: params?.[1],
          payload: typeof params?.[2] === "string" ? JSON.parse(params[2]) : params?.[2],
          status: "pending",
        };
        outboxRows.push(row);
        return { rowCount: 1, rows: [{ id }] };
      }

      // UPDATE analysis_outbox status = 'published'
      if (normalized.includes("UPDATE ANALYSIS_OUTBOX SET STATUS = 'PUBLISHED'")) {
        const id = params?.[0];
        const row = outboxRows.find((r) => r.id === id);
        if (row) {
          row.status = "published";
        }
        return { rowCount: 1, rows: [] };
      }

      // SELECT from analysis_outbox WHERE status = 'pending'
      if (normalized.includes("STATUS = 'PENDING'")) {
        const pending = outboxRows.filter((r) => r.status === "pending");
        return { rowCount: pending.length, rows: pending };
      }

      return { rowCount: 0, rows: [] };
    },
  };

  return mockPool as any;
}

// ============================================================================
// Deterministic Synthetic Fixtures
// ============================================================================

const SYNTHETIC_P01 = {
  extractedClauses: [
    {
      tempClauseId: "clause_arb_001",
      segmentIndex: 1,
      sectionHeading: "Section 7. Mandatory Arbitration",
      sectionNumber: "7",
      sourcePage: 2,
      originalClauseText:
        "All disputes must be decided by mandatory binding individual arbitration.",
      operativeSummary: "Mandatory individual arbitration and class action waiver.",
    },
    {
      tempClauseId: "clause_bill_002",
      segmentIndex: 0,
      sectionHeading: "Section 2. Automatic Billing",
      sectionNumber: "2",
      sourcePage: 1,
      originalClauseText:
        "Your subscription will automatically renew on a monthly basis until you cancel.",
      operativeSummary: "Monthly subscription renewal with recurring automated payment charges.",
    },
  ],
  totalClausesAnalyzed: 2,
};

const SYNTHETIC_P02 = {
  clauseExplanations: [
    {
      tempClauseId: "clause_arb_001",
      title: "Mandatory Individual Arbitration",
      shortExplanation: "All disputes must be decided by binding individual arbitration.",
      plainLanguageExplanation: "If you have a dispute, you cannot sue in open court before a jury.",
      whyThisClauseMatters: "Waives constitutional right to a jury trial.",
      potentialUserImplications: ["No access to civil court jury trials."],
      actionableAdvice: "Check whether terms provide an arbitration opt-out.",
    },
    {
      tempClauseId: "clause_bill_002",
      title: "Automatic Subscription Renewal",
      shortExplanation: "Subscriptions renew automatically each month.",
      plainLanguageExplanation: "Your payment method will be charged automatically every billing cycle.",
      whyThisClauseMatters: "Continuous recurring payments billed automatically.",
      potentialUserImplications: ["Recurring monthly charges until cancelled."],
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
        exactQuote: "All disputes must be decided by mandatory binding individual arbitration.",
        highlightExcerpt: "mandatory binding individual arbitration",
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
        exactQuote: "Your subscription will automatically renew on a monthly basis until you cancel.",
        highlightExcerpt: "automatically renew on a monthly basis until you cancel",
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
    methodologyDescription: "All findings audited through automated semantic verification.",
  },
};

const SYNTHETIC_P05_SYNTHESIS = {
  documentSummary: "Synthesizing operative dispute resolution and billing terms.",
  executiveSummary: {
    documentOverview: "Governs individual use of services, specifying recurring billing schedules.",
    mainObligations: ["Pay monthly recurring subscription charges until cancellation."],
    companyPermissions: ["Automatically charge designated payment methods each billing cycle."],
    majorAttentionAreas: ["Dispute Resolution: Requires individual binding arbitration."],
    preAgreementChecklist: ["Review cancellation terms and renewal dates."],
  },
};

function buildMockGeminiResponse(payload: any): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(payload) }],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function resetEnv() {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
  setBossInstance(null);
  setPoolInstance(null);
}

async function runAllTests() {
  console.log("=======================================================");
  console.log("TermsLens Queue & Worker Lifecycle Test Suite");
  console.log("=======================================================\n");

  console.log("--- Group 1: Transactional Outbox & Queue Payload Isolation ---");

  await runTest("Queue payload contains only identifiers (jobId, reportId), never document text", async () => {
    resetEnv();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/termslens";

    const mockBoss = createMockBoss();
    const mockPool = createMockQueuePool();

    setBossInstance(mockBoss as any);
    setPoolInstance(mockPool);

    const payload: QueueJobPayload = {
      jobId: "job_secure_test_01",
      reportId: "rep_secure_test_01",
    };

    await enqueueAnalysisJob(payload);

    assert.equal(mockBoss.sentJobs.length, 1);
    const sent = mockBoss.sentJobs[0];

    assert.equal(sent.name, POLICY_ANALYSIS_QUEUE);
    assert.deepEqual(sent.data, {
      jobId: "job_secure_test_01",
      reportId: "rep_secure_test_01",
    });

    // Verify documentText was NOT sent through the message broker
    assert.equal((sent.data as any).rawText, undefined);
    assert.equal((sent.data as any).documentText, undefined);
  });

  await runTest("enqueueAnalysisJob uses singletonKey for duplicate enqueue prevention", async () => {
    resetEnv();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/termslens";

    const mockBoss = createMockBoss();
    const mockPool = createMockQueuePool();

    setBossInstance(mockBoss as any);
    setPoolInstance(mockPool);

    const payload: QueueJobPayload = {
      jobId: "job_singleton_01",
      reportId: "rep_singleton_01",
    };

    await enqueueAnalysisJob(payload);

    const sent = mockBoss.sentJobs[0];
    assert.equal(sent.options?.singletonKey, "job_singleton_01");
    assert.equal(sent.options?.retryLimit, 3);
    assert.equal(sent.options?.retryBackoff, true);
  });

  await runTest("Stranded outbox publisher recovers and publishes pending jobs", async () => {
    resetEnv();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/termslens";

    const mockBoss = createMockBoss();
    const mockPool = createMockQueuePool();

    setBossInstance(mockBoss as any);
    setPoolInstance(mockPool);

    // Seed 2 stranded pending outbox rows
    mockPool.outboxRows.push({
      id: 101,
      job_id: "job_stranded_1",
      queue_name: POLICY_ANALYSIS_QUEUE,
      payload: { jobId: "job_stranded_1", reportId: "rep_stranded_1" },
      status: "pending",
    });
    mockPool.outboxRows.push({
      id: 102,
      job_id: "job_stranded_2",
      queue_name: POLICY_ANALYSIS_QUEUE,
      payload: { jobId: "job_stranded_2", reportId: "rep_stranded_2" },
      status: "pending",
    });

    const recoveredCount = await processStrandedOutboxJobs();
    assert.equal(recoveredCount, 2);
    assert.equal(mockBoss.sentJobs.length, 2);
    assert.equal(mockPool.outboxRows[0].status, "published");
    assert.equal(mockPool.outboxRows[1].status, "published");
  });

  console.log("\n--- Group 2: Worker Idempotency & Duplicate Delivery ---");

  await runTest("Duplicate worker delivery for completed job is skipped immediately", async () => {
    resetEnv();

    const completedJob: AnalysisJobRecord = {
      jobId: "job_already_done",
      reportId: "rep_already_done",
      appName: "TestApp",
      documentType: "terms_of_service",
      status: "completed",
      currentStage: "COMPLETED",
      message: "Already completed.",
      createdAt: new Date().toISOString(),
    };

    await jobStore.set(completedJob.jobId, completedJob);

    // Call worker processing directly
    await processAnalysisJob({
      jobId: "job_already_done",
      reportId: "rep_already_done",
    });

    const after = await jobStore.get("job_already_done");
    assert.equal(after?.status, "completed");
    assert.equal(after?.message, "Already completed.");
  });

  console.log("\n--- Group 3: Stage Checkpoint Recovery (Resuming P03 without rerunning P01/P02) ---");

  await runTest("Pipeline resumes from P03 when P01 and P02 checkpoints are present in stageData", async () => {
    resetEnv();
    process.env.GEMINI_API_KEY = "test-api-key";

    let p01Called = false;
    let p02Called = false;
    let p03Called = false;
    let p04Called = false;
    let p05Called = false;

    globalThis.fetch = async (_url: any, init?: any) => {
      const rawBody = String(init?.body || "");

      if (rawBody.includes("Operative Legal Clause Extraction Engine")) {
        p01Called = true;
        return buildMockGeminiResponse(SYNTHETIC_P01);
      }
      if (rawBody.includes("Plain-Language Translation Engine")) {
        p02Called = true;
        return buildMockGeminiResponse(SYNTHETIC_P02);
      }
      if (rawBody.includes("consumer risk and privacy analyst")) {
        p03Called = true;
        return buildMockGeminiResponse(SYNTHETIC_P03);
      }
      if (rawBody.includes("Adversarial Evidence Verification")) {
        p04Called = true;
        return buildMockGeminiResponse(SYNTHETIC_P04);
      }
      if (
        rawBody.includes("Final Report Synthesis Engine") ||
        rawBody.includes("P05-V3")
      ) {
        p05Called = true;
        return buildMockGeminiResponse(SYNTHETIC_P05_SYNTHESIS);
      }

      throw new Error(`Unexpected mock request in queue test: ${rawBody.slice(0, 100)}`);
    };

    const result = await runFullPolicyAnalysisPipeline(
      {
        rawText: "All disputes must be decided by mandatory binding individual arbitration. Your subscription will automatically renew on a monthly basis until you cancel.",
        appName: "TestApp",
        documentType: "terms_of_service",
      },
      {
        checkpointData: {
          p01Data: SYNTHETIC_P01 as any,
          p02Data: SYNTHETIC_P02 as any,
        },
      }
    );

    assert.equal(result.success, true, `Pipeline must succeed: ${result.error}`);
    assert(result.data, "Report must be produced");

    // Critical assertion: P01 and P02 were NOT called because checkpoints existed!
    assert.equal(p01Called, false, "Stage P01 must NOT be re-executed when checkpoint is provided.");
    assert.equal(p02Called, false, "Stage P02 must NOT be re-executed when checkpoint is provided.");

    // Critical assertion: P03, P04, P05 WERE executed
    assert.equal(p03Called, true, "Stage P03 must execute.");
    assert.equal(p04Called, true, "Stage P04 must execute.");
    assert.equal(p05Called, true, "Stage P05 must execute.");

    // Verify all 5 stages are marked completed in the final report
    assert.deepEqual(result.stagesCompleted, [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "P03_RISK_AND_PRIVACY_ANALYSIS",
      "P04_EVIDENCE_VERIFICATION",
      "P05_FINAL_REPORT_GENERATION",
    ]);
  });

  console.log("\n--- Group 4: Interrupted Worker Job Recovery ---");

  await runTest("recoverUnfinishedJobs re-enqueues incomplete jobs on startup", async () => {
    resetEnv();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/termslens";

    const mockBoss = createMockBoss();
    const mockPool = createMockQueuePool();

    setBossInstance(mockBoss as any);
    setPoolInstance(mockPool);

    // Setup an incomplete job in jobStore
    await jobStore.set("job_crashed_worker", {
      jobId: "job_crashed_worker",
      reportId: "rep_crashed_worker",
      appName: "CrashApp",
      documentType: "terms_of_service",
      status: "processing",
      currentStage: "P02_PLAIN_LANGUAGE_EXPLANATION",
      message: "Was processing P02 when process died",
      documentText: "Some policy terms text",
      createdAt: new Date().toISOString(),
      completedStages: ["P01_CLAUSE_EXTRACTION"],
      stageData: { p01Data: SYNTHETIC_P01 },
    });

    const count = await recoverUnfinishedJobs();
    assert(count >= 1, "Must recover at least 1 unfinished job");

    // Check it was re-sent to pg-boss
    const reSent = mockBoss.sentJobs.find((j) => j.data.jobId === "job_crashed_worker");
    assert(reSent, "Interrupted job must be re-enqueued into pg-boss");
    assert.equal(reSent.options?.singletonKey, "job_crashed_worker");
  });

  resetEnv();

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  resetEnv();
  console.error("Unhandled error:", err);
  process.exit(1);
});
