import nextEnv from "@next/env";
import { analyzeP03 } from "../src/services/p03-risk-privacy-analysis.ts";
import { getGeminiApiKey } from "../src/lib/gemini.ts";
import type { P01_Output } from "../src/types/index.ts";

nextEnv.loadEnvConfig(process.cwd());

const policyContext = [
  "We collect your email address and device identifier to provide the service.",
  "We share your email address with our payment processor to complete purchases.",
  "We use cookies to measure activity and show interest-based ads.",
  "We retain account information for 24 months after account closure.",
  "You can request account deletion through account settings; backup copies may remain for 30 days.",
  "We do not use your documents to train generative AI models.",
  "Your subscription renews automatically every month until canceled.",
].join("\n");

const p01Output: P01_Output = {
  extractedClauses: [
    {
      tempClauseId: "synthetic_collection",
      segmentIndex: 0,
      sectionHeading: "Information We Collect",
      originalClauseText: "We collect your email address and device identifier to provide the service.",
      operativeSummary: "The service collects email addresses and device identifiers.",
    },
    {
      tempClauseId: "synthetic_sharing",
      segmentIndex: 0,
      sectionHeading: "Sharing",
      originalClauseText: "We share your email address with our payment processor to complete purchases.",
      operativeSummary: "Email addresses are shared with the payment processor.",
    },
    {
      tempClauseId: "synthetic_billing",
      segmentIndex: 0,
      sectionHeading: "Subscriptions",
      originalClauseText: "Your subscription renews automatically every month until canceled.",
      operativeSummary: "The subscription renews monthly until canceled.",
    },
  ],
  totalClausesAnalyzed: 3,
};

async function main(): Promise<void> {
  if (!getGeminiApiKey() || getGeminiApiKey() === "your_gemini_api_key_here") {
    console.error("Live P03 test blocked: GEMINI_API_KEY is not configured.");
    process.exitCode = 1;
    return;
  }

  const result = await analyzeP03(
    {
      p01Output,
      policyContext,
      appName: "Synthetic TermsLens Test",
      documentType: "privacy_policy",
    },
    { promptVersion: "v3" }
  );

  if (!result.success || !result.data) {
    console.error(`Live P03 test failed: ${result.error || "No structured output returned."}`);
    process.exitCode = 1;
    return;
  }

  console.log("Live P03 Gemini test passed.");
  console.log(`Model: ${result.metadata?.model}`);
  console.log(`Prompt version: ${result.metadata?.promptVersion}`);
  console.log(`Duration: ${result.metadata?.durationMs}ms`);
  console.log(`Classified clauses: ${result.data.clauseClassifications.length}`);
  for (const classification of result.data.clauseClassifications) {
    console.log(
      `  ${classification.tempClauseId}: ${classification.category} (${classification.attentionLevel})`
    );
  }
  console.log(`Privacy topics returned: ${result.data.privacyFindings.length}`);
  for (const finding of result.data.privacyFindings) {
    console.log(`  ${finding.topic}: ${finding.distinction}`);
    if (finding.documentEvidence) console.log(`    Exact evidence: ${finding.documentEvidence}`);
    if (finding.silenceNotice) console.log(`    Silence notice: ${finding.silenceNotice}`);
  }
}

main().catch((error: unknown) => {
  console.error("Live P03 Gemini test failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
