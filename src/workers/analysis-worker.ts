#!/usr/bin/env node
/**
 * TermsLens Dedicated Background Worker Process.
 * Consumes policy-analysis jobs from pg-boss, coordinates P01-P05 pipeline stages,
 * persists checkpoint data after each stage, recovers interrupted jobs upon restart,
 * enforces idempotency, bounded retries, and supports graceful shutdown.
 */

import { getBoss, stopBoss, POLICY_ANALYSIS_QUEUE, processStrandedOutboxJobs, enqueueAnalysisJob } from "../lib/queue.ts";
import { jobStore } from "../lib/job-store.ts";
import { reportStore } from "../lib/report-store.ts";
import { runMigrations, closePool, isPostgresConfigured } from "../lib/db.ts";
import {
  runFullPolicyAnalysisPipeline,
  type PipelineCheckpointData,
} from "../services/p05-final-report-generation.ts";
import {
  getStageDescription,
  determineFailingStage,
  isJobCancelled,
} from "../services/analysis-job-runner.ts";
import type { PipelineStage } from "../types/index.ts";

function mapStageToDataKey(stage: PipelineStage): keyof PipelineCheckpointData | null {
  switch (stage) {
    case "P01_CLAUSE_EXTRACTION":
      return "p01Data";
    case "P02_PLAIN_LANGUAGE_EXPLANATION":
      return "p02Data";
    case "P03_RISK_AND_PRIVACY_ANALYSIS":
      return "p03Data";
    case "P04_EVIDENCE_VERIFICATION":
      return "p04Data";
    default:
      return null;
  }
}

/**
 * Executes a single policy analysis job with checkpoint recovery and stage-level updates.
 */
export async function processAnalysisJob(payload: { jobId: string; reportId: string }): Promise<void> {
  const { jobId, reportId } = payload;

  const job = await jobStore.get(jobId);
  if (!job) {
    console.warn(`[Worker] Job ${jobId} not found in database. Acknowledging and skipping.`);
    return;
  }

  // Idempotency: Protect against duplicate worker delivery
  if (job.status === "completed") {
    console.log(`[Worker] Job ${jobId} is already completed. Skipping redundant execution.`);
    return;
  }

  if (job.status === "cancelled") {
    console.log(`[Worker] Job ${jobId} was cancelled by user. Skipping execution.`);
    return;
  }

  if (!job.documentText || !job.documentText.trim()) {
    const errorMsg = "Job document text is missing or empty.";
    await jobStore.set(jobId, {
      ...job,
      status: "failed",
      currentStage: "FAILED",
      message: errorMsg,
      error: {
        code: "EXTRACTION_FAILED",
        message: errorMsg,
        stage: "PREPROCESSING",
      },
    });
    return;
  }

  // Transition to PREPROCESSING
  let currentActiveStage: PipelineStage = "PREPROCESSING";
  await jobStore.updateStage?.(jobId, "PREPROCESSING", "processing", getStageDescription("PREPROCESSING"));

  const checkpointData: PipelineCheckpointData = (job.stageData as any) || {};

  try {
    const result = await runFullPolicyAnalysisPipeline(
      {
        rawText: job.documentText,
        appName: job.appName,
        documentType: job.documentType,
        documentTitle: job.documentTitle,
      },
      {
        reportId,
        checkpointData,
        isCancelled: () => isJobCancelled(jobId),
        onStageTransition: async (stage: PipelineStage) => {
          if (isJobCancelled(jobId)) return;
          currentActiveStage = stage;
          await jobStore.updateStage?.(
            jobId,
            stage,
            stage === "COMPLETED" ? "completed" : "processing",
            getStageDescription(stage)
          );
        },
        onStageSuccess: async (stage: PipelineStage, data: unknown, completedStages: string[]) => {
          const key = mapStageToDataKey(stage);
          if (key) {
            await jobStore.updateStage?.(
              jobId,
              stage,
              "processing",
              getStageDescription(stage),
              { [key]: data },
              completedStages
            );
          }
        },
      }
    );

    if (isJobCancelled(jobId)) {
      return;
    }

    if (!result.success || !result.data) {
      const errorMsg = result.error || "Analysis pipeline execution failed.";
      const failingStage = determineFailingStage(errorMsg, currentActiveStage);
      await jobStore.set(jobId, {
        ...job,
        status: "failed",
        currentStage: "FAILED",
        message: errorMsg,
        error: {
          code: "PIPELINE_EXECUTION_FAILED",
          message: errorMsg,
          stage: failingStage,
        },
      });
      throw new Error(`Pipeline execution failed at ${failingStage}: ${errorMsg}`);
    }

    // Success: report is stored in reportStore by runFullPolicyAnalysisPipeline
    await jobStore.set(jobId, {
      ...job,
      status: "completed",
      currentStage: "COMPLETED",
      message: getStageDescription("COMPLETED"),
      completedAt: new Date().toISOString(),
      reportUrl: `/api/reports/${result.data.id || reportId}`,
    });

    console.log(`[Worker] Successfully completed job: ${jobId} (Report: ${reportId})`);
  } catch (err: unknown) {
    if (isJobCancelled(jobId)) return;

    const errorMsg = err instanceof Error ? err.message : String(err);
    const failingStage = determineFailingStage(errorMsg, currentActiveStage);

    await jobStore.set(jobId, {
      ...job,
      status: "failed",
      currentStage: "FAILED",
      message: errorMsg,
      error: {
        code: "INTERNAL_PIPELINE_ERROR",
        message: errorMsg,
        stage: failingStage,
      },
    });

    throw err;
  }
}

