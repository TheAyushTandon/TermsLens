"use client";

import * as React from "react";
import type {
  AnalysisJobState,
  PipelineStage,
  AnalysisReport,
  DocumentType,
  AnalysisStatus,
} from "../types/index.ts";
import { analysisService } from "../services/analysis-service.ts";

export interface UseAnalysisJobReturn {
  jobState: AnalysisJobState;
  currentStage: PipelineStage | null;
  stageMessage: string | null;
  jobId: string | null;
  reportId: string | null;
  report: AnalysisReport | null;
  error: string | null;
  isProcessing: boolean;
  startFileJob: (file: File, appName: string, documentType: DocumentType) => Promise<void>;
  startTextJob: (text: string, appName: string, documentType: DocumentType) => Promise<void>;
  startUrlJob: (url: string, appName: string, documentType: DocumentType) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

/**
 * Maps backend pipeline stage and status to discrete frontend job state.
 * Does not fabricate progress percentages.
 */
function mapStageToJobState(stage: PipelineStage, status: AnalysisStatus): AnalysisJobState {
  if (status === "cancelled" || stage === "CANCELLED") return "cancelled";
  if (status === "failed" || stage === "FAILED") return "failed";
  if (status === "completed" || stage === "COMPLETED") return "completed";
  if (status === "queued" || stage === "QUEUED") return "queued";

  switch (stage) {
    case "PREPROCESSING":
      return "preprocessing";
    case "P01_CLAUSE_EXTRACTION":
      return "p01_clause_extraction";
    case "P02_PLAIN_LANGUAGE_EXPLANATION":
      return "p02_plain_language_explanation";
    case "P03_RISK_AND_PRIVACY_ANALYSIS":
      return "p03_risk_and_privacy_analysis";
    case "P04_EVIDENCE_VERIFICATION":
      return "p04_evidence_verification";
    case "P05_FINAL_REPORT_GENERATION":
      return "p05_final_report_generation";
    default:
      return "preprocessing";
  }
}

/**
 * Reusable React hook for orchestrating document analysis jobs.
 * Enforces discrete stage tracking, exponential polling backoff,
 * AbortController signal handling, and clean unmount teardown.
 */
export function useAnalysisJob(): UseAnalysisJobReturn {
  const [jobState, setJobState] = React.useState<AnalysisJobState>("idle");
  const [currentStage, setCurrentStage] = React.useState<PipelineStage | null>(null);
  const [stageMessage, setStageMessage] = React.useState<string | null>(null);
  const [jobId, setJobId] = React.useState<string | null>(null);
  const [reportId, setReportId] = React.useState<string | null>(null);
  const [report, setReport] = React.useState<AnalysisReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const abortControllerRef = React.useRef<AbortController | null>(null);
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const activeJobIdRef = React.useRef<string | null>(null);
  const isMountedRef = React.useRef(true);

  // Clean up polling and abort network calls on unmount
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const isProcessing =
    jobState !== "idle" &&
    jobState !== "completed" &&
    jobState !== "failed" &&
    jobState !== "cancelled";

  /**
   * Recursive polling scheduler with exponential backoff and jitter.
   * Max 60 attempts (~150 seconds).
   */
  const schedulePoll = React.useCallback(
    (targetJobId: string, targetReportId: string, attempt: number) => {
      if (!isMountedRef.current || targetJobId !== activeJobIdRef.current) {
        return;
      }

      if (attempt > 60) {
        if (isMountedRef.current) {
          setJobState("failed");
          setError("Analysis timed out. Please check back later in My Reports.");
        }
        return;
      }

      // Exponential backoff: 2s -> 2.5s -> 3.1s ... capped at 5s (+/- 250ms jitter)
      const baseDelay = Math.min(5000, Math.floor(2000 * Math.pow(1.25, attempt)));
      const jitter = Math.floor(Math.random() * 500) - 250;
      const delay = Math.max(1500, baseDelay + jitter);

      pollingTimeoutRef.current = setTimeout(async () => {
        if (!isMountedRef.current || targetJobId !== activeJobIdRef.current) {
          return;
        }

        try {
          const status = await analysisService.getJobStatus(
            targetJobId,
            abortControllerRef.current?.signal
          );

          if (!isMountedRef.current || targetJobId !== activeJobIdRef.current) {
            return;
          }

          setCurrentStage(status.currentStage);
          setStageMessage(status.message);
          setJobState(mapStageToJobState(status.currentStage, status.status));

          if (status.status === "completed") {
            try {
              const fullReport = await analysisService.getReportById(
                targetReportId,
                abortControllerRef.current?.signal
              );
              if (isMountedRef.current) {
                setReport(fullReport);
                setJobState("completed");
              }
            } catch (reportErr: any) {
              if (isMountedRef.current) {
                setJobState("failed");
                setError(reportErr?.message || "Failed to retrieve the completed analysis report.");
              }
            }
          } else if (status.status === "failed") {
            if (isMountedRef.current) {
              setJobState("failed");
              setError(status.error?.message || "Document analysis failed on the server.");
            }
          } else {
            // Continue polling
            schedulePoll(targetJobId, targetReportId, attempt + 1);
          }
        } catch (pollErr: any) {
          if (!isMountedRef.current || pollErr?.name === "AbortError") {
            return;
          }

          // On transient network failure, retry up to attempt limit
          if (attempt < 60) {
            schedulePoll(targetJobId, targetReportId, attempt + 1);
          } else {
            if (isMountedRef.current) {
              setJobState("failed");
              setError("Network connection to analysis service lost. Please retry.");
            }
          }
        }
      }, delay);
    },
    []
  );

  const startJob = React.useCallback(
    async (
      submitAction: () => Promise<{
        jobId: string;
        reportId: string;
        currentStage: PipelineStage;
        message: string;
        status: AnalysisStatus;
      }>
    ) => {
      // Abort prior execution
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setJobState("uploading");
      setError(null);
      setReport(null);
      setCurrentStage("PREPROCESSING");
      setStageMessage("Submitting document to intelligence pipeline...");

      try {
        const response = await submitAction();

        if (!isMountedRef.current) return;

        setJobId(response.jobId);
        setReportId(response.reportId);
        activeJobIdRef.current = response.jobId;
        setCurrentStage(response.currentStage);
        setStageMessage(response.message);
        setJobState(mapStageToJobState(response.currentStage, response.status));

        // Begin polling
        schedulePoll(response.jobId, response.reportId, 0);
      } catch (submitErr: any) {
        if (!isMountedRef.current || submitErr?.name === "AbortError") {
          return;
        }
        setJobState("failed");
        setError(submitErr?.message || "Failed to submit document for analysis.");
      }
    },
    [schedulePoll]
  );

  const startFileJob = React.useCallback(
    async (file: File, appName: string, documentType: DocumentType) => {
      return startJob(() => analysisService.submitFile(file, appName, documentType));
    },
    [startJob]
  );

  const startTextJob = React.useCallback(
    async (text: string, appName: string, documentType: DocumentType) => {
      return startJob(() => analysisService.submitText(text, appName, documentType));
    },
    [startJob]
  );

  const startUrlJob = React.useCallback(
    async (url: string, appName: string, documentType: DocumentType) => {
      return startJob(() => analysisService.submitUrl(url, appName, documentType));
    },
    [startJob]
  );

  const cancel = React.useCallback(async () => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentActiveJobId = activeJobIdRef.current;
    activeJobIdRef.current = null;

    if (currentActiveJobId) {
      try {
        await analysisService.cancelJob(currentActiveJobId);
      } catch {
        // Silently swallow cancellation network failures
      }
    }

    if (isMountedRef.current) {
      setJobState("cancelled");
      setStageMessage("Analysis cancelled by user.");
    }
  }, []);

  const reset = React.useCallback(() => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    activeJobIdRef.current = null;
    setJobState("idle");
    setCurrentStage(null);
    setStageMessage(null);
    setJobId(null);
    setReportId(null);
    setReport(null);
    setError(null);
  }, []);

  return {
    jobState,
    currentStage,
    stageMessage,
    jobId,
    reportId,
    report,
    error,
    isProcessing,
    startFileJob,
    startTextJob,
    startUrlJob,
    cancel,
    reset,
  };
}
