import fs from "fs";
import path from "path";
import {
  callGemini,
  extractJsonFromResponse,
  getGeminiModel,
} from "../lib/gemini.ts";
import type {
  AttentionLevel,
  ClauseCategory,
  DocumentType,
  ExtractedClause,
  P01_Output,
  P03_Output,
  P03PromptVersion,
  P03_Result,
  PrivacyDistinction,
  PrivacyFinding,
  PrivacyTopic,
} from "../types/index.ts";

export interface P03AnalysisOptions {
  promptVersion?: P03PromptVersion;
}

export interface P03AnalysisInput {
  p01Output?: P01_Output;
  clauses?: ExtractedClause[];
  policyContext?: string;
  appName: string;
  documentType: DocumentType;
}

const PROMPT_PATHS: Record<P03PromptVersion, string> = {
  v1: path.join(process.cwd(), "prompts/v1/p03-risk-privacy-analysis.v1.md"),
  v2: path.join(process.cwd(), "prompts/experiments/refined-prompts/p03-risk-privacy-analysis.v2.md"),
  v3: path.join(process.cwd(), "prompts/experiments/refined-prompts/p03-risk-privacy-analysis.v3.md"),
};

const CLAUSE_CATEGORIES: ClauseCategory[] = [
  "data_collection",
  "data_sharing",
  "data_retention",
  "subscription_billing",
  "cancellation_refunds",
  "intellectual_property",
  "dispute_resolution",
  "liability_indemnification",
  "account_termination",
  "other",
];

const ATTENTION_LEVELS: AttentionLevel[] = ["high", "moderate", "informational"];

const PRIVACY_TOPICS: PrivacyTopic[] = [
  "personal_info_collected",
  "third_party_sharing",
  "advertising_tracking",
  "data_retention",
  "account_deletion",
  "ai_model_training",
];