/**
 * Scans for interrupted/stranded jobs and re-enqueues them upon worker restart.
 */
export async function recoverUnfinishedJobs(): Promise<number> {
  if (!isPostgresConfigured()) return 0;

  try {
    const incomplete = await jobStore.getIncompleteJobs?.();
    if (!incomplete || incomplete.length === 0) return 0;

    let recovered = 0;
    for (const job of incomplete) {
      if (job.status === "cancelled") continue;
      try {
        await enqueueAnalysisJob({
          jobId: job.jobId,
          reportId: job.reportId,
        });
        recovered++;
      } catch (err: unknown) {
        console.warn(`[Worker Recovery] Failed to re-enqueue unfinished job ${job.jobId}:`, err);
      }
    }
    return recovered;
  } catch (err: unknown) {
    console.error("[Worker Recovery] Error during unfinished jobs recovery:", err);
    return 0;
  }
}

/**
 * Main worker entrypoint.
 */
async function startWorker() {
  console.log("=======================================================");
  console.log("TermsLens Policy Analysis Dedicated Background Worker");
  console.log("=======================================================\n");

  if (!process.env.DATABASE_URL) {
    if (process.env.NODE_ENV === "production") {
      console.error("FATAL: DATABASE_URL is missing in production environment. Worker cannot start.");
      process.exit(1);
    } else {
      console.warn("WARNING: DATABASE_URL not set. Running in offline/standby mode.");
      return;
    }
  }

  const concurrency = Number(process.env.WORKER_CONCURRENCY || 3);
  console.log(`Starting worker with concurrency limit: ${concurrency}`);

  // 1. Ensure migrations are applied
  try {
    console.log("Running pending migrations...");
    const applied = await runMigrations();
    if (applied.length > 0) {
      console.log(`Applied ${applied.length} migration(s): ${applied.join(", ")}`);
    } else {
      console.log("Database schema up to date.");
    }
  } catch (err) {
    console.error("Migration check failed:", err);
    process.exit(1);
  }

  // 2. Recover stranded outbox jobs
  try {
    const outboxRecovered = await processStrandedOutboxJobs();
    if (outboxRecovered > 0) {
      console.log(`Recovered ${outboxRecovered} stranded outbox job(s).`);
    }
  } catch (err) {
    console.warn("Outbox recovery warning:", err);
  }

  // 3. Recover unfinished jobs from previous crashes
  try {
    const jobsRecovered = await recoverUnfinishedJobs();
    if (jobsRecovered > 0) {
      console.log(`Recovered and re-enqueued ${jobsRecovered} unfinished job(s).`);
    }
  } catch (err) {
    console.warn("Job recovery warning:", err);
  }

  // 4. Start pg-boss and subscribe to queue
  const boss = await getBoss();

  await boss.work(
    POLICY_ANALYSIS_QUEUE,
    {
      batchSize: concurrency,
    },
    async (jobs: any[]) => {
      for (const job of jobs) {
        await processAnalysisJob(job.data);
      }
    }
  );

  console.log(`Worker active and subscribed to queue '${POLICY_ANALYSIS_QUEUE}'. Waiting for jobs...`);

  // 5. Graceful Shutdown Handlers
  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);

    try {
      await stopBoss();
      await closePool();
      console.log("Worker stopped and database connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

// Only auto-start when invoked directly from CLI
if (process.argv[1] && process.argv[1].includes("analysis-worker")) {
  startWorker().catch((err) => {
    console.error("Worker fatal error:", err);
    process.exit(1);
  });
}
