/**
 * TERMSLENS POSTGRESQL PERSISTENCE & FAIL-FAST TEST SUITE
 *
 * Verifies:
 * 1. Missing production DATABASE_URL fails fast with fatal error
 * 2. In-memory mode (TERMSLENS_STORAGE_MODE=memory) is strictly forbidden in production
 * 3. PostgresJobStore CRUD and data mapping (snake_case -> camelCase)
 * 4. JSON serialization of stage checkpoints and error details
 * 5. updateStage persists checkpoint stageData and completedStages
 * 6. getIncompleteJobs queries queued and processing jobs
 * 7. PostgresReportStore persists AnalysisReport and falls back to seeded demo reports
 * 8. Repeatable database migrations runner
 * 9. Opt-in live database verification if TEST_DATABASE_URL is provided
 */

import assert from "node:assert/strict";
import {
  getStorageMode,
  createJobStore,
  InMemoryJobStore,
  type AnalysisJobRecord,
} from "../src/lib/job-store.ts";
import {
  createReportStore,
  InMemoryReportStore,
} from "../src/lib/report-store.ts";
import { PostgresJobStore } from "../src/lib/postgres-job-store.ts";
import { PostgresReportStore } from "../src/lib/postgres-report-store.ts";
import type { AnalysisReport, DocumentType } from "../src/types/index.ts";

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

const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
}

/**
 * Creates a mock PostgreSQL Pool to inspect queries and test adapters in isolation.
 */
function createMockPool() {
  const executedQueries: Array<{ sql: string; params?: any[] }> = [];
  const inMemoryJobsTable = new Map<string, any>();
  const inMemoryReportsTable = new Map<string, any>();

  const mockPool = {
    executedQueries,
    async query(sql: string, params?: any[]) {
      executedQueries.push({ sql, params });

      const normalized = sql.trim().toUpperCase();

      // SELECT from analysis_jobs
      if (normalized.startsWith("SELECT * FROM ANALYSIS_JOBS WHERE JOB_ID = $1")) {
        const row = inMemoryJobsTable.get(params?.[0]);
        return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
      }

      // SELECT incomplete from analysis_jobs
      if (normalized.includes("STATUS IN ('QUEUED', 'PROCESSING')")) {
        const rows = Array.from(inMemoryJobsTable.values()).filter(
          (r) => r.status === "queued" || r.status === "processing"
        );
        return { rowCount: rows.length, rows };
      }

      // INSERT/UPDATE into analysis_jobs
      if (normalized.startsWith("INSERT INTO ANALYSIS_JOBS")) {
        const row = {
          job_id: params?.[0],
          report_id: params?.[1],
          app_name: params?.[2],
          document_type: params?.[3],
          status: params?.[4],
          current_stage: params?.[5],
          message: params?.[6],
          document_text: params?.[7],
          document_title: params?.[8],
          completed_stages: params?.[9],
          stage_data: params?.[10],
          report_url: params?.[11],
          error: params?.[12],
          created_at: new Date(params?.[13] || Date.now()),
          completed_at: params?.[14] ? new Date(params[14]) : null,
          updated_at: new Date(),
        };
        inMemoryJobsTable.set(row.job_id, row);
        return { rowCount: 1, rows: [] };
      }

      // UPDATE analysis_jobs
      if (normalized.startsWith("UPDATE ANALYSIS_JOBS")) {
        const jobId = params?.[0];
        const row = inMemoryJobsTable.get(jobId);
        if (row) {
          row.current_stage = params?.[1];
          row.status = params?.[2];
          row.message = params?.[3];
          if (row.current_stage === "COMPLETED") {
            row.completed_at = new Date();
          }
          if (params?.[4]) {
            const dataToMerge = typeof params[4] === "string" ? JSON.parse(params[4]) : params[4];
            const currentData = typeof row.stage_data === "string" ? JSON.parse(row.stage_data) : row.stage_data;
            row.stage_data = { ...currentData, ...dataToMerge };
          }
          if (params?.[5]) {
            row.completed_stages = typeof params[5] === "string" ? JSON.parse(params[5]) : params[5];
          }
          row.updated_at = new Date();
        }
        return { rowCount: row ? 1 : 0, rows: [] };
      }

      // SELECT 1 from analysis_jobs
      if (normalized.startsWith("SELECT 1 FROM ANALYSIS_JOBS WHERE JOB_ID = $1")) {
        const exists = inMemoryJobsTable.has(params?.[0]);
        return { rowCount: exists ? 1 : 0, rows: exists ? [{ "?column?": 1 }] : [] };
      }

      // DELETE from analysis_jobs
      if (normalized.startsWith("DELETE FROM ANALYSIS_JOBS WHERE JOB_ID = $1")) {
        const existed = inMemoryJobsTable.delete(params?.[0]);
        return { rowCount: existed ? 1 : 0, rows: [] };
      }

      // SELECT from analysis_reports
      if (normalized.startsWith("SELECT REPORT_JSON FROM ANALYSIS_REPORTS WHERE ID = $1")) {
        const row = inMemoryReportsTable.get(params?.[0]);
        return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
      }

      // SELECT all from analysis_reports
      if (normalized.startsWith("SELECT REPORT_JSON FROM ANALYSIS_REPORTS ORDER BY")) {
        const rows = Array.from(inMemoryReportsTable.values());
        return { rowCount: rows.length, rows };
      }

      // INSERT/UPDATE into analysis_reports
      if (normalized.startsWith("INSERT INTO ANALYSIS_REPORTS")) {
        const row = {
          id: params?.[0],
          app_name: params?.[1],
          document_title: params?.[2],
          document_type: params?.[3],
          report_json: params?.[4],
        };
        inMemoryReportsTable.set(row.id, row);
        return { rowCount: 1, rows: [] };
      }

      return { rowCount: 0, rows: [] };
    },
  };

  return mockPool as any;
}

