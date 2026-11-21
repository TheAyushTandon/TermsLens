import { NextResponse } from "next/server.js";
import { jobStore } from "../../../../../lib/job-store.ts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> | { jobId: string } }
) {
  try {
    const params = await context.params;
    const { jobId } = params;

    if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_JOB_ID",
            message: "Missing or invalid job identifier.",
          },
        },
        { status: 400 }
      );
    }

    const cleanJobId = decodeURIComponent(jobId.trim());
    const job = jobStore.get(cleanJobId);

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "JOB_NOT_FOUND",
            message: "The requested analysis job was not found or has expired.",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        jobId: job.jobId,
        reportId: job.reportId,
        status: job.status,
        currentStage: job.currentStage,
        message: job.message,
        completedAt: job.completedAt,
        reportUrl: job.reportUrl,
        error: job.error,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while checking job status.";
    return NextResponse.json(
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
