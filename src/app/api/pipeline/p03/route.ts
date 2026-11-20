import { NextResponse } from "next/server";
import {
  analyzeP03,
  validateP01OutputForP03,
} from "@/services/p03-risk-privacy-analysis";
import type { DocumentType, P03PromptVersion } from "@/types/index";

const DOCUMENT_TYPES: DocumentType[] = [
  "terms_of_service",
  "privacy_policy",
  "eula",
  "subscription_agreement",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFailureStatus(error: string): { status: number; code: string } {
  if (error.includes("GEMINI_API_KEY is not configured")) {
    return { status: 503, code: "GEMINI_CREDENTIALS_MISSING" };
  }
  if (/rate limit exceeded \(429\)/i.test(error)) {
    return { status: 429, code: "GEMINI_RATE_LIMITED" };
  }
  if (
    error.startsWith("Gemini returned malformed JSON") ||
    error.startsWith("Gemini response failed P03 schema or evidence validation")
  ) {
    return { status: 502, code: "INVALID_GEMINI_RESPONSE" };
  }
  if (/fetch failed|network|ECONN|ETIMEDOUT|socket/i.test(error)) {
    return { status: 502, code: "GEMINI_NETWORK_ERROR" };
  }
  return { status: 502, code: "P03_ANALYSIS_FAILED" };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "Request body must be a JSON object." } },
      { status: 400 }
    );
  }

  if (typeof body.appName !== "string" || !body.appName.trim()) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_APP_NAME", message: "Missing or invalid 'appName'." } },
      { status: 400 }
    );
  }

  if (typeof body.documentType !== "string" || !DOCUMENT_TYPES.includes(body.documentType as DocumentType)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_DOCUMENT_TYPE", message: "Missing or invalid 'documentType'." } },
      { status: 400 }
    );
  }

  const p01P02Output = isRecord(body.p01P02Output) ? body.p01P02Output : undefined;
  const pipelineOutput = isRecord(body.pipelineOutput) ? body.pipelineOutput : undefined;
  const p01Candidate =
    body.p01Output ??
    p01P02Output?.p01 ??
    pipelineOutput?.p01 ??
    body.p01;
  const p01Validation = validateP01OutputForP03(p01Candidate);
  if (!p01Validation.isValid || !p01Validation.output) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_P01_OUTPUT",
          message: p01Validation.errors.join("; ") || "A valid P01 output is required.",
          stage: "P03_RISK_AND_PRIVACY_ANALYSIS",
        },
      },
      { status: 400 }
    );
  }

  const hasPolicyContext = Object.hasOwn(body, "policyContext");
  const policyContext = hasPolicyContext ? body.policyContext : body.rawText;
  if (policyContext !== undefined && typeof policyContext !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_POLICY_CONTEXT", message: "'policyContext' must be a string." },
      },
      { status: 400 }
    );
  }

  const options = isRecord(body.options) ? body.options : undefined;
  const requestedVersion = body.promptVersion ?? options?.promptVersion;
  if (
    requestedVersion !== undefined &&
    requestedVersion !== "v1" &&
    requestedVersion !== "v2" &&
    requestedVersion !== "v3"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_PROMPT_VERSION", message: "promptVersion must be v1, v2, or v3." },
      },
      { status: 400 }
    );
  }

  const result = await analyzeP03(
    {
      p01Output: p01Validation.output,
      policyContext,
      appName: body.appName.trim(),
      documentType: body.documentType as DocumentType,
    },
    { promptVersion: requestedVersion as P03PromptVersion | undefined }
  );

  if (!result.success || !result.data) {
    const error = result.error || "P03 analysis failed without an error message.";
    const failure = getFailureStatus(error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: failure.code,
          message: error,
          stage: "P03_RISK_AND_PRIVACY_ANALYSIS",
        },
      },
      { status: failure.status }
    );
  }

  return NextResponse.json(
    {
      success: true,
      stage: "P03_RISK_AND_PRIVACY_ANALYSIS",
      data: result.data,
      metadata: result.metadata,
    },
    { status: 200 }
  );
}
