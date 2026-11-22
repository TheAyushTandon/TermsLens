import fs from "fs";
import path from "path";
import type {
  DocumentType,
  ExtractedClause,
  P01_Output,
  P02_Output,
  P02_Result,
  ClauseExplanation,
  P01_P02_CombinedOutput,
} from "../types/index.ts";
import {
  callGemini,
  extractJsonFromResponse,
  getGeminiModel,
  type GeminiConfig,
} from "../lib/gemini.ts";
import { extractClausesP01, type P01ExtractionOptions } from "./p01-clause-extraction.ts";

export type P02PromptVersion = "v1" | "v2" | "v3";

export interface P02ExplanationOptions {
  promptVersion?: P02PromptVersion;
  geminiConfig?: GeminiConfig;
}

const PROMPT_PATHS: Record<P02PromptVersion, string> = {
  v1: path.join(process.cwd(), "prompts/v1/p02-plain-language-explanation.v1.md"),
  v2: path.join(process.cwd(), "prompts/experiments/refined-prompts/p02-plain-language-explanation.v2.md"),
  v3: path.join(process.cwd(), "prompts/experiments/refined-prompts/p02-plain-language-explanation.v3.md"),
};

/**
 * Loads the P02 prompt template for the given version.
 */
export function loadP02PromptTemplate(version: P02PromptVersion): string {
  const filePath = PROMPT_PATHS[version];
  if (!fs.existsSync(filePath)) {
    throw new Error(`P02 prompt template file not found at: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Renders the P02 prompt template with given input parameters.
 */
export function renderP02Prompt(
  version: P02PromptVersion,
  clauses: ExtractedClause[],
  appName: string,
  documentType: DocumentType
): string {
  const template = loadP02PromptTemplate(version);

  // Strip down clauses to essential fields for prompt compactness
  const clausesPayload = clauses.map((c) => ({
    tempClauseId: c.tempClauseId,
    sectionHeading: c.sectionHeading || "",
    originalClauseText: c.originalClauseText,
    operativeSummary: c.operativeSummary,
  }));

  const clausesJson = JSON.stringify(clausesPayload, null, 2);

  return template
    .replace(/\{\{appName\}\}/g, appName)
    .replace(/\{\{documentType\}\}/g, documentType)
    .replace(/\{\{clausesJson\}\}/g, clausesJson);
}

function normalizeClauseId(id: string): string {
  const trimmed = id.trim();
  const match = trimmed.match(/^clause_?(\d+)$/i);
  if (match) {
    return `clause_${match[1].padStart(3, "0")}`;
  }
  return trimmed;
}

/**
 * Validates raw JSON output against the P02_Output schema and verifies clause ID preservation.
 */
export function validateP02OutputSchema(
  raw: unknown,
  expectedClauseIds: string[]
): {
  isValid: boolean;
  output?: P02_Output;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || (typeof raw !== "object" && !Array.isArray(raw))) {
    return { isValid: false, errors: ["P02 output is not a valid JSON object or array."] };
  }

  let rawList: unknown[] | null = null;
  if (Array.isArray(raw)) {
    if (raw.length === 1 && raw[0] && typeof raw[0] === "object" && Array.isArray((raw[0] as any).clauseExplanations)) {
      rawList = (raw[0] as any).clauseExplanations;
    } else {
      rawList = raw;
    }
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.clauseExplanations)) {
      rawList = obj.clauseExplanations;
    } else if (Array.isArray(obj.explanations)) {
      rawList = obj.explanations;
    } else if (Array.isArray(obj.clauses)) {
      rawList = obj.clauses;
    } else if (Array.isArray(obj.items)) {
      rawList = obj.items;
    }
  }

  if (!rawList) {
    errors.push("Missing or non-array 'clauseExplanations' property.");
    return { isValid: false, errors };
  }

  const validatedExplanations: ClauseExplanation[] = [];
  const returnedIds = new Set<string>();

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item || typeof item !== "object") {
      errors.push(`ClauseExplanation at index ${i} is not an object.`);
      continue;
    }

    const e = item as Record<string, unknown>;
    const rawId = typeof e.tempClauseId === "string" ? e.tempClauseId : "";
    const normalizedId = rawId ? normalizeClauseId(rawId) : "";

    if (!normalizedId) {
      errors.push(`ClauseExplanation at index ${i} missing valid 'tempClauseId'.`);
    } else {
      returnedIds.add(normalizedId);
    }

    if (typeof e.title !== "string" || !e.title.trim()) {
      errors.push(`ClauseExplanation at index ${i} missing valid 'title'.`);
    }

    if (typeof e.shortExplanation !== "string" || !e.shortExplanation.trim()) {
      errors.push(`ClauseExplanation at index ${i} missing valid 'shortExplanation'.`);
    }

    if (typeof e.plainLanguageExplanation !== "string" || !e.plainLanguageExplanation.trim()) {
      errors.push(`ClauseExplanation at index ${i} missing valid 'plainLanguageExplanation'.`);
    }

    if (typeof e.whyThisClauseMatters !== "string" || !e.whyThisClauseMatters.trim()) {
      errors.push(`ClauseExplanation at index ${i} missing valid 'whyThisClauseMatters'.`);
    }

    if (!Array.isArray(e.potentialUserImplications) || e.potentialUserImplications.length === 0) {
      errors.push(`ClauseExplanation at index ${i} must have a non-empty 'potentialUserImplications' array.`);
    }

    validatedExplanations.push({
      tempClauseId: normalizedId || String(e.tempClauseId || `clause_${i + 1}`),
      title: String(e.title || "Contractual Term"),
      shortExplanation: String(e.shortExplanation || ""),
      plainLanguageExplanation: String(e.plainLanguageExplanation || ""),
      whyThisClauseMatters: String(e.whyThisClauseMatters || ""),
      potentialUserImplications: Array.isArray(e.potentialUserImplications)
        ? e.potentialUserImplications.map(String)
        : [],
      actionableAdvice: typeof e.actionableAdvice === "string" && e.actionableAdvice.trim() ? e.actionableAdvice.trim() : undefined,
    });
  }

  // Verify that all expected clause IDs from P01 are accounted for
  for (const expectedId of expectedClauseIds) {
    if (!returnedIds.has(normalizeClauseId(expectedId))) {
      errors.push(`P02 output missing explanation for expected clause ID '${expectedId}'.`);
    }
  }

  return {
    isValid: errors.length === 0,
    output: {
      clauseExplanations: validatedExplanations,
    },
    errors,
  };
}

/**
 * Core P02 Explanation service function.
 * Accepts P01 output (or an array of extracted clauses) and generates plain-language explanations.
 */
export async function explainClausesP02(
  input: {
    p01Output?: P01_Output;
    clauses?: ExtractedClause[];
    appName: string;
    documentType: DocumentType;
  },
  options?: P02ExplanationOptions
): Promise<P02_Result> {
  const startTime = Date.now();
  const version: P02PromptVersion =
    options?.promptVersion ||
    (process.env.P02_PROMPT_VERSION as P02PromptVersion) ||
    "v3";

  try {
    const clauses = input.clauses || input.p01Output?.extractedClauses;

    if (!clauses || !Array.isArray(clauses) || clauses.length === 0) {
      return {
        success: false,
        error: "Missing or empty clauses to explain. P01 output with extracted clauses is required.",
      };
    }

    const expectedClauseIds = clauses.map((c) => c.tempClauseId);

    // 1. Render prompt
    const prompt = renderP02Prompt(version, clauses, input.appName, input.documentType);

    // 2. Invoke Gemini
    const rawResponse = await callGemini(
      prompt,
      {
        temperature: 0.2, // slightly higher than P01 for fluent language simplification
        responseMimeType: "application/json",
      },
      options?.geminiConfig
    );

    // 3. Parse & Schema validate
    const parsedJson = extractJsonFromResponse(rawResponse);
    const validation = validateP02OutputSchema(parsedJson, expectedClauseIds);

    let finalExplanations = validation.output?.clauseExplanations || [];

    // If validation failed solely due to missing expected clause IDs, gracefully backfill missing clauses from P01
    if (!validation.isValid) {
      const nonMissingErrors = validation.errors.filter(
        (e) => !e.includes("missing explanation for expected clause ID")
      );
      if (nonMissingErrors.length === 0 && finalExplanations.length > 0) {
        const returnedIds = new Set(finalExplanations.map((e) => normalizeClauseId(e.tempClauseId)));
        for (const c of clauses) {
          const normId = normalizeClauseId(c.tempClauseId);
          if (!returnedIds.has(normId)) {
            finalExplanations.push({
              tempClauseId: c.tempClauseId,
              title: c.sectionHeading || "Agreement Provision",
              shortExplanation: c.operativeSummary || "Operative legal provision extracted from document.",
              plainLanguageExplanation: c.operativeSummary || c.originalClauseText.slice(0, 250),
              whyThisClauseMatters: "Governs your use and rights under this section of the agreement.",
              potentialUserImplications: [
                "Binds you to the conditions stated in this provision.",
                "Review the full clause text for complete terms."
              ],
            });
            returnedIds.add(normId);
          }
        }
      } else {
        return {
          success: false,
          error: `LLM response failed P02 schema validation: ${validation.errors.join("; ")}`,
        };
      }
    }

    const durationMs = Date.now() - startTime;
    const model = options?.geminiConfig?.model || getGeminiModel();

    return {
      success: true,
      data: {
        clauseExplanations: finalExplanations,
      },
      metadata: {
        model,
        promptVersion: version,
        durationMs,
        clausesProcessed: finalExplanations.length,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during P02 clause explanation.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Integrated Workflow: Policy Text -> P01 Extraction -> P02 Plain-Language Explanation.
 */
export async function runP01P02Pipeline(
  input: {
    rawText: string;
    appName: string;
    documentType: DocumentType;
  },
  options?: {
    p01Options?: P01ExtractionOptions;
    p02Options?: P02ExplanationOptions;
  }
): Promise<{
  success: boolean;
  data?: P01_P02_CombinedOutput;
  error?: string;
}> {
  // Step 1: P01 Clause Extraction
  const p01Result = await extractClausesP01(
    {
      rawText: input.rawText,
      appName: input.appName,
      documentType: input.documentType,
    },
    options?.p01Options
  );

  if (!p01Result.success || !p01Result.data) {
    return {
      success: false,
      error: `Pipeline failed at stage P01: ${p01Result.error}`,
    };
  }

  // Step 2: P02 Plain-Language Explanation
  const p02Result = await explainClausesP02(
    {
      p01Output: p01Result.data,
      appName: input.appName,
      documentType: input.documentType,
    },
    options?.p02Options
  );

  if (!p02Result.success || !p02Result.data) {
    return {
      success: false,
      error: `Pipeline failed at stage P02: ${p02Result.error}`,
    };
  }

  // Step 3: Combine with traceable mapping
  const explanationMap = new Map<string, ClauseExplanation>();
  for (const exp of p02Result.data.clauseExplanations) {
    explanationMap.set(exp.tempClauseId, exp);
  }

  const combinedClauses = p01Result.data.extractedClauses.map((clause) => ({
    clause,
    explanation: explanationMap.get(clause.tempClauseId)!,
  }));

  return {
    success: true,
    data: {
      p01: p01Result.data,
      p02: p02Result.data,
      combinedClauses,
    },
  };
}