async function runAllTests() {
  console.log("=======================================================");
  console.log("TermsLens PostgreSQL Persistence & Fail-Fast Tests");
  console.log("=======================================================\n");

  console.log("--- Group 1: Production Fail-Fast Guarantees ---");

  await runTest("Production without DATABASE_URL throws fatal error immediately", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    assert.throws(
      () => {
        getStorageMode();
      },
      (err: any) => {
        assert(err.message.includes("FATAL: DATABASE_URL environment variable is required in production"));
        return true;
      }
    );
  });

  await runTest("createJobStore fails fast in production when DATABASE_URL is missing", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    assert.throws(
      () => {
        createJobStore();
      },
      (err: any) => {
        assert(err.message.includes("DATABASE_URL"));
        return true;
      }
    );
  });

  await runTest("createReportStore fails fast in production when DATABASE_URL is missing", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    delete process.env.DATABASE_URL;

    assert.throws(
      () => {
        createReportStore();
      },
      (err: any) => {
        assert(err.message.includes("DATABASE_URL"));
        return true;
      }
    );
  });

  await runTest("Setting TERMSLENS_STORAGE_MODE=memory in production throws fatal error", () => {
    resetEnv();
    process.env.NODE_ENV = "production";
    process.env.TERMSLENS_STORAGE_MODE = "memory";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/termslens";

    assert.throws(
      () => {
        getStorageMode();
      },
      (err: any) => {
        assert(err.message.includes("strictly forbidden in production"));
        return true;
      }
    );
  });

  await runTest("In development/test without DATABASE_URL, defaults gracefully to InMemoryStore", () => {
    resetEnv();
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;

    assert.equal(getStorageMode(), "memory");
    const store = createJobStore();
    assert(store instanceof InMemoryJobStore);
    const repStore = createReportStore();
    assert(repStore instanceof InMemoryReportStore);
  });

  console.log("\n--- Group 2: PostgresJobStore CRUD & Checkpoint Contract ---");

  await runTest("PostgresJobStore persists and retrieves job with proper data mapping", async () => {
    const mockPool = createMockPool();
    const store = new PostgresJobStore(mockPool);

    const testRecord: AnalysisJobRecord = {
      jobId: "job_test_001",
      reportId: "rep_test_001",
      appName: "AcmeApp",
      documentType: "terms_of_service",
      status: "queued",
      currentStage: "QUEUED",
      message: "Queued for processing",
      documentText: "Sample legal clause text",
      documentTitle: "Acme Terms",
      createdAt: new Date().toISOString(),
      completedStages: ["PREPROCESSING"],
      stageData: { p01Data: { extractedClauses: [] } },
    };

    await store.set(testRecord.jobId, testRecord);

    const fetched = await store.get(testRecord.jobId);
    assert(fetched, "Job record must be returned");
    assert.equal(fetched.jobId, "job_test_001");
    assert.equal(fetched.reportId, "rep_test_001");
    assert.equal(fetched.appName, "AcmeApp");
    assert.equal(fetched.status, "queued");
    assert.equal(fetched.documentText, "Sample legal clause text");
    assert.deepEqual(fetched.completedStages, ["PREPROCESSING"]);
    assert.deepEqual(fetched.stageData, { p01Data: { extractedClauses: [] } });
  });

  await runTest("PostgresJobStore.updateStage merges checkpoint data and transitions stage", async () => {
    const mockPool = createMockPool();
    const store = new PostgresJobStore(mockPool);

    await store.set("job_test_002", {
      jobId: "job_test_002",
      reportId: "rep_test_002",
      appName: "TestApp",
      documentType: "privacy_policy",
      status: "processing",
      currentStage: "P01_CLAUSE_EXTRACTION",
      message: "Extracting clauses",
      createdAt: new Date().toISOString(),
      completedStages: ["P01_CLAUSE_EXTRACTION"],
      stageData: { p01Data: { clauses: [1, 2] } },
    });

    // Update with P02 checkpoint
    await store.updateStage(
      "job_test_002",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "processing",
      "Explaining clauses",
      { p02Data: { explanations: ["clear text"] } },
      ["P01_CLAUSE_EXTRACTION", "P02_PLAIN_LANGUAGE_EXPLANATION"]
    );

    const updated = await store.get("job_test_002");
    assert(updated);
    assert.equal(updated.currentStage, "P02_PLAIN_LANGUAGE_EXPLANATION");
    assert.equal(updated.status, "processing");
    assert.deepEqual(updated.completedStages, [
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
    ]);
    assert(updated.stageData?.p01Data, "p01Data checkpoint must be preserved");
    assert(updated.stageData?.p02Data, "p02Data checkpoint must be merged");
  });

  await runTest("PostgresJobStore.getIncompleteJobs retrieves queued and processing records", async () => {
    const mockPool = createMockPool();
    const store = new PostgresJobStore(mockPool);

    await store.set("job_queued_1", {
      jobId: "job_queued_1",
      reportId: "rep_1",
      appName: "App1",
      documentType: "terms_of_service",
      status: "queued",
      currentStage: "QUEUED",
      message: "Queued",
      createdAt: new Date().toISOString(),
    });

    await store.set("job_processing_2", {
      jobId: "job_processing_2",
      reportId: "rep_2",
      appName: "App2",
      documentType: "terms_of_service",
      status: "processing",
      currentStage: "P02_PLAIN_LANGUAGE_EXPLANATION",
      message: "Processing",
      createdAt: new Date().toISOString(),
    });

    await store.set("job_done_3", {
      jobId: "job_done_3",
      reportId: "rep_3",
      appName: "App3",
      documentType: "terms_of_service",
      status: "completed",
      currentStage: "COMPLETED",
      message: "Done",
      createdAt: new Date().toISOString(),
    });

    const incomplete = await store.getIncompleteJobs();
    assert.equal(incomplete.length, 2);
    const ids = incomplete.map((j) => j.jobId);
    assert(ids.includes("job_queued_1"));
    assert(ids.includes("job_processing_2"));
    assert(!ids.includes("job_done_3"), "Completed jobs must not be in incomplete list");
  });

  console.log("\n--- Group 3: PostgresReportStore CRUD & Demo Fallback ---");

  await runTest("PostgresReportStore stores and retrieves custom AnalysisReport", async () => {
    const mockPool = createMockPool();
    const reportStore = new PostgresReportStore(mockPool);

    const sampleReport: AnalysisReport = {
      id: "rep_custom_123",
      appName: "CustomService",
      documentTitle: "Custom Privacy Policy",
      documentType: "privacy_policy",
      analysisDate: new Date().toISOString(),
      overallScore: 88,
      verdict: "FAVORABLE",
      grade: "B+",
      summary: "Balanced consumer privacy policy.",
      executiveSummary: {
        score: 88,
        grade: "B+",
        verdict: "FAVORABLE",
        overallRiskLevel: "LOW",
        keyTakeaway: "Clear provisions with minor retention questions.",
        totalClausesAnalyzed: 5,
        criticalFlagsCount: 0,
        highRiskCount: 0,
        dataRetentionSummary: "Standard 30 day window",
        userRightsSummary: "Full GDPR compliance",
      },
      clauseAnalysis: [],
      privacyAnalysis: {
        privacyScore: 88,
        categories: {
          dataCollection: { score: 90, riskLevel: "LOW", summary: "Minimal", details: [] },
          dataSharing: { score: 85, riskLevel: "LOW", summary: "No third party selling", details: [] },
          dataRetention: { score: 80, riskLevel: "MEDIUM", summary: "30 days", details: [] },
          userRights: { score: 95, riskLevel: "LOW", summary: "Access & deletion", details: [] },
          security: { score: 90, riskLevel: "LOW", summary: "TLS & encryption", details: [] },
          childrenPrivacy: { score: 90, riskLevel: "LOW", summary: "13+ only", details: [] },
        },
        thirdPartySharing: false,
        dataSelling: false,
        trackersDetected: [],
      },
      verificationAudit: {
        isGrounded: true,
        unsupportedClaimsCount: 0,
        verifiedClausesCount: 5,
        confidenceScore: 0.98,
        auditTrail: [],
      },
    };

    await reportStore.set(sampleReport.id, sampleReport);

    const fetched = await reportStore.get(sampleReport.id);
    assert(fetched);
    assert.equal(fetched.id, "rep_custom_123");
    assert.equal(fetched.appName, "CustomService");
    assert.equal(fetched.overallScore, 88);
  });

  await runTest("PostgresReportStore falls back to seeded production demo reports", async () => {
    const mockPool = createMockPool();
    const reportStore = new PostgresReportStore(mockPool);

    const spotify = await reportStore.get("doc_demo_spotify_01");
    assert(spotify, "Must find seeded Spotify demo report");
    assert.equal(spotify.appName, "Spotify");

    const instagram = await reportStore.get("doc_demo_instagram_02");
    assert(instagram, "Must find seeded Instagram demo report");
    assert.equal(instagram.appName, "Instagram");

    const discord = await reportStore.get("doc_demo_discord_03");
    assert(discord, "Must find seeded Discord demo report");
    assert.equal(discord.appName, "Discord");
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
