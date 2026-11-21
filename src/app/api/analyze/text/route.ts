import { NextResponse } from "next/server.js";
import { jobStore } from "../../../../lib/job-store.ts";
import { validatePolicyInput } from "../../../../lib/segmentation.ts";
import {
  executeTextAnalysisJob,
  activeJobPromises,
} from "../../../../services/analysis-job-runner.ts";
import type {
  DocumentType,
  SubmitAnalysisResponse,
  ApiErrorResponse,
} from "../../../../types/index.ts";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_REQUEST_BODY",
            message: "Request body must be a valid JSON object.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    const { text, appName, documentType } = body;

    if (!appName || typeof appName !== "string" || !appName.trim()) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_APP_NAME",
            message: "Missing or invalid 'appName'.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "EXTRACTION_FAILED",
            message: "Document text is required and cannot be empty.",
            stage: "PREPROCESSING",
          },
        },
        { status: 422 }
      );
    }

    const val = validatePolicyInput(text);
    if (!val.isValid) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "EXTRACTION_FAILED",
            message: val.error || "Invalid document text.",
            stage: "PREPROCESSING",
          },
        },
        { status: 422 }
      );
    }

    const validDocumentTypes: DocumentType[] = [
      "terms_of_service",
      "privacy_policy",
      "eula",
      "subscription_agreement",
      "other",
    ];

    const docType: DocumentType = validDocumentTypes.includes(documentType)
      ? documentType
      : "terms_of_service";

    const cleanApp = appName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") || "policy";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const jobId = `job_live_${cleanApp}_${timestamp}_${randomSuffix}`;
    const reportId = `rep_live_${cleanApp}_${timestamp}_${randomSuffix}`;
    const nowIso = new Date().toISOString();

    // 1. Initialize persistent state in jobStore
    jobStore.set(jobId, {
      jobId,
      reportId,
      appName: appName.trim(),
      documentType: docType,
      status: "queued",
      currentStage: "QUEUED",
      message: "Document received and queued for ingestion.",
      createdAt: nowIso,
      reportUrl: `/api/reports/${reportId}`,
    });

    // 2. Dispatch the real asynchronous P01-P05 pipeline
    const jobPromise = executeTextAnalysisJob({
      jobId,
      reportId,
      text,
      appName: appName.trim(),
      documentType: docType,
    });
    activeJobPromises.set(jobId, jobPromise);

    // 3. Return immediate 202 Accepted submission response conforming to contract
    const responsePayload: SubmitAnalysisResponse = {
      success: true,
      jobId,
      reportId,
      status: "queued",
      appName: appName.trim(),
      documentType: docType,
      createdAt: nowIso,
      currentStage: "PREPROCESSING",
      message: "Document received and queued for ingestion",
      links: {
        statusUrl: `/api/analyze/status/${jobId}`,
        reportUrl: `/api/reports/${reportId}`,
      },
    };

    return NextResponse.json(responsePayload, { status: 202 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred during document submission.";
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
        },
      },
      { status: 500 }
    );
  }
}
