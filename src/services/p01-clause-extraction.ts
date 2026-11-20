import fs from "fs";
import path from "path";
import type {
  DocumentSegment,
  DocumentType,
  ExtractedClause,
  P01_Output,
  P01_Result,
} from "../types/index.ts";
import {
  segmentPolicyText,
  validatePolicyInput,
  verifyClauseVerbatim,
} from "../lib/segmentation.ts";
import {
  callGemini,
  extractJsonFromResponse,
  getGeminiModel,
  type GeminiConfig,
} from "../lib/gemini.ts";

export type PromptVersion = "v1" | "v2" | "v3";

export interface P01ExtractionOptions {
  promptVersion?: PromptVersion;
  geminiConfig?: GeminiConfig;
  strictVerbatimCheck?: boolean; // If true, filters out any clause that fails verbatim match
}

const PROMPT_PATHS: Record<PromptVersion, string> = {
  v1: path.join(process.cwd(), "prompts/v1/p01-clause-extraction.v1.md"),
  v2: path.join(process.cwd(), "prompts/experiments/refined-prompts/p01-clause-extraction.v2.md"),
  v3: path.join(process.cwd(), "prompts/experiments/refined-prompts/p01-clause-extraction.v3.md"),
};

/**
 * Loads the prompt template for the given version.
 */
