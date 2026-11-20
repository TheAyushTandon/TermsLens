import { NextResponse } from "next/server";
import { explainClausesP02 } from "@/services/p02-plain-language-explanation";
import type { DocumentType, ExtractedClause, P01_Output } from "@/types/index";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { p01Output, clauses, appName, documentType, promptVersion, options } = body;

    if (!appName || typeof appName !== "string" || !appName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_APP_NAME",
            message: "Missing or invalid 'appName'.",
            stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
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

    // Validate clauses or p01Output
    let clausesList: ExtractedClause[] | undefined = undefined;
    if (p01Output && Array.isArray((p01Output as P01_Output).extractedClauses)) {
      clausesList = (p01Output as P01_Output).extractedClauses;
    } else if (Array.isArray(clauses)) {
      clausesList = clauses;
    }

    if (!clausesList || clausesList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_CLAUSES",
            message: "Either 'p01Output.extractedClauses' or 'clauses' array must be provided and non-empty.",
            stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
          },
        },
        { status: 400 }
      );
    }

    const result = await explainClausesP02(
      {
        clauses: clausesList,
        appName: appName.trim(),
        documentType: docType,
      },
      {
        promptVersion,
        geminiConfig: options?.geminiConfig,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "P02_EXPLANATION_FAILED",
            message: result.error,
            stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
        data: result.data,
        metadata: result.metadata,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during P02 explanation.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
          stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
        },
      },
      { status: 500 }
    );
  }
}
