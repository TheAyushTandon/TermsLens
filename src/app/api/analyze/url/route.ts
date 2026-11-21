import { NextResponse } from "next/server.js";
import { jobStore } from "../../../../lib/job-store.ts";
import {
  safeFetchUrl,
  SafeUrlError,
  type SafeFetchOptions,
} from "../../../../lib/safe-url-fetcher.ts";
import {
  executeTextAnalysisJob,
  activeJobPromises,
} from "../../../../services/analysis-job-runner.ts";
import type {
  DocumentType,
  SubmitAnalysisResponse,
  ApiErrorResponse,
} from "../../../../types/index.ts";

/**
 * Core handler for URL policy analysis.
 * Exported separately to allow injecting test options (mock fetch, mock DNS) in integration test suites.
 */
export async function handleAnalyzeUrlRequest(
  request: Request,
  injectedOptions?: SafeFetchOptions
): Promise<NextResponse> {
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

    const { url, appName, documentType } = body;

    // Validate appName
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

    // Validate url
    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_URL",
            message: "Missing or invalid 'url'.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    // Fetch and extract webpage policy content safely
    let fetched;
    try {
      fetched = await safeFetchUrl(url.trim(), injectedOptions);
    } catch (fetchErr: unknown) {
      if (fetchErr instanceof SafeUrlError) {
        return NextResponse.json<ApiErrorResponse>(
          {
            success: false,
            error: {
              code: fetchErr.code,
              message: fetchErr.message,
              stage: "PREPROCESSING",
              details: fetchErr.remediation
                ? { remediation: fetchErr.remediation }
                : undefined,
            },
          },
          { status: fetchErr.statusCode }
        );
      }

      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "EXTRACTION_FAILED",
            message: `Could not extract readable policy text from URL: ${msg}`,
            stage: "PREPROCESSING",
            details: {
              remediation:
                "Try copying and pasting the policy text directly into the Paste Text tab.",
            },
          },
        },
        { status: 422 }
      );
    }

    // Validate documentType
    const validDocType: DocumentType =
      documentType === "privacy_policy" ||
      documentType === "terms_of_service" ||
      documentType === "cookie_policy" ||
      documentType === "acceptable_use"
        ? documentType
        : "terms_of_service";

    // Generate unique job and report identifiers
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const jobId = `job_${timestamp}_${randomSuffix}`;
    const reportId = `rep_${timestamp}_${randomSuffix}`;
    const createdAt = new Date().toISOString();

    // Initialize job record
    jobStore.set(jobId, {
      jobId,
      reportId,
      appName: appName.trim(),
      documentType: validDocType,
      status: "queued",
      currentStage: "PREPROCESSING",
      message: "Website policy accepted for processing.",
      createdAt,
    });

    // Dispatch background analysis job
    const jobPromise = executeTextAnalysisJob({
      jobId,
      reportId,
      text: fetched.text,
      appName: appName.trim(),
      documentType: validDocType,
      documentTitle: fetched.documentTitle,
    })
      .catch((err) => {
        console.error(`[analyze/url] Background job ${jobId} failed:`, err);
      })
      .finally(() => {
        activeJobPromises.delete(jobId);
      });

    activeJobPromises.set(jobId, jobPromise);

    const responsePayload: SubmitAnalysisResponse = {
      success: true,
      jobId,
      reportId,
      status: "queued",
      appName: appName.trim(),
      documentType: validDocType,
      createdAt,
      currentStage: "PREPROCESSING",
      message: "Website policy accepted for processing.",
      links: {
        statusUrl: `/api/analyze/status/${jobId}`,
        reportUrl: `/api/reports/${reportId}`,
      },
    };

    return NextResponse.json(responsePayload, { status: 202 });
  } catch (fatalErr: unknown) {
    const errorMsg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr);
    return NextResponse.json<ApiErrorResponse>(
      {
        success: false,
        error: {
          code: "SCHEMA_VALIDATION_FAILED",
          message: `Unexpected server error during URL processing: ${errorMsg}`,
          stage: "PREPROCESSING",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Standard Next.js route handler for POST /api/analyze/url.
 */
export async function POST(request: Request): Promise<Response> {
  return handleAnalyzeUrlRequest(request);
}