const PRIVACY_DISTINCTIONS: PrivacyDistinction[] = [
  "explicitly_stated",
  "reasonable_interpretation",
  "not_specified",
];

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

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function loadP03PromptTemplate(version: P03PromptVersion): string {
  const filePath = PROMPT_PATHS[version];
  if (!fs.existsSync(filePath)) {
    throw new Error(`P03 prompt template file not found at: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf-8");
}

export function validateP01OutputForP03(raw: unknown): {
  isValid: boolean;
  output?: P01_Output;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(raw) || !Array.isArray(raw.extractedClauses)) {
    return {
      isValid: false,
      errors: ["P01 output must be an object with an 'extractedClauses' array."],
    };
  }

  if (raw.totalClausesAnalyzed !== raw.extractedClauses.length) {
    errors.push("'totalClausesAnalyzed' must match the number of extracted clauses.");
  }

  const clauses: ExtractedClause[] = [];
  const ids = new Set<string>();

  raw.extractedClauses.forEach((value, index) => {
    if (!isRecord(value)) {
      errors.push(`Clause at index ${index} must be an object.`);
      return;
    }

    const clause = value;
    if (!isNonEmptyString(clause.tempClauseId)) {
      errors.push(`Clause at index ${index} must have a non-empty 'tempClauseId'.`);
    } else if (ids.has(clause.tempClauseId)) {
      errors.push(`Duplicate P01 clause ID '${clause.tempClauseId}'.`);
    } else {
      ids.add(clause.tempClauseId);
    }

    if (typeof clause.segmentIndex !== "number" || !Number.isInteger(clause.segmentIndex) || clause.segmentIndex < 0) {
      errors.push(`Clause at index ${index} must have a non-negative integer 'segmentIndex'.`);
    }
    if (typeof clause.sectionHeading !== "string") {
      errors.push(`Clause at index ${index} must have a string 'sectionHeading'.`);
    }
    if (clause.sectionNumber !== undefined && typeof clause.sectionNumber !== "string") {
      errors.push(`Clause at index ${index} has an invalid 'sectionNumber'.`);
    }
    if (clause.sourcePage !== undefined && (typeof clause.sourcePage !== "number" || !Number.isFinite(clause.sourcePage))) {
      errors.push(`Clause at index ${index} has an invalid 'sourcePage'.`);
    }
    if (!isNonEmptyString(clause.originalClauseText)) {
      errors.push(`Clause at index ${index} must have a non-empty 'originalClauseText'.`);
    }
    if (!isNonEmptyString(clause.operativeSummary)) {
      errors.push(`Clause at index ${index} must have a non-empty 'operativeSummary'.`);
    }

    if (
      isNonEmptyString(clause.tempClauseId) &&
      typeof clause.segmentIndex === "number" &&
      Number.isInteger(clause.segmentIndex) &&
      clause.segmentIndex >= 0 &&
      typeof clause.sectionHeading === "string" &&
      (clause.sectionNumber === undefined || typeof clause.sectionNumber === "string") &&
      (clause.sourcePage === undefined || (typeof clause.sourcePage === "number" && Number.isFinite(clause.sourcePage))) &&
      isNonEmptyString(clause.originalClauseText) &&
      isNonEmptyString(clause.operativeSummary)
    ) {
      clauses.push({
        tempClauseId: clause.tempClauseId,
        segmentIndex: clause.segmentIndex,
        sectionHeading: clause.sectionHeading,
        sectionNumber: clause.sectionNumber,
        sourcePage: clause.sourcePage,
        originalClauseText: clause.originalClauseText,
        operativeSummary: clause.operativeSummary,
      });
    }
  });

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    output: {
      extractedClauses: clauses,
      totalClausesAnalyzed: clauses.length,
    },
    errors,
  };
}

export function renderP03Prompt(
  version: P03PromptVersion,
  input: {
    appName: string;
    documentType: DocumentType;
    p01Output: P01_Output;
    policyContext: string;
  }
): string {
  const template = loadP03PromptTemplate(version);
  const taskPayload = JSON.stringify(
    {
      appName: input.appName,
      documentType: input.documentType,
      contextScope:
        input.policyContext.trim().length > 0
          ? "Policy context was supplied; conclusions apply only to this supplied text."
          : "No full policy context was supplied; conclusions apply only to the extracted clause excerpts.",
      policyContext: input.policyContext,
      p01Output: input.p01Output,
    },
    null,
    2
  );

  return template.replace(/\{\{taskPayload\}\}/g, taskPayload);
}

export function validateP03OutputSchema(
  raw: unknown,
  expectedClauseIds: string[],
  sourceText: string
): {
  isValid: boolean;
  output?: P03_Output;
  errors: string[];
} {
  const errors: string[] = [];
  if (!isRecord(raw) || !hasOnlyKeys(raw, ["clauseClassifications", "privacyFindings"])) {
    return {
      isValid: false,
      errors: ["P03 output must be an object containing only 'clauseClassifications' and 'privacyFindings'."],
    };
  }

  if (!Array.isArray(raw.clauseClassifications)) {
    errors.push("Missing or non-array 'clauseClassifications' property.");
  }
  if (!Array.isArray(raw.privacyFindings)) {
    errors.push("Missing or non-array 'privacyFindings' property.");
  }
  if (errors.length > 0) return { isValid: false, errors };

  const rawClassifications = raw.clauseClassifications as unknown[];
  const rawPrivacyFindings = raw.privacyFindings as unknown[];
  const classifications: P03_Output["clauseClassifications"] = [];
  const returnedClauseIds = new Set<string>();

  rawClassifications.forEach((value, index) => {
    if (!isRecord(value) || !hasOnlyKeys(value, ["tempClauseId", "category", "attentionLevel"])) {
      errors.push(`Clause classification at index ${index} has an invalid shape.`);
      return;
    }
    if (!isNonEmptyString(value.tempClauseId)) {
      errors.push(`Clause classification at index ${index} has an invalid 'tempClauseId'.`);
    } else if (returnedClauseIds.has(value.tempClauseId)) {
      errors.push(`Duplicate classified clause ID '${value.tempClauseId}'.`);
    } else {
      returnedClauseIds.add(value.tempClauseId);
    }
    if (typeof value.category !== "string" || !CLAUSE_CATEGORIES.includes(value.category as ClauseCategory)) {
      errors.push(`Clause classification at index ${index} has an invalid 'category'.`);
    }
    if (typeof value.attentionLevel !== "string" || !ATTENTION_LEVELS.includes(value.attentionLevel as AttentionLevel)) {
      errors.push(`Clause classification at index ${index} has an invalid 'attentionLevel'.`);
    }
    if (
      isNonEmptyString(value.tempClauseId) &&
      typeof value.category === "string" &&
      CLAUSE_CATEGORIES.includes(value.category as ClauseCategory) &&
      typeof value.attentionLevel === "string" &&
      ATTENTION_LEVELS.includes(value.attentionLevel as AttentionLevel)
    ) {
      classifications.push({
        tempClauseId: value.tempClauseId,
        category: value.category as ClauseCategory,
        attentionLevel: value.attentionLevel as AttentionLevel,
      });
    }
  });

  const expectedIds = new Set(expectedClauseIds);
  for (const id of expectedIds) {
    if (!returnedClauseIds.has(id)) errors.push(`P03 output is missing clause ID '${id}'.`);
  }
  for (const id of returnedClauseIds) {
    if (!expectedIds.has(id)) errors.push(`P03 output contains unknown clause ID '${id}'.`);
  }
  if (returnedClauseIds.size !== expectedIds.size) {
    errors.push("P03 output must classify each expected P01 clause exactly once.");
  }

  const privacyFindings: PrivacyFinding[] = [];
  const returnedTopics = new Set<string>();
  const returnedFindingIds = new Set<string>();
  if (rawPrivacyFindings.length !== PRIVACY_TOPICS.length) {
    errors.push(`P03 output must contain exactly ${PRIVACY_TOPICS.length} privacy findings.`);
  }

  rawPrivacyFindings.forEach((value, index) => {
    if (
      !isRecord(value) ||
      !hasOnlyKeys(value, [
        "id",
        "topic",
        "topicTitle",
        "distinction",
        "summary",
        "documentEvidence",
        "silenceNotice",
        "attentionLevel",
      ])
    ) {
      errors.push(`Privacy finding at index ${index} has an invalid shape.`);
      return;
    }

    const finding = value;
    if (!isNonEmptyString(finding.id)) {
      errors.push(`Privacy finding at index ${index} has an invalid 'id'.`);
    } else if (returnedFindingIds.has(finding.id)) {
      errors.push(`Duplicate privacy finding ID '${finding.id}'.`);
    } else {
      returnedFindingIds.add(finding.id);
    }
    if (typeof finding.topic !== "string" || !PRIVACY_TOPICS.includes(finding.topic as PrivacyTopic)) {
      errors.push(`Privacy finding at index ${index} has an invalid 'topic'.`);
    } else if (returnedTopics.has(finding.topic)) {
      errors.push(`Duplicate privacy topic '${finding.topic}'.`);
    } else {
      returnedTopics.add(finding.topic);
    }
    if (!isNonEmptyString(finding.topicTitle)) {
      errors.push(`Privacy finding at index ${index} has an invalid 'topicTitle'.`);
    }
    if (
      typeof finding.distinction !== "string" ||
      !PRIVACY_DISTINCTIONS.includes(finding.distinction as PrivacyDistinction)
    ) {
      errors.push(`Privacy finding at index ${index} has an invalid 'distinction'.`);
    }
    if (!isNonEmptyString(finding.summary)) {
      errors.push(`Privacy finding at index ${index} has an invalid 'summary'.`);
    }
    if (
      typeof finding.attentionLevel !== "string" ||
      !ATTENTION_LEVELS.includes(finding.attentionLevel as AttentionLevel)
    ) {
      errors.push(`Privacy finding at index ${index} has an invalid 'attentionLevel'.`);
    }

    if (finding.documentEvidence !== undefined) {
      if (!isNonEmptyString(finding.documentEvidence)) {
        errors.push(`Privacy finding at index ${index} has empty 'documentEvidence'.`);
      } else if (!sourceText.includes(finding.documentEvidence)) {
        errors.push(`Privacy finding at index ${index} contains evidence not found verbatim in the supplied source.`);
      }
    }
    if (finding.silenceNotice !== undefined && !isNonEmptyString(finding.silenceNotice)) {
      errors.push(`Privacy finding at index ${index} has an empty 'silenceNotice'.`);
    }

    if (finding.distinction === "not_specified" && !isNonEmptyString(finding.silenceNotice)) {
      errors.push(`Privacy finding at index ${index} must include a 'silenceNotice' when not specified.`);
    }
    if (
      (finding.distinction === "explicitly_stated" || finding.distinction === "reasonable_interpretation") &&
      !isNonEmptyString(finding.documentEvidence)
    ) {
      errors.push(`Privacy finding at index ${index} must include exact 'documentEvidence' for a stated finding.`);
    }

    if (
      isNonEmptyString(finding.id) &&
      typeof finding.topic === "string" &&
      PRIVACY_TOPICS.includes(finding.topic as PrivacyTopic) &&
      isNonEmptyString(finding.topicTitle) &&
      typeof finding.distinction === "string" &&
      PRIVACY_DISTINCTIONS.includes(finding.distinction as PrivacyDistinction) &&
      isNonEmptyString(finding.summary) &&
      typeof finding.attentionLevel === "string" &&
      ATTENTION_LEVELS.includes(finding.attentionLevel as AttentionLevel) &&
      (finding.documentEvidence === undefined || isNonEmptyString(finding.documentEvidence)) &&
      (finding.silenceNotice === undefined || isNonEmptyString(finding.silenceNotice))
    ) {
      privacyFindings.push({
        id: finding.id,
        topic: finding.topic as PrivacyTopic,
        topicTitle: finding.topicTitle,
        distinction: finding.distinction as PrivacyDistinction,
        summary: finding.summary,
        documentEvidence: finding.documentEvidence as string | undefined,
        silenceNotice: finding.silenceNotice as string | undefined,
        attentionLevel: finding.attentionLevel as AttentionLevel,
      });
    }
  });

  for (const topic of PRIVACY_TOPICS) {
    if (!returnedTopics.has(topic)) errors.push(`P03 output is missing privacy topic '${topic}'.`);
  }

  if (errors.length > 0) return { isValid: false, errors };
  return {
    isValid: true,
    output: {
      clauseClassifications: classifications,
      privacyFindings,
    },
    errors,
  };
}

export async function analyzeP03(
  input: P03AnalysisInput,
  options?: P03AnalysisOptions
): Promise<P03_Result> {
  const startTime = Date.now();
  const rawP01Output = input.p01Output ?? (input.clauses
    ? { extractedClauses: input.clauses, totalClausesAnalyzed: input.clauses.length }
    : undefined);
  const p01Validation = validateP01OutputForP03(rawP01Output);

  if (!p01Validation.isValid || !p01Validation.output) {
    return { success: false, error: `Invalid P01 input: ${p01Validation.errors.join("; ")}` };
  }
  if (!isNonEmptyString(input.appName)) {
    return { success: false, error: "A non-empty appName is required for P03 analysis." };
  }
  if (!DOCUMENT_TYPES.includes(input.documentType)) {
    return { success: false, error: "A valid documentType is required for P03 analysis." };
  }
  if (input.policyContext !== undefined && typeof input.policyContext !== "string") {
    return { success: false, error: "policyContext must be a string when provided." };
  }
  if (
    p01Validation.output.extractedClauses.length === 0 &&
    !isNonEmptyString(input.policyContext)
  ) {
    return { success: false, error: "P03 requires policyContext when P01 contains no extracted clauses." };
  }

  const configuredVersion = options?.promptVersion ?? process.env.P03_PROMPT_VERSION;
  const version: P03PromptVersion =
    configuredVersion === undefined || configuredVersion === ""
      ? "v3"
      : configuredVersion === "v1" || configuredVersion === "v2" || configuredVersion === "v3"
        ? configuredVersion
        : "v3";

  if (configuredVersion && configuredVersion !== version) {
    return { success: false, error: `Unsupported P03 prompt version '${configuredVersion}'. Use v1, v2, or v3.` };
  }

  try {
    const p01Output = p01Validation.output;
    const policyContext = input.policyContext ?? "";
    const sourceText = [
      policyContext,
      ...p01Output.extractedClauses.map((clause) => clause.originalClauseText),
    ].filter((text) => text.length > 0).join("\n");
    const prompt = renderP03Prompt(version, {
      appName: input.appName.trim(),
      documentType: input.documentType,
      p01Output,
      policyContext,
    });

    const rawResponse = await callGemini(
      prompt,
      { temperature: 0.1, responseMimeType: "application/json" }
    );

    let parsedJson: unknown;
    try {
      parsedJson = extractJsonFromResponse(rawResponse);
    } catch {
      return { success: false, error: "Gemini returned malformed JSON for P03 output." };
    }

    const validation = validateP03OutputSchema(
      parsedJson,
      p01Output.extractedClauses.map((clause) => clause.tempClauseId),
      sourceText
    );
    if (!validation.isValid || !validation.output) {
      return {
        success: false,
        error: `Gemini response failed P03 schema or evidence validation: ${validation.errors.join("; ")}`,
      };
    }

    return {
      success: true,
      data: validation.output,
      metadata: {
        model: getGeminiModel(),
        promptVersion: version,
        durationMs: Date.now() - startTime,
        clausesProcessed: validation.output.clauseClassifications.length,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred during P03 analysis.";
    return { success: false, error: message };
  }
}
