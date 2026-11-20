import type { DocumentSegment, P01_Output, ExtractedClause } from "../types/index.ts";

export interface SegmentationOptions {
  maxSegmentLength?: number;
  minParagraphLength?: number;
}

const DEFAULT_MAX_SEGMENT_LENGTH = 1800; // characters (~350 words)
const DEFAULT_MIN_PARAGRAPH_LENGTH = 20;

/**
 * Validates that input policy text is non-empty, non-trivial, and resembles legal/policy text.
 */
export function validatePolicyInput(text: string): { isValid: boolean; error?: string } {
  if (!text || typeof text !== "string") {
    return { isValid: false, error: "Document text is required and cannot be empty." };
  }

  const trimmed = text.trim();
  if (trimmed.length < 50) {
    return {
      isValid: false,
      error: "Document text is too short to be a valid legal agreement (minimum 50 characters required).",
    };
  }

  // Check if it's purely garbage / repetitive characters
  const words = trimmed.split(/\s+/);
  if (words.length < 10) {
    return {
      isValid: false,
      error: "Document text does not contain sufficient words to perform clause extraction.",
    };
  }

  return { isValid: true };
}

/**
 * Normalizes text: standardizes linebreaks, collapses excess whitespace,
 * repairs common OCR hyphenation.
 */
export function normalizePolicyText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width spaces
    .replace(/(\w+)-\n(\w+)/g, "$1$2") // stitch hyphenated words across lines
    .replace(/[ \t]+/g, " "); // collapse horizontal whitespace
}

/**
 * Detects whether a line represents a section heading or number.
 * Examples:
 * - "Section 14.2 — Dispute Resolution"
 * - "14.2 Dispute Resolution"
 * - "3. Billing and Subscriptions"
 * - "ARTICLE IV: TERMINATION"
 */
export function parseHeading(line: string): { sectionHeading?: string; sectionNumber?: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return null;

  // Pattern: Section 12.3: Heading or 12.3 Heading
  const sectionWithNumRegex = /^(?:Section|Article|Clause)?\s*([0-9]+(?:\.[0-9]+)*)[:.\s—–-]+\s*(.+)$/i;
  const match = trimmed.match(sectionWithNumRegex);
  if (match) {
    return {
      sectionNumber: match[1],
      sectionHeading: trimmed,
    };
  }

  // All caps heading e.g., "TERMS OF SERVICE", "LIMITATION OF LIABILITY"
  if (/^[A-Z0-9\s—–:,\.]{4,60}$/.test(trimmed) && trimmed.split(" ").length <= 8) {
    return {
      sectionHeading: trimmed,
    };
  }

  return null;
}

/**
 * Splits raw policy text into structured DocumentSegment blocks,
 * preserving physical boundaries, section headings, numbers, and page references when annotated.
 */
export function segmentPolicyText(
  rawText: string,
  options?: SegmentationOptions
): DocumentSegment[] {
  const validation = validatePolicyInput(rawText);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const normalized = normalizePolicyText(rawText);
  const maxLen = options?.maxSegmentLength ?? DEFAULT_MAX_SEGMENT_LENGTH;

  // Split into paragraphs / lines
  const lines = normalized.split(/\n+/);
  const segments: DocumentSegment[] = [];

  let currentHeading = "General Terms";
  let currentSectionNumber: string | undefined = undefined;
  let currentPage: number | undefined = undefined;

  let currentBlockText: string[] = [];
  let currentBlockLen = 0;

  function flushBlock() {
    if (currentBlockText.length === 0) return;
    const combined = currentBlockText.join("\n\n").trim();
    if (combined.length >= DEFAULT_MIN_PARAGRAPH_LENGTH) {
      segments.push({
        segmentIndex: segments.length,
        sectionHeading: currentHeading,
        sectionNumber: currentSectionNumber,
        sourcePage: currentPage,
        rawText: combined,
      });
    }
    currentBlockText = [];
    currentBlockLen = 0;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for page marker: e.g. [Page 4] or Page 4 or --- Page 4 ---
    const pageMatch = trimmed.match(/^(?:\[Page\s*(\d+)\]|Page\s*(\d+)|---\s*Page\s*(\d+)\s*---)$/i);
    if (pageMatch) {
      flushBlock();
      const p = parseInt(pageMatch[1] || pageMatch[2] || pageMatch[3], 10);
      if (!isNaN(p)) {
        currentPage = p;
      }
      continue;
    }

    // Check for heading
    const headingInfo = parseHeading(trimmed);
    if (headingInfo && !trimmed.endsWith(".")) {
      flushBlock();
      currentHeading = headingInfo.sectionHeading || trimmed;
      currentSectionNumber = headingInfo.sectionNumber;
      continue;
    }

    // Accumulate paragraph text
    // If a single line itself exceeds maxLen, split it into chunks by sentences
    if (trimmed.length > maxLen) {
      flushBlock();
      // Split on sentence boundaries
      const sentences = trimmed.match(/[^.!?]+[.!?]+|\S+/g) || [trimmed];
      for (const sent of sentences) {
        if (currentBlockLen + sent.length > maxLen && currentBlockText.length > 0) {
          flushBlock();
        }
        currentBlockText.push(sent.trim());
        currentBlockLen += sent.length;
      }
      continue;
    }

    if (currentBlockLen + trimmed.length > maxLen && currentBlockText.length > 0) {
      flushBlock();
    }

    currentBlockText.push(trimmed);
    currentBlockLen += trimmed.length;
  }

  flushBlock();

  // If no segments were formed (e.g. text was very compact)
  if (segments.length === 0 && normalized.trim().length > 0) {
    segments.push({
      segmentIndex: 0,
      sectionHeading: currentHeading,
      sectionNumber: currentSectionNumber,
      sourcePage: currentPage,
      rawText: normalized.trim(),
    });
  }

  return segments;
}

/**
 * Normalizes strings for lenient verbatim checking (ignoring whitespace differences).
 */
export function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Validates an extracted clause against the source segments to guarantee verbatim evidence grounding.
 */
export function verifyClauseVerbatim(
  clause: ExtractedClause,
  segments: DocumentSegment[]
): { isVerbatim: boolean; matchedSegmentIndex?: number; error?: string } {
  if (!clause.originalClauseText || !clause.originalClauseText.trim()) {
    return { isVerbatim: false, error: "Clause has empty originalClauseText." };
  }

  const target = normalizeForComparison(clause.originalClauseText);

  // Check the specified segment first
  if (typeof clause.segmentIndex === "number" && segments[clause.segmentIndex]) {
    const segText = normalizeForComparison(segments[clause.segmentIndex].rawText);
    if (segText.includes(target)) {
      return { isVerbatim: true, matchedSegmentIndex: clause.segmentIndex };
    }
  }

  // Fallback search across all segments in case of segment index offset
  for (let i = 0; i < segments.length; i++) {
    const segText = normalizeForComparison(segments[i].rawText);
    if (segText.includes(target)) {
      return { isVerbatim: true, matchedSegmentIndex: i };
    }
  }

  return {
    isVerbatim: false,
    error: `Extracted clause text does not match any source segment verbatim: "${clause.originalClauseText.slice(0, 60)}..."`,
  };
}
