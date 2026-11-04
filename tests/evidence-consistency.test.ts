/**
 * EVIDENCE CONSISTENCY & INTEGRITY TEST SUITE
 * 
 * Verifies that TermsLens AI analysis findings maintain rigorous alignment
 * with source policy excerpts. Evaluates 6 specific negative failure modes
 * and validates that production mock reports pass with zero violations.
 */

import { mockReports, getReportOrFallback } from "../src/lib/mock-reports.ts";
import type { Clause, PrivacyFinding, AnalysisReport } from "../src/types/index.ts";

export interface AuditViolation {
  rule: string;
  targetId: string;
  message: string;
}

// ============================================================================
// 1. PURE VALIDATOR FUNCTIONS
// ============================================================================

/**
 * Normalizes text for comparison by collapsing multiple whitespace characters.
 */
function normalize(str: string): string {
  return str.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Checks whether text contains unevidenced deadlines or procedural postal addresses.
 */
export function validateArbitrationAndDeadlines(clause: Clause): AuditViolation[] {
  const violations: AuditViolation[] = [];
  const sourceText = clause.originalClauseText;

  // Pattern for contractual deadlines, opt-out windows, notice requirements
  // e.g. "within 30 days", "30-day opt-out", "30-day window", "deadline of 30 days"
  const contractualDeadlineRegex =
    /\b(?:within\s+(\d+)\s*(?:calendar\s+|business\s+)?days?|(\d+)[- ]day\s+(?:window|deadline|notice|opt[- ]out|period|right)|opt[- ]out\s+within\s+(\d+)\s*days?)/gi;

  const analysisFields = [
    clause.shortExplanation,
    clause.analysis.plainLanguageExplanation,
    clause.analysis.whyThisClauseMatters,
    clause.analysis.actionableAdvice || "",
    ...clause.analysis.potentialUserImplications,
  ];

  for (const field of analysisFields) {
    let match: RegExpExecArray | null;
    while ((match = contractualDeadlineRegex.exec(field)) !== null) {
      const fullMatch = match[0].toLowerCase();
      // If the field explicitly clarifies that the deadline is NOT in the excerpt, skip
      if (
        field.toLowerCase().includes("does not mention") ||
        field.toLowerCase().includes("no opt-out") ||
        field.toLowerCase().includes("not stated")
      ) {
        continue;
      }

      // Check if source contains this number of days
      const days = match[1] || match[2] || match[3];
      if (!sourceText.toLowerCase().includes(days)) {
        violations.push({
          rule: "UNSUPPORTED_DEADLINE_OR_PROCEDURE",
          targetId: clause.id,
          message: `Finding asserts contractual deadline '${fullMatch}' which is absent from source excerpt.`,
        });
        break;
      }
    }

    // Check for unevidenced opt-out claims in dispute resolution clauses
    if (clause.category === "dispute_resolution") {
      const mentionsOptOut = /\bopt[- ]out\b/i.test(field);
      const isQualified =
        /does not (?:mention|state|contain|describe|include)|no (?:mention|indication|statement|record) of|not stated|not mentioned|no opt[- ]out|check\s+(?:the\s+|Spotify's\s+)?full/i.test(
          field
        );
      const sourceHasOptOut =
        sourceText.toLowerCase().includes("opt-out") || sourceText.toLowerCase().includes("opt out");

      if (mentionsOptOut && !sourceHasOptOut && !isQualified) {
        violations.push({
          rule: "UNSUPPORTED_DEADLINE_OR_PROCEDURE",
          targetId: clause.id,
          message: `Dispute resolution finding asserts an opt-out right that is not present in source text. Field: "${field.substring(0, 60)}"`,
        });
      }
    }

    // Check for invented postal address claims (e.g., mailing notice to New York)
    const postalRegex = /\b(?:mail(?:ing)?|postal)\s+notice\s+to\s+[^.]+/i;
    if (postalRegex.test(field) && !/not stated|does not mention|check full/i.test(field)) {
      if (!sourceText.toLowerCase().includes("mail") && !sourceText.toLowerCase().includes("postal")) {
        violations.push({
          rule: "UNSUPPORTED_DEADLINE_OR_PROCEDURE",
          targetId: clause.id,
          message: `Finding asserts postal mailing procedure absent from source excerpt.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Checks for invented third-party sharing recipients not stated in source evidence.
 */
export function validateThirdPartySharingRecipients(finding: PrivacyFinding): AuditViolation[] {
  const violations: AuditViolation[] = [];
  if (finding.topic !== "third_party_sharing") return violations;

  const evidence = finding.documentEvidence || "";
  const summary = finding.summary;

  const forbiddenRecipients = [
    "ad beacons",
    "ad measurement beacons",
    "advertising networks",
    "measurement vendors",
    "data brokers",
    "credit bureaus",
  ];

  for (const recipient of forbiddenRecipients) {
    const rx = new RegExp(`\\b${recipient}\\b`, "i");
    if (rx.test(summary)) {
      // Check if the term is in the evidence or if the summary explicitly notes it is absent/unspecified
      const isPresentInEvidence = rx.test(evidence);
      const isQualifiedAsAbsent =
        summary.includes(`(${recipient} are not stated`) ||
        summary.includes("not stated in this excerpt") ||
        summary.includes("not specified");

      if (!isPresentInEvidence && !isQualifiedAsAbsent) {
        violations.push({
          rule: "INVENTED_RECIPIENT",
          targetId: finding.id,
          message: `Summary asserts recipient class '${recipient}' without source evidence.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Checks for unsupported privacy data collection claims absent from evidence.
 */
export function validatePrivacyDataCollectionClaims(finding: PrivacyFinding): AuditViolation[] {
  const violations: AuditViolation[] = [];
  if (finding.topic !== "personal_info_collected") return violations;

  const evidence = finding.documentEvidence || "";
  const summary = finding.summary;

  const sensitiveDataClaims = [
    "gender",
    "microphone",
    "microphone audio",
    "bluetooth",
    "bluetooth telemetry",
    "search queries",
    "search query logs",
    "biometric",
  ];

  for (const claim of sensitiveDataClaims) {
    const rx = new RegExp(`\\b${claim}\\b`, "i");
    if (rx.test(summary)) {
      const isPresentInEvidence = rx.test(evidence);
      const isQualifiedAsAbsent =
        summary.includes("does not specify") ||
        summary.includes("does not state") ||
        summary.includes("not specified");

      if (!isPresentInEvidence && !isQualifiedAsAbsent) {
        violations.push({
          rule: "UNSUPPORTED_DATA_COLLECTION_CLAIM",
          targetId: finding.id,
          message: `Summary asserts collection of '${claim}' which is absent from source excerpt.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Ensures anonymization is not described as complete deletion or data purging.
 */
export function validateAccountDeletionVersusAnonymization(finding: PrivacyFinding): AuditViolation[] {
  const violations: AuditViolation[] = [];
  if (finding.topic !== "account_deletion") return violations;

  const evidence = (finding.documentEvidence || "").toLowerCase();
  const summary = finding.summary.toLowerCase();

  // If source evidence explicitly talks about anonymization
  if (evidence.includes("anonymiz")) {
    const claimsPurged = summary.includes("purged") || summary.includes("completely deleted");
    const distinguishesAnonymization =
      summary.includes("anonymiz") &&
      (summary.includes("rather than completely deleting") ||
        summary.includes("retains data with personal identifiers removed") ||
        summary.includes("note that anonymization"));

    if (claimsPurged && !distinguishesAnonymization) {
      violations.push({
        rule: "ANONYMIZATION_EQUATED_TO_DELETION",
        targetId: finding.id,
        message:
          "Finding treats 30-day anonymization as complete data purging/deletion without noting that anonymized records are retained.",
      });
    }
  }

  return violations;
}

/**
 * Validates required phrasing for unspecified retention periods.
 */
export function validateUnspecifiedRetentionPhrasing(finding: PrivacyFinding): AuditViolation[] {
  const violations: AuditViolation[] = [];
  if (finding.topic !== "data_retention") return violations;

  if (finding.distinction === "not_specified") {
    const REQUIRED_PHRASE = "no specific retention period is stated in the provided excerpt.";
    if (!finding.summary.toLowerCase().includes(REQUIRED_PHRASE)) {
      violations.push({
        rule: "INVALID_UNSPECIFIED_RETENTION_PHRASING",
        targetId: finding.id,
        message: `Unspecified data retention summary must contain mandatory phrase: '${REQUIRED_PHRASE}'`,
      });
    }

    if (
      finding.summary.toLowerCase().includes("retained indefinitely") &&
      !finding.summary.toLowerCase().includes("do not infer")
    ) {
      violations.push({
        rule: "INVALID_UNSPECIFIED_RETENTION_PHRASING",
        targetId: finding.id,
        message: "Summary asserts indefinite retention as a fact instead of noting silence in excerpt.",
      });
    }
  }

  return violations;
}

/**
 * Validates that findings marked 'supported' have matching verbatim evidence.
 */
export function validateFindingVerificationStatus(clause: Clause): AuditViolation[] {
  const violations: AuditViolation[] = [];

  if (clause.verification.status === "supported") {
    if (!clause.verification.evidenceMatchesOriginal) {
      violations.push({
        rule: "INVALID_SUPPORTED_STATUS",
        targetId: clause.id,
        message: "Status is 'supported' but evidenceMatchesOriginal is false.",
      });
    }

    const exactQuote = clause.evidence.exactQuote;
    if (!exactQuote || exactQuote.trim().length === 0) {
      violations.push({
        rule: "INVALID_SUPPORTED_STATUS",
        targetId: clause.id,
        message: "Status is 'supported' but exactQuote is empty.",
      });
    } else {
      // Split on ellipsis if quote contains multiple truncated passages
      const quoteSegments = exactQuote
        .split(/\.\.\./)
        .map((s) => normalize(s))
        .filter((s) => s.length > 5);

      const normSource = normalize(clause.originalClauseText);
      for (const segment of quoteSegments) {
        if (!normSource.includes(segment)) {
          violations.push({
            rule: "INVALID_SUPPORTED_STATUS",
            targetId: clause.id,
            message: `Quoted segment '${segment.substring(0, 40)}...' does not match source clause text.`,
          });
        }
      }
    }
  }

  return violations;
}

// ============================================================================
// 2. AUDIT ENTIRE REPORT
// ============================================================================

export function auditAnalysisReport(report: AnalysisReport): AuditViolation[] {
  const violations: AuditViolation[] = [];

  for (const clause of report.clauses) {
    violations.push(...validateArbitrationAndDeadlines(clause));
    violations.push(...validateFindingVerificationStatus(clause));
  }

  for (const finding of report.privacyFindings) {
    violations.push(...validateThirdPartySharingRecipients(finding));
    violations.push(...validatePrivacyDataCollectionClaims(finding));
    violations.push(...validateAccountDeletionVersusAnonymization(finding));
    violations.push(...validateUnspecifiedRetentionPhrasing(finding));
  }

  return violations;
}

// ============================================================================
// 3. TEST RUNNER HARNESS
// ============================================================================

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(testName: string, testFn: () => void) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } catch (err: any) {
    failedTests++;
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`    Error: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// 4. TEST SUITE EXECUTION
// ============================================================================

console.log("\n=======================================================");
console.log("TermsLens Evidence Consistency & Integrity Test Suite");
console.log("=======================================================\n");

console.log("Group 1: Synthetic Negative Failure Cases (6 Required Modes)");

// Case 1: Unsupported deadline
runTest("Failure Mode 1: Flags unsupported 30-day arbitration deadline and mailing address", () => {
  const badClause: Clause = {
    id: "synthetic_bad_arb",
    title: "Arbitration Waiver",
    shortExplanation: "You must arbitrate.",
    category: "dispute_resolution",
    attentionLevel: "high",
    originalClauseText:
      "All disputes arising from this agreement shall be decided exclusively through mandatory binding individual arbitration.",
    evidence: {
      id: "ev_bad_arb",
      sourceReferenceText: "Section 1",
      exactQuote: "mandatory binding individual arbitration",
    },
    analysis: {
      plainLanguageExplanation: "Disputes go to an arbitrator.",
      whyThisClauseMatters: "Waives jury trial.",
      potentialUserImplications: ["No court trial"],
      attentionLevel: "high",
      category: "dispute_resolution",
      actionableAdvice:
        "Spotify provides an arbitration opt-out right within 30 days of registration by mailing a written notice to Spotify's legal office in New York.",
    },
    verification: {
      status: "supported",
      reviewerType: "simulated_reviewer",
      notes: "Audited",
      verifiedAt: new Date().toISOString(),
      evidenceMatchesOriginal: true,
    },
  };

  const violations = validateArbitrationAndDeadlines(badClause);
  assert(violations.length > 0, "Validator should have flagged unsupported 30-day deadline.");
  assert(
    violations.some((v) => v.rule === "UNSUPPORTED_DEADLINE_OR_PROCEDURE"),
    "Should return UNSUPPORTED_DEADLINE_OR_PROCEDURE error."
  );
});

// Case 2: Invented third-party sharing recipients
runTest("Failure Mode 2: Flags invented third-party sharing recipients (ad beacons/data brokers)", () => {
  const badFinding: PrivacyFinding = {
    id: "synthetic_bad_sharing",
    topic: "third_party_sharing",
    topicTitle: "Third-Party Data Sharing",
    distinction: "explicitly_stated",
    summary:
      "Shares pseudonymous device IDs and ad measurement beacons with advertising networks, measurement vendors, and data brokers.",
    documentEvidence: "Section 4: 'We share analytics with record labels and marketing partners.'",
    attentionLevel: "moderate",
  };

  const violations = validateThirdPartySharingRecipients(badFinding);
  assert(violations.length > 0, "Validator should have flagged invented ad beacons/data brokers.");
  assert(
    violations.some((v) => v.rule === "INVENTED_RECIPIENT"),
    "Should return INVENTED_RECIPIENT error."
  );
});

// Case 3: Unsupported privacy data collection claims
runTest("Failure Mode 3: Flags unsupported collection claims (gender, microphone audio, search queries)", () => {
  const badFinding: PrivacyFinding = {
    id: "synthetic_bad_collection",
    topic: "personal_info_collected",
    topicTitle: "Personal Information Collected",
    distinction: "explicitly_stated",
    summary:
      "Collects registration info (email, birthdate, gender), stream history, search queries, and microphone audio when voice controls are toggled.",
    documentEvidence:
      "Section 3.1: 'We collect your email address, date of birth, streaming history, interactions with content, device identifiers, and network connection type.'",
    attentionLevel: "moderate",
  };

  const violations = validatePrivacyDataCollectionClaims(badFinding);
  assert(violations.length > 0, "Validator should have flagged unevidenced microphone and gender collection claims.");
  assert(
    violations.some((v) => v.rule === "UNSUPPORTED_DATA_COLLECTION_CLAIM"),
    "Should return UNSUPPORTED_DATA_COLLECTION_CLAIM error."
  );
});

// Case 4: Anonymization equated to deletion
runTest("Failure Mode 4: Flags descriptions treating 30-day anonymization as complete data purging/deletion", () => {
  const badFinding: PrivacyFinding = {
    id: "synthetic_bad_deletion",
    topic: "account_deletion",
    topicTitle: "Account Deletion Rights",
    distinction: "explicitly_stated",
    summary:
      "Users can request full account closure via self-service support portal. Personal data is purged and completely deleted within 30 days.",
    documentEvidence:
      "Section 7.3: 'You may close your account through the Support page; your data will be permanently anonymized within 30 days.'",
    attentionLevel: "informational",
  };

  const violations = validateAccountDeletionVersusAnonymization(badFinding);
  assert(violations.length > 0, "Validator should have flagged equating anonymization with complete purging.");
  assert(
    violations.some((v) => v.rule === "ANONYMIZATION_EQUATED_TO_DELETION"),
    "Should return ANONYMIZATION_EQUATED_TO_DELETION error."
  );
});

// Case 5: Unspecified retention phrasing
runTest("Failure Mode 5: Verifies that unspecified retention requires mandatory standard phrasing", () => {
  const badFinding: PrivacyFinding = {
    id: "synthetic_bad_retention",
    topic: "data_retention",
    topicTitle: "Data Retention Period",
    distinction: "not_specified",
    summary:
      "The agreement keeps listening telemetry data indefinitely for as long as legitimate business interests exist.",
    attentionLevel: "high",
  };

  const violations = validateUnspecifiedRetentionPhrasing(badFinding);
  assert(violations.length > 0, "Validator should have flagged missing required standard retention phrase.");
  assert(
    violations.some((v) => v.rule === "INVALID_UNSPECIFIED_RETENTION_PHRASING"),
    "Should return INVALID_UNSPECIFIED_RETENTION_PHRASING error."
  );
});

// Case 6: Finding incorrectly marked supported
runTest("Failure Mode 6: Flags findings marked 'supported' when quoted evidence is mismatched or falsified", () => {
  const badClause: Clause = {
    id: "synthetic_bad_supported",
    title: "Arbitration Waiver",
    shortExplanation: "You must arbitrate.",
    category: "dispute_resolution",
    attentionLevel: "high",
    originalClauseText:
      "Disputes will be decided through private individual arbitration. There is no judge or jury.",
    evidence: {
      id: "ev_bad_supp",
      sourceReferenceText: "Section 2",
      exactQuote: "You have thirty days to file a lawsuit in state court with a jury trial.", // Does not exist in source!
    },
    analysis: {
      plainLanguageExplanation: "Arbitration clause.",
      whyThisClauseMatters: "Waives jury.",
      potentialUserImplications: ["No court"],
      attentionLevel: "high",
      category: "dispute_resolution",
    },
    verification: {
      status: "supported",
      reviewerType: "simulated_reviewer",
      notes: "Audited",
      verifiedAt: new Date().toISOString(),
      evidenceMatchesOriginal: false, // Flagged false
    },
  };

  const violations = validateFindingVerificationStatus(badClause);
  assert(violations.length > 0, "Validator should have flagged invalid supported status.");
  assert(
    violations.some((v) => v.rule === "INVALID_SUPPORTED_STATUS"),
    "Should return INVALID_SUPPORTED_STATUS error."
  );
});

console.log("\nGroup 2: Production Mock Reports Verification");

// Test Production Spotify Report
runTest("Production Audit: Spotify Demo Report (doc_demo_spotify_01)", () => {
  const spotifyReport = mockReports["doc_demo_spotify_01"];
  assert(!!spotifyReport, "Spotify demo report should exist.");

  const violations = auditAnalysisReport(spotifyReport);
  if (violations.length > 0) {
    console.error("Spotify Report Violations:", violations);
  }
  assert(violations.length === 0, `Spotify demo report had ${violations.length} violations.`);
});

// Test Production Instagram Report
runTest("Production Audit: Instagram Demo Report (doc_demo_instagram_02)", () => {
  const igReport = mockReports["doc_demo_instagram_02"];
  assert(!!igReport, "Instagram demo report should exist.");

  const violations = auditAnalysisReport(igReport);
  if (violations.length > 0) {
    console.error("Instagram Report Violations:", violations);
  }
  assert(violations.length === 0, `Instagram demo report had ${violations.length} violations.`);
});

// Test Production Discord Report
runTest("Production Audit: Discord Demo Report (doc_demo_discord_03)", () => {
  const discordReport = mockReports["doc_demo_discord_03"];
  assert(!!discordReport, "Discord demo report should exist.");

  const violations = auditAnalysisReport(discordReport);
  if (violations.length > 0) {
    console.error("Discord Report Violations:", violations);
  }
  assert(violations.length === 0, `Discord demo report had ${violations.length} violations.`);
});

// Test Fallback Generator Report
runTest("Production Audit: Dynamic Fallback Report Generator", () => {
  const fallbackReport = getReportOrFallback("doc_test_dynamic_99", "CustomApp");
  assert(!!fallbackReport, "Fallback report should be generated.");

  const violations = auditAnalysisReport(fallbackReport);
  if (violations.length > 0) {
    console.error("Fallback Report Violations:", violations);
  }
  assert(violations.length === 0, `Fallback report had ${violations.length} violations.`);
});

console.log("\n=======================================================");
console.log(`Test Results Summary: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
