import { NextResponse, after } from "next/server.js";
import { jobStore } from "../../../../lib/job-store.ts";
import { isQueueConfigured, enqueueAnalysisJob } from "../../../../lib/queue.ts";
import {
  safeFetchUrl,
  SafeUrlError,
  type SafeFetchOptions,
} from "../../../../lib/safe-url-fetcher.ts";
import {
  executeTextAnalysisJob,
  activeJobPromises,
} from "../../../../services/analysis-job-runner.ts";
import { processAnalysisJob } from "../../../../workers/analysis-worker.ts";
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

    // Validate URL string presence
    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json<ApiErrorResponse>(
        {
          success: false,
          error: {
            code: "INVALID_URL",
            message: "A valid 'url' string is required.",
            stage: "PREPROCESSING",
          },
        },
        { status: 400 }
      );
    }

    // Validate appName presence
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

    // Validate and fetch webpage safely with SSRF protections
    let fetched: { text: string; documentTitle?: string };
    try {
      fetched = await safeFetchUrl(url.trim(), injectedOptions);
    } catch (err: unknown) {
      if (err instanceof SafeUrlError) {
        return NextResponse.json<ApiErrorResponse>(
          {
            success: false,
            error: {
              code: err.code as any,
              message: err.message,
              stage: "PREPROCESSING",
              details: {
                remediation:
                  err.code === "EXTRACTION_FAILED"
                    ? "Try copying and pasting the policy text directly into the Paste Text tab."
                    : undefined,
              },
            },
          },
          { status: err.statusCode }
        );
      }

      const msg = err instanceof Error ? err.message : String(err);
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
    await jobStore.set(jobId, {
      jobId,
      reportId,
      appName: appName.trim(),
      documentType: validDocType,
      status: "queued",
      currentStage: "PREPROCESSING",
      message: "Website policy accepted for processing.",
      documentText: fetched.text,
      documentTitle: fetched.documentTitle,
      createdAt,
      reportUrl: `/api/reports/${reportId}`,
    });

    // Dispatch background analysis job via queue if configured; otherwise in-process runner
    if (isQueueConfigured()) {
      await enqueueAnalysisJob({ jobId, reportId });

      // In serverless environments (e.g. Vercel), schedule asynchronous execution
      // using Next.js after() to process the pipeline within the function lifecycle.
      if (process.env.VERCEL || process.env.ENABLE_SERVERLESS_WORKER === "true") {
        try {
          after(async () => {
            await processAnalysisJob({ jobId, reportId });
          });
        } catch {
          // Ignored outside Next.js request scope
        }
      }
    } else {
      const jobPromise = executeTextAnalysisJob({
        jobId,
        reportId,
        text: fetched.text,
        appName: appName.trim(),
        documentType: validDocType,
        documentTitle: fetched.documentTitle,
      })
        .catch((err) => {
          console.error(`[analyze/url] Background job ${jobId} failed:`, err.message);
        })
        .finally(() => {
          activeJobPromises.delete(jobId);
        });

      activeJobPromises.set(jobId, jobPromise);
    }

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
