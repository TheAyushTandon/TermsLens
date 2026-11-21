import { NextResponse } from "next/server.js";
import { jobStore } from "../../../../lib/job-store.ts";
import {
  extractTextFromFile,
  DocumentExtractionError,
} from "../../../../lib/document-extractor.ts";
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
    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_DOCUMENT",
            message: "Request must be a multipart/form-data payload containing a document file.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    const appName = formData.get("appName") as string | null;
    const documentType = formData.get("documentType") as string | null;

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

    if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_DOCUMENT",
            message: "A valid policy document file is required.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    const validDocumentTypes: DocumentType[] = [
      "terms_of_service",
      "privacy_policy",
      "eula",
      "subscription_agreement",
      "other",
    ];

    const docType: DocumentType =
      documentType && validDocumentTypes.includes(documentType as DocumentType)
        ? (documentType as DocumentType)
        : "terms_of_service";

    // 1. Read binary arrayBuffer safely
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Perform format validation and text extraction
    let extracted: { text: string; fileType: string };
    try {
      extracted = await extractTextFromFile(file.name, buffer, file.type);
    } catch (err: unknown) {
      if (err instanceof DocumentExtractionError) {
        return NextResponse.json<ApiErrorResponse>(
          {
            success: false,
            error: {
              code: err.code,
              message: err.message,
              stage: "PREPROCESSING",
            },
          },
          { status: err.httpStatus }
        );
      }

      const msg = err instanceof Error ? err.message : "Document extraction failed.";
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "EXTRACTION_FAILED",
            message: msg,
            stage: "PREPROCESSING",
          },
        },
        { status: 422 }
      );
    }

    // 3. Generate unique job and report IDs
    const cleanApp = appName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") || "document";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const jobId = `job_live_${cleanApp}_${timestamp}_${randomSuffix}`;
    const reportId = `rep_live_${cleanApp}_${timestamp}_${randomSuffix}`;
    const nowIso = new Date().toISOString();

    // 4. Initialize job state in jobStore
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

    // 5. Dispatch the real asynchronous P01-P05 pipeline
    const jobPromise = executeTextAnalysisJob({
      jobId,
      reportId,
      text: extracted.text,
      appName: appName.trim(),
      documentType: docType,
    });
    activeJobPromises.set(jobId, jobPromise);

    // 6. Return immediate 202 Accepted submission response conforming to contract
    const responsePayload: SubmitAnalysisResponse = {
      success: true,
      jobId,
      reportId,
      status: "queued",
      appName: appName.trim(),
      documentType: docType,
      createdAt: nowIso,
      currentStage: "PREPROCESSING",
      message: "Document accepted for processing.",
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
