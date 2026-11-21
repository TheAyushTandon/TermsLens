import fs from "fs";
import path from "path";
import type {
  DocumentType,
  ExtractedClause,
  ClauseExplanation,
  VerificationStatus,
  VerifiedClauseItem,
  P04_Output,
  P04_Result,
} from "../types/index.ts";
import { normalizeForComparison } from "../lib/segmentation.ts";
import {
  callGemini,
  extractJsonFromResponse,
  getGeminiModel,
  type GeminiConfig,
} from "../lib/gemini.ts";

export type P04PromptVersion = "v1" | "v2" | "v3";

export interface P04AuditItem {
  tempClauseId: string;
  originalClauseText: string;
  sectionHeading?: string;
  explanation: Partial<ClauseExplanation>;
  privacyFindings?: unknown[];
}

export interface P04VerificationOptions {
  promptVersion?: P04PromptVersion;
  geminiConfig?: GeminiConfig;
}

const PROMPT_PATHS: Record<P04PromptVersion, string> = {
  v1: path.join(process.cwd(), "prompts/v1/p04-evidence-verification.v1.md"),
  v2: path.join(process.cwd(), "prompts/experiments/refined-prompts/p04-evidence-verification.v2.md"),
  v3: path.join(process.cwd(), "prompts/experiments/refined-prompts/p04-evidence-verification.v3.md"),
};

/**
 * Loads the P04 prompt template for the given version.
 */
