import { NextResponse } from "next/server.js";
import { jobStore } from "../../../../../lib/job-store.ts";

export async function POST(
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

    if (job) {
      job.status = "cancelled";
      job.currentStage = "CANCELLED";
      job.message = "Analysis cancelled by user.";
      job.error = {
        code: "CANCELLED",
        message: "Analysis cancelled by user.",
        stage: "CANCELLED",
      };
      jobStore.set(cleanJobId, job);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Job cancelled successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while cancelling the job.";
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
