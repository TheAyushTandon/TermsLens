import { NextResponse } from "next/server";
import { extractClausesP01 } from "@/services/p01-clause-extraction";
import type { DocumentType } from "@/types/index";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { rawText, segments, appName, documentType, promptVersion, options } = body;

    if (!appName || typeof appName !== "string" || !appName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_APP_NAME",
            message: "Missing or invalid 'appName'.",
            stage: "P01_CLAUSE_EXTRACTION",
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

    const docType: DocumentType = validDocumentTypes.includes(documentType)
      ? documentType
      : "terms_of_service";

    if (!rawText && (!segments || !Array.isArray(segments) || segments.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_DOCUMENT",
            message: "Either 'rawText' (string) or 'segments' (array) must be provided.",
            stage: "P01_CLAUSE_EXTRACTION",
          },
        },
        { status: 400 }
      );
    }

    const result = await extractClausesP01(
      {
        rawText,
        segments,
        appName: appName.trim(),
        documentType: docType,
      },
      {
        promptVersion,
        strictVerbatimCheck: options?.strictVerbatimCheck ?? true,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "P01_EXTRACTION_FAILED",
            message: result.error,
            stage: "P01_CLAUSE_EXTRACTION",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stage: "P01_CLAUSE_EXTRACTION",
        data: result.data,
        metadata: result.metadata,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during clause extraction.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
          stage: "P01_CLAUSE_EXTRACTION",
        },
      },
      { status: 500 }
    );
  }
}