export function loadP01PromptTemplate(version: PromptVersion): string {
  const filePath = PROMPT_PATHS[version];
  if (!fs.existsSync(filePath)) {
    throw new Error(`P01 prompt template file not found at: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * Formats segments into a structured, delimited text block for prompt interpolation.
 */
export function formatSegmentsForPrompt(segments: DocumentSegment[]): string {
  return segments
    .map((seg) => {
      const headingPart = seg.sectionHeading ? ` | Section: "${seg.sectionHeading}"` : "";
      const numPart = seg.sectionNumber ? ` | No: "${seg.sectionNumber}"` : "";
      const pagePart = seg.sourcePage !== undefined ? ` | Page: ${seg.sourcePage}` : "";
      return `[Segment ${seg.segmentIndex}${headingPart}${numPart}${pagePart}]\n${seg.rawText}`;
    })
    .join("\n\n");
}

/**
 * Assembles the full prompt text by replacing placeholders.
 */
export function renderP01Prompt(
  version: PromptVersion,
  segments: DocumentSegment[],
  appName: string,
  documentType: DocumentType
): string {
  const template = loadP01PromptTemplate(version);
  const segmentsBlock = formatSegmentsForPrompt(segments);

  return template
    .replace(/\{\{appName\}\}/g, appName)
    .replace(/\{\{documentType\}\}/g, documentType)
    .replace(/\{\{segmentsBlock\}\}/g, segmentsBlock);
}

/**
 * Validates the raw JSON output from the LLM against the P01_Output schema.
 */
export function validateP01OutputSchema(raw: unknown): {
  isValid: boolean;
  output?: P01_Output;
  errors: string[];
} {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { isValid: false, errors: ["P01 output is not a valid JSON object."] };
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.extractedClauses)) {
    errors.push("Missing or non-array 'extractedClauses' property.");
    return { isValid: false, errors };
  }

  const validatedClauses: ExtractedClause[] = [];

  for (let i = 0; i < obj.extractedClauses.length; i++) {
    const item = obj.extractedClauses[i];
    if (!item || typeof item !== "object") {
      errors.push(`Clause at index ${i} is not an object.`);
      continue;
    }

    const c = item as Record<string, unknown>;

    if (typeof c.tempClauseId !== "string" || !c.tempClauseId.trim()) {
      errors.push(`Clause at index ${i} missing valid 'tempClauseId'.`);
    }

    if (typeof c.segmentIndex !== "number" || isNaN(c.segmentIndex)) {
      errors.push(`Clause at index ${i} missing valid 'segmentIndex' number.`);
    }

    if (typeof c.originalClauseText !== "string" || !c.originalClauseText.trim()) {
      errors.push(`Clause at index ${i} missing valid 'originalClauseText'.`);
    }

    if (typeof c.operativeSummary !== "string" || !c.operativeSummary.trim()) {
      errors.push(`Clause at index ${i} missing valid 'operativeSummary'.`);
    }

    validatedClauses.push({
      tempClauseId: String(c.tempClauseId || `clause_${i + 1}`),
      segmentIndex: Number(c.segmentIndex ?? 0),
      sectionHeading: typeof c.sectionHeading === "string" ? c.sectionHeading : "",
      sectionNumber: typeof c.sectionNumber === "string" ? c.sectionNumber : undefined,
      sourcePage: typeof c.sourcePage === "number" ? c.sourcePage : undefined,
      originalClauseText: String(c.originalClauseText || ""),
      operativeSummary: String(c.operativeSummary || ""),
    });
  }

  const total = typeof obj.totalClausesAnalyzed === "number" ? obj.totalClausesAnalyzed : validatedClauses.length;

  return {
    isValid: errors.length === 0,
    output: {
      extractedClauses: validatedClauses,
      totalClausesAnalyzed: total,
    },
    errors,
  };
}

/**
 * Core P01 Clause Extraction service function.
 * Accepts raw text or pre-split segments, runs LLM extraction using Gemini,
 * validates against schema and verbatim text grounding.
 */
export async function extractClausesP01(
  input: {
    rawText?: string;
    segments?: DocumentSegment[];
    appName: string;
    documentType: DocumentType;
  },
  options?: P01ExtractionOptions
): Promise<P01_Result> {
  const startTime = Date.now();
  const version: PromptVersion =
    options?.promptVersion ||
    (process.env.P01_PROMPT_VERSION as PromptVersion) ||
    "v3";

  try {
    // 1. Validation & Segmentation
    let segments: DocumentSegment[];
    if (input.segments && input.segments.length > 0) {
      segments = input.segments;
    } else if (input.rawText) {
      const val = validatePolicyInput(input.rawText);
      if (!val.isValid) {
        return { success: false, error: val.error };
      }
      segments = segmentPolicyText(input.rawText);
    } else {
      return { success: false, error: "Either rawText or segments must be provided." };
    }

    if (segments.length === 0) {
      return { success: false, error: "No document segments were generated from input text." };
    }

    // 2. Prepare Prompt
    const prompt = renderP01Prompt(version, segments, input.appName, input.documentType);

    // 3. Invoke Gemini
    const rawResponse = await callGemini(
      prompt,
      {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
      options?.geminiConfig
    );

    // 4. Parse & Schema Validate JSON
    const parsedJson = extractJsonFromResponse(rawResponse);
    const schemaValidation = validateP01OutputSchema(parsedJson);

    if (!schemaValidation.isValid || !schemaValidation.output) {
      return {
        success: false,
        error: `LLM response failed P01 schema validation: ${schemaValidation.errors.join("; ")}`,
      };
    }

    const { extractedClauses } = schemaValidation.output;

    // 5. Verbatim Grounding Audit
    let verbatimMatchCount = 0;
    const finalClauses: ExtractedClause[] = [];

    for (const clause of extractedClauses) {
      const matchResult = verifyClauseVerbatim(clause, segments);
      if (matchResult.isVerbatim) {
        verbatimMatchCount++;
        // Sync the segment index to the matched segment if it differed slightly
        const syncedClause = {
          ...clause,
          segmentIndex: matchResult.matchedSegmentIndex ?? clause.segmentIndex,
        };
        finalClauses.push(syncedClause);
      } else {
        if (!options?.strictVerbatimCheck) {
          // Keep clause but log/flag
          finalClauses.push(clause);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const model = options?.geminiConfig?.model || getGeminiModel();
    const verificationRate =
      extractedClauses.length > 0 ? verbatimMatchCount / extractedClauses.length : 1;

    return {
      success: true,
      data: {
        extractedClauses: finalClauses,
        totalClausesAnalyzed: finalClauses.length,
      },
      metadata: {
        model,
        promptVersion: version,
        durationMs,
        segmentsProcessed: segments.length,
        verbatimVerificationRate: verificationRate,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred during P01 clause extraction.";
    return {
      success: false,
      error: message,
    };
  }
}
