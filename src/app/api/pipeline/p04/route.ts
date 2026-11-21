import { NextResponse } from "next/server";
import { verifyEvidenceP04 } from "@/services/p04-evidence-verification";
import type { DocumentType } from "@/types/index";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { p01Output, p02Output, clauses, explanations, auditItems, appName, documentType, promptVersion, options } = body;

    if (!appName || typeof appName !== "string" || !appName.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_APP_NAME",
            message: "Missing or invalid 'appName'.",
            stage: "P04_EVIDENCE_VERIFICATION",
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

    // Gather clauses & explanations from either combined payload or individual inputs
    const clausesList = clauses || p01Output?.extractedClauses;
    const explanationsList = explanations || p02Output?.clauseExplanations;

    if (!auditItems && (!clausesList || clausesList.length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMPTY_AUDIT_DATA",
            message: "Must provide either 'auditItems', or 'clauses'/'p01Output' to audit.",
            stage: "P04_EVIDENCE_VERIFICATION",
          },
        },
        { status: 400 }
      );
    }

    const result = await verifyEvidenceP04(
      {
        clauses: clausesList,
        explanations: explanationsList,
        auditItems,
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
            code: "P04_VERIFICATION_FAILED",
            message: result.error,
            stage: "P04_EVIDENCE_VERIFICATION",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        stage: "P04_EVIDENCE_VERIFICATION",
        data: result.data,
        metadata: result.metadata,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during P04 verification.";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message,
          stage: "P04_EVIDENCE_VERIFICATION",
        },
      },
      { status: 500 }
    );
  }
}
