import { jobStore, type AnalysisJobRecord } from "../lib/job-store.ts";
import { reportStore } from "../lib/report-store.ts";
import { runFullPolicyAnalysisPipeline } from "./p05-final-report-generation.ts";
import type {
  DocumentType,
  PipelineStage,
  AnalysisReport,
  ApiError,
} from "../types/index.ts";

/**
 * In-memory map of active asynchronous pipeline executions.
 * In a production architecture with persistent queues, this would be backed by Redis / BullMQ / Celery.
 */
export const activeJobPromises = new Map<string, Promise<void>>();

/**
 * Checks whether an in-memory job has been cancelled.
 */
export function isJobCancelled(jobId: string): boolean {
  const job = jobStore.get(jobId);
  return job?.status === "cancelled" || job?.currentStage === "CANCELLED";
}

/**
 * Maps stage names to descriptive user-facing status messages.
 */
export function getStageDescription(stage: PipelineStage): string {
  switch (stage) {
    case "QUEUED":
      return "Document received and queued for ingestion.";
    case "PREPROCESSING":
      return "Preprocessing document and segmenting policy provisions.";
    case "P01_CLAUSE_EXTRACTION":
      return "Extracting operative legal clauses from document text.";
    case "P02_PLAIN_LANGUAGE_EXPLANATION":
      return "Translating clauses into plain-language consumer explanations.";
    case "P03_RISK_AND_PRIVACY_ANALYSIS":
      return "Evaluating consumer risk levels and privacy implications.";
    case "P04_EVIDENCE_VERIFICATION":
      return "Auditing claims against source text for verbatim accuracy.";
    case "P05_FINAL_REPORT_GENERATION":
      return "Synthesizing executive summary and assembling final report.";
    case "COMPLETED":
      return "Analysis completed successfully.";
    case "FAILED":
      return "Analysis pipeline execution failed.";
    case "CANCELLED":
      return "Analysis cancelled by user.";
    default:
      return `Executing ${stage}...`;
  }
}

/**
 * Parses failure messages to pinpoint the exact pipeline stage where failure occurred.
 */
export function determineFailingStage(
  errMsg: string,
  lastActiveStage: PipelineStage
): PipelineStage {
  const lower = errMsg.toLowerCase();
  if (lower.includes("stage p01") || lower.includes("clause extraction")) {
    return "P01_CLAUSE_EXTRACTION";
  }
  if (lower.includes("stage p02") || lower.includes("plain-language explanation")) {
    return "P02_PLAIN_LANGUAGE_EXPLANATION";
  }
  if (lower.includes("stage p03") || lower.includes("risk and privacy")) {
    return "P03_RISK_AND_PRIVACY_ANALYSIS";
  }
  if (lower.includes("stage p04") || lower.includes("evidence verification")) {
    return "P04_EVIDENCE_VERIFICATION";
  }
  if (lower.includes("stage p05") || lower.includes("final report generation") || lower.includes("synthesis")) {
    return "P05_FINAL_REPORT_GENERATION";
  }
  return lastActiveStage;
}

/**
 * Executes the full P01-P05 pipeline for a submitted text policy asynchronously,
 * updating the in-memory jobStore through discrete lifecycle stages.
 */
export async function executeTextAnalysisJob(params: {
  jobId: string;
  reportId: string;
  text: string;
  appName: string;
  documentType: DocumentType;
  documentTitle?: string;
}): Promise<void> {
  const { jobId, reportId, text, appName, documentType, documentTitle } = params;

  // 1. Transition to PREPROCESSING
  const initialJob = jobStore.get(jobId);
  if (!initialJob || isJobCancelled(jobId)) {
    return;
  }

  jobStore.set(jobId, {
    ...initialJob,
    status: "processing",
    currentStage: "PREPROCESSING",
    message: getStageDescription("PREPROCESSING"),
  });

  let currentActiveStage: PipelineStage = "PREPROCESSING";

  try {
    if (isJobCancelled(jobId)) {
      return;
    }

    const result = await runFullPolicyAnalysisPipeline(
      {
        rawText: text,
        appName,
        documentType,
        documentTitle: documentTitle || `${appName} Terms of Service`,
      },
      {
        reportId,
        isCancelled: () => isJobCancelled(jobId),
        onStageTransition: (stage: PipelineStage) => {
          if (isJobCancelled(jobId)) return;
          currentActiveStage = stage;
          const currentJob = jobStore.get(jobId);
          if (currentJob && currentJob.status !== "cancelled") {
            jobStore.set(jobId, {
              ...currentJob,
              status: stage === "COMPLETED" ? "completed" : "processing",
              currentStage: stage,
              message: getStageDescription(stage),
              ...(stage === "COMPLETED" ? { completedAt: new Date().toISOString() } : {}),
            });
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
      const currentJob = jobStore.get(jobId);
      if (currentJob && currentJob.status !== "cancelled") {
        jobStore.set(jobId, {
          ...currentJob,
          status: "failed",
          currentStage: "FAILED",
          message: errorMsg,
          error: {
            code: "PIPELINE_EXECUTION_FAILED",
            message: errorMsg,
            stage: failingStage,
          },
        });
      }
      return;
    }

    // Success: report is stored in reportStore by runFullPolicyAnalysisPipeline
    const currentJob = jobStore.get(jobId);
    if (currentJob && currentJob.status !== "cancelled") {
      jobStore.set(jobId, {
        ...currentJob,
        status: "completed",
        currentStage: "COMPLETED",
        message: getStageDescription("COMPLETED"),
        completedAt: new Date().toISOString(),
        reportUrl: `/api/reports/${result.data.id || reportId}`,
      });
    }
  } catch (err: unknown) {
    if (isJobCancelled(jobId)) return;

    const errorMsg = err instanceof Error ? err.message : String(err);
    const failingStage = determineFailingStage(errorMsg, currentActiveStage);
    const currentJob = jobStore.get(jobId);
    if (currentJob && currentJob.status !== "cancelled") {
      jobStore.set(jobId, {
        ...currentJob,
        status: "failed",
        currentStage: "FAILED",
        message: errorMsg,
        error: {
          code: "INTERNAL_PIPELINE_ERROR",
          message: errorMsg,
          stage: failingStage,
        },
      });
    }
  } finally {
    activeJobPromises.delete(jobId);
  }
}

/**
 * Helper for testing and synchronous awaiting of active analysis jobs.
 */
export async function waitForJob(
  jobId: string,
  timeoutMs: number = 10000,
  pollIntervalMs: number = 50
): Promise<AnalysisJobRecord> {
  const startTime = Date.now();

  // If a promise is registered in activeJobPromises, await it directly
  const activePromise = activeJobPromises.get(jobId);
  if (activePromise) {
    try {
      await Promise.race([
        activePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout waiting for job ${jobId}`)), timeoutMs)
        ),
      ]);
    } catch {
      // Continue to check store status
    }
  }

  while (Date.now() - startTime < timeoutMs) {
    const job = jobStore.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in store.`);
    }

    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled" ||
      job.currentStage === "COMPLETED" ||
      job.currentStage === "FAILED" ||
      job.currentStage === "CANCELLED"
    ) {
      return job;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  const finalJob = jobStore.get(jobId);
  if (!finalJob) {
    throw new Error(`Job ${jobId} timed out and was not found.`);
  }
  return finalJob;
}
