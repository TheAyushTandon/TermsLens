import { NextResponse } from "next/server.js";
import { reportStore } from "../../../../lib/report-store.ts";
import { getReportOrFallback } from "../../../../lib/mock-reports.ts";
import { validateAnalysisReport } from "../../../../services/analysis-service.ts";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_REPORT_ID",
            message: "Missing or invalid report identifier.",
          },
        },
        { status: 400 }
      );
    }

    const cleanId = decodeURIComponent(id.trim());

    // 1. Check report store for dynamically generated reports or seeded mock reports
    let report = await reportStore.get(cleanId);

    // 2. If not found in store, use fallback generator
    if (!report) {
      report = getReportOrFallback(cleanId);
    }

    // 3. Validate against AnalysisReport contract
    const validation = validateAnalysisReport(report);
    if (!validation.isValid || !validation.report) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CORRUPT_REPORT_DATA",
            message: `Report payload failed contract validation: ${validation.errors.join("; ")}`,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validation.report, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while retrieving the report.";
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