export function loadP04PromptTemplate(version: P04PromptVersion): string {
  const filePath = PROMPT_PATHS[version];
  if (!fs.existsSync(filePath)) {
    throw new Error(`P04 prompt template file not found at: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Deterministically checks whether exactQuote exists verbatim in originalClauseText.
 */
export function verifyQuoteVerbatimInClause(
  exactQuote: string,
  originalClauseText: string
): boolean {
  if (!exactQuote || !exactQuote.trim() || !originalClauseText || !originalClauseText.trim()) {
    return false;
  }
  const normQuote = normalizeForComparison(exactQuote);
  const normOriginal = normalizeForComparison(originalClauseText);
  return normOriginal.includes(normQuote);
}

/**
 * Checks for common critical hallucinations (e.g. invented 30-day opt-out windows, Delaware address).
 */
export function auditExplanationForKnownHallucinations(
  explanation: Partial<ClauseExplanation>,
  originalClauseText: string
): { hasHallucination: boolean; reason?: string } {
  const combinedText = [
    explanation.shortExplanation || "",
    explanation.plainLanguageExplanation || "",
    explanation.whyThisClauseMatters || "",
    ...(explanation.potentialUserImplications || []),
    explanation.actionableAdvice || "",
  ].join(" ").toLowerCase();

  const origLower = originalClauseText.toLowerCase();

  // Pattern 1: Invented 30-day window
  if (combinedText.includes("30 days") || combinedText.includes("30-day")) {
    if (!origLower.includes("30 days") && !origLower.includes("30-day") && !origLower.includes("thirty (30) days")) {
      return {
        hasHallucination: true,
        reason: "Explanation invents an unsupported 30-day deadline not present in original text.",
      };
    }
  }

  // Pattern 2: Invented postal address / mail opt-out
  if (combinedText.includes("mail a written") || combinedText.includes("delaware")) {
    if (!origLower.includes("mail") && !origLower.includes("delaware")) {
      return {
        hasHallucination: true,
        reason: "Explanation invents an unsupported mailing address or physical opt-out procedure.",
      };
    }
  }

  return { hasHallucination: false };
}

/**
 * Renders the P04 prompt with audit items.
 */
export function renderP04Prompt(
  version: P04PromptVersion,
  auditItems: P04AuditItem[],
  appName: string,
  documentType: DocumentType
): string {
  const template = loadP04PromptTemplate(version);
  const auditItemsJson = JSON.stringify(auditItems, null, 2);

  return template
    .replace(/\{\{appName\}\}/g, appName)
    .replace(/\{\{documentType\}\}/g, documentType)
    .replace(/\{\{auditItemsJson\}\}/g, auditItemsJson);
}

/**
 * Validates the raw JSON output and applies deterministic cross-checks against original source text.
 */
export function validateAndEnforceP04Output(
  raw: unknown,
  auditItems: P04AuditItem[]
): {
  isValid: boolean;
  output?: P04_Output;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { isValid: false, errors: ["P04 response is not a valid JSON object."] };
  }

  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.verifiedClauses)) {
    return { isValid: false, errors: ["P04 output missing 'verifiedClauses' array."] };
  }

  const auditMap = new Map<string, P04AuditItem>();
  for (const item of auditItems) {
    auditMap.set(item.tempClauseId, item);
  }

  const verifiedClauses: VerifiedClauseItem[] = [];
  const validStatuses: VerificationStatus[] = ["supported", "partially_supported", "unverified", "rejected"];

  let supportedCount = 0;
  let partiallySupportedCount = 0;
  let unverifiedCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < obj.verifiedClauses.length; i++) {
    const rawClause = obj.verifiedClauses[i] as Record<string, any>;
    if (!rawClause || typeof rawClause !== "object") {
      errors.push(`Verified clause at index ${i} is not an object.`);
      continue;
    }

    const tempClauseId = String(rawClause.tempClauseId || "");
    const auditItem = auditMap.get(tempClauseId);

    if (!auditItem) {
      errors.push(`Verified clause returned unknown or missing tempClauseId '${tempClauseId}'.`);
      continue;
    }

    let exactQuote = String(rawClause.evidence?.exactQuote || "");
    let highlightExcerpt = String(rawClause.evidence?.highlightExcerpt || "");
    let status: VerificationStatus = validStatuses.includes(rawClause.verification?.status)
      ? rawClause.verification.status
      : "unverified";
    let notes = String(rawClause.verification?.notes || "");

    // 1. Deterministic Verbatim Quote Verification
    const quoteMatches = verifyQuoteVerbatimInClause(exactQuote, auditItem.originalClauseText);
    let evidenceMatchesOriginal = quoteMatches;

    if (!quoteMatches) {
      evidenceMatchesOriginal = false;
      status = "rejected";
      notes = `Falsified Quote: Evidence quote does not match original clause text verbatim. Original excerpt: "${auditItem.originalClauseText.slice(0, 70)}..."`;
      exactQuote = auditItem.originalClauseText.slice(0, 150); // Fallback to real quote
    }

    // 2. Deterministic Hallucination Interception (e.g. invented 30-day deadlines)
    const hallucinationCheck = auditExplanationForKnownHallucinations(
      auditItem.explanation,
      auditItem.originalClauseText
    );
    if (hallucinationCheck.hasHallucination) {
      status = "rejected";
      notes = `Hallucination Intercepted: ${hallucinationCheck.reason}`;
    }

    if (!highlightExcerpt) {
      highlightExcerpt = exactQuote.slice(0, 60);
    }

    // Counts
    if (status === "supported") supportedCount++;
    else if (status === "partially_supported") partiallySupportedCount++;
    else if (status === "unverified") unverifiedCount++;
    else if (status === "rejected") rejectedCount++;

    verifiedClauses.push({
      tempClauseId,
      evidence: {
        exactQuote,
        highlightExcerpt,
      },
      verification: {
        status,
        reviewerType: "automated_pipeline",
        notes,
        verifiedAt: new Date().toISOString(),
        evidenceMatchesOriginal,
      },
    });
  }

  // Ensure all submitted audit items are accounted for
  for (const [id, item] of auditMap.entries()) {
    if (!verifiedClauses.some((v) => v.tempClauseId === id)) {
      unverifiedCount++;
      verifiedClauses.push({
        tempClauseId: id,
        evidence: {
          exactQuote: item.originalClauseText.slice(0, 100),
          highlightExcerpt: item.originalClauseText.slice(0, 50),
        },
        verification: {
          status: "unverified",
          reviewerType: "automated_pipeline",
          notes: "Verification failed to return result for this clause; marked unverified by automated pipeline.",
          verifiedAt: new Date().toISOString(),
          evidenceMatchesOriginal: true,
        },
      });
    }
  }

  const output: P04_Output = {
    verifiedClauses,
    verificationSummary: {
      totalVerified: verifiedClauses.length,
      supportedCount,
      partiallySupportedCount,
      unverifiedCount,
      rejectedCount,
      methodologyDescription:
        "Dual-layer verification combining deterministic substring grounding checks with adversarial LLM verification auditing obligations, unstated deadlines, and exception preservation.",
    },
  };

  return {
    isValid: errors.length === 0,
    output,
    errors,
  };
}

/**
 * Core P04 Evidence Verification service function.
 */
export async function verifyEvidenceP04(
  input: {
    clauses?: ExtractedClause[];
    explanations?: ClauseExplanation[];
    auditItems?: P04AuditItem[];
    appName: string;
    documentType: DocumentType;
  },
  options?: P04VerificationOptions
): Promise<P04_Result> {
  const startTime = Date.now();
  const version: P04PromptVersion =
    options?.promptVersion ||
    (process.env.P04_PROMPT_VERSION as P04PromptVersion) ||
    "v3";

  try {
    // 1. Build audit items
    let auditItems: P04AuditItem[] = [];

    if (input.auditItems && input.auditItems.length > 0) {
      auditItems = input.auditItems;
    } else if (input.clauses && input.clauses.length > 0) {
      const expMap = new Map<string, ClauseExplanation>();
      if (input.explanations) {
        for (const exp of input.explanations) {
          expMap.set(exp.tempClauseId, exp);
        }
      }

      auditItems = input.clauses.map((c) => ({
        tempClauseId: c.tempClauseId,
        originalClauseText: c.originalClauseText,
        sectionHeading: c.sectionHeading,
        explanation: expMap.get(c.tempClauseId) || {
          shortExplanation: c.operativeSummary,
        },
      }));
    } else {
      return {
        success: false,
        error: "No clauses or auditItems provided to verify.",
      };
    }

    if (auditItems.length === 0) {
      return {
        success: false,
        error: "Audit list is empty.",
      };
    }

    // 2. Render Prompt
    const prompt = renderP04Prompt(version, auditItems, input.appName, input.documentType);

    // 3. Call Gemini
    const rawResponse = await callGemini(
      prompt,
      {
        temperature: 0.1, // low temperature for strict adversarial audit
        responseMimeType: "application/json",
      },
      options?.geminiConfig
    );

    // 4. Parse & Validate
    const parsedJson = extractJsonFromResponse(rawResponse);
    const validated = validateAndEnforceP04Output(parsedJson, auditItems);

    if (!validated.isValid || !validated.output) {
      return {
        success: false,
        error: `LLM verification output failed schema validation: ${validated.errors.join("; ")}`,
      };
    }

    const durationMs = Date.now() - startTime;
    const model = options?.geminiConfig?.model || getGeminiModel();

    // Calculate quote match rate
    const matches = validated.output.verifiedClauses.filter(
      (c) => c.verification.evidenceMatchesOriginal
    ).length;
    const deterministicQuoteMatchRate =
      validated.output.verifiedClauses.length > 0 ? matches / validated.output.verifiedClauses.length : 1;

    return {
      success: true,
      data: validated.output,
      metadata: {
        model,
        promptVersion: version,
        durationMs,
        clausesAudited: validated.output.verifiedClauses.length,
        deterministicQuoteMatchRate,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during P04 evidence verification.";
    return {
      success: false,
      error: message,
    };
  }
}
