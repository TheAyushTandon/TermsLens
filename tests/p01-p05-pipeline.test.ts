import { runFullPolicyAnalysisPipeline } from "../src/services/p05-final-report-generation.ts";
import { getGeminiApiKey } from "../src/lib/gemini.ts";
import { validateAnalysisReport } from "../src/services/analysis-service.ts";

/**
 * End-to-end integration test: Policy Text -> P01 -> P02 -> P03 -> P04 -> P05.
 * Executes live Gemini calls when GEMINI_API_KEY is available in environment.
 */
async function main() {
  console.log("=======================================================");
  console.log("TermsLens Complete P01 -> P05 Real Gemini Pipeline Test");
  console.log("=======================================================");

  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️  GEMINI_API_KEY is not set. Skipping live API call.");
    process.exit(0);
  }

  console.log("🔑 GEMINI_API_KEY detected. Executing end-to-end P01 -> P05 pipeline...");

  const samplePolicyText = `
[Page 1]
Section 2. Automatic Billing & Refunds
Your subscription automatically renews on a monthly basis until you cancel. You authorize us to charge your payment method each month. Payments are strictly non-refundable and there are no credits for partially used billing periods. You may cancel at any time through your account settings.

[Page 2]
Section 7. Mandatory Arbitration & Class Action Waiver
You and TermsLens agree that any dispute arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.
`;

  try {
    const result = await runFullPolicyAnalysisPipeline(
      {
        rawText: samplePolicyText,
        appName: "TermsLens Cloud",
        documentType: "terms_of_service",
        documentTitle: "TermsLens Cloud Terms of Service",
      },
      {
        p01Options: { promptVersion: "v3" },
        p02Options: { promptVersion: "v3" },
        p03Options: { promptVersion: "v3" },
        p04Options: { promptVersion: "v3" },
        p05Options: { promptVersion: "v3" },
        onStageTransition: (stage, progress) => {
          console.log(`  ⏳ [Stage Transition] ${stage} (${progress}%)`);
        },
      }
    );

    if (!result.success || !result.data) {
      console.error("❌ Full Pipeline failed:", result.error);
      process.exit(1);
    }

    console.log("\n✅ Complete End-to-End P01 -> P05 Pipeline Successful!");
    console.log(`Report ID: ${result.data.id}`);
    console.log(`Total Clauses Analyzed: ${result.data.totalClausesAnalyzed}`);
    console.log(`High Attention Findings: ${result.data.highAttentionCount}`);
    console.log(`Moderate Attention Findings: ${result.data.moderateAttentionCount}`);
    console.log(`Privacy Findings Count: ${result.data.privacyFindings.length}`);
    console.log(`Verification Supported: ${result.data.verificationSummary.supportedCount}`);
    console.log(`Verification Rejected: ${result.data.verificationSummary.rejectedCount}`);

    // Verify schema contract
    const validation = validateAnalysisReport(result.data);
    if (!validation.isValid) {
      console.error("❌ Generated report failed AnalysisReport schema validation:", validation.errors);
      process.exit(1);
    }

    console.log("\nSample Assembled Clause:");
    const c1 = result.data.clauses[0];
    if (c1) {
      console.log(`  Clause ID: ${c1.id}`);
      console.log(`  Title: ${c1.title}`);
      console.log(`  Category: ${c1.category}`);
      console.log(`  Attention Level: ${c1.attentionLevel}`);
      console.log(`  Exact Quote: "${c1.evidence.exactQuote}"`);
      console.log(`  Verification: ${c1.verification.status} (${c1.verification.notes})`);
    }

    console.log("\nExecutive Summary Document Overview:");
    console.log(`  ${result.data.executiveSummary.documentOverview}`);

    console.log("\n=======================================================");
    console.log("Full P01 -> P05 Real Pipeline Test Passed!");
    console.log("=======================================================");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Unexpected error during pipeline test:", message);
    process.exit(1);
  }
}

main();
