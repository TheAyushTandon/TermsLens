import { NextResponse } from "next/server";
import {
  generateReportP05,
  validateUpstreamPipelineOutputs,
} from "@/services/p05-final-report-generation";
import type { DocumentType } from "@/types/index";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      p01Output,
      p02Output,
      p03Output,
      p04Output,
      appName,
      documentType,
      documentTitle,
      promptVersion,
      options,
    } = body;

    // 1. Validate Application Name
    if (!appName || typeof appName !== "string" || !appName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_APP_NAME",
            message: "Missing or invalid 'appName'.",
            stage: "P05_FINAL_REPORT_GENERATION",
          },
        },
        { status: 400 }
      );
    }

    // 2. Validate Document Type
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

    // 3. Validate All Four Upstream Outputs
    const upstreamValidation = validateUpstreamPipelineOutputs(
      p01Output,
      p02Output,
      p03Output,
      p04Output
    );

    if (!upstreamValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_UPSTREAM_DATA",
            message: `Upstream validation failed: ${upstreamValidation.errors.join("; ")}`,
            stage: "P05_FINAL_REPORT_GENERATION",
            fieldErrors: {
              upstream: upstreamValidation.errors.join("; "),
            },
            details: {
              validationErrors: upstreamValidation.errors,
            },
          },
        },
        { status: 400 }
      );
    }

    // 4. Execute P05 Report Generation
    const result = await generateReportP05(
      {
        p01Output: upstreamValidation.p01!,
        p02Output: upstreamValidation.p02!,
        p03Output: upstreamValidation.p03!,
        p04Output: upstreamValidation.p04!,
        appName: appName.trim(),
        documentType: docType,
        documentTitle: typeof documentTitle === "string" && documentTitle.trim() ? documentTitle.trim() : undefined,
      },
      {
        promptVersion,
        geminiConfig: options?.geminiConfig,
        reportId: options?.reportId,
        isDemonstrationFixture: options?.isDemonstrationFixture ?? false,
      }
    );

    if (!result.success || !result.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "P05_GENERATION_FAILED",
            message: result.error || "Failed to generate final report.",
            stage: "P05_FINAL_REPORT_GENERATION",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stage: "P05_FINAL_REPORT_GENERATION",
        data: result.data,
        metadata: result.metadata,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during P05 final report generation.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
          stage: "P05_FINAL_REPORT_GENERATION",
        },
      },
      { status: 500 }
    );
  }
}
