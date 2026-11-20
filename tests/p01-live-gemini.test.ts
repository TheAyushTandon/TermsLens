import { extractClausesP01 } from "../src/services/p01-clause-extraction.ts";
import { getGeminiApiKey } from "../src/lib/gemini.ts";

/**
 * Live test script for P01 Clause Extraction with Gemini.
 * Will only execute live calls when GEMINI_API_KEY is present.
 */
async function main() {
  console.log("=======================================================");
  console.log("TermsLens P01 Live Gemini Integration Test");
  console.log("=======================================================");

  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️  GEMINI_API_KEY is not set. Skipping live API call.");
    console.log("To run live Gemini extraction, execute with:");
    console.log("  export GEMINI_API_KEY='your-key-here'");
    console.log("  node --experimental-strip-types tests/p01-live-gemini.test.ts");
    console.log("=======================================================");
    process.exit(0);
  }

  console.log("🔑 GEMINI_API_KEY detected. Executing live extraction test...");

  const samplePolicyText = `
[Page 1]
Section 1. Subscriptions and Payments
Your TermsLens Premium subscription will automatically renew at the end of each billing cycle unless you cancel it before the renewal date. By subscribing, you authorize us to charge your designated payment method recurring monthly fees. All subscription payments are strictly non-refundable and no prorated refunds or credits are issued for partially used months.

[Page 2]
Section 4. Data Sharing and Advertising
We do not sell your personal identifying information to data brokers. However, we may share pseudonymous browsing metrics, unique mobile advertising identifiers, and aggregated interaction logs with our third-party advertising partners for cross-context behavioral targeting.

[Page 3]
Section 14. Dispute Resolution & Arbitration
Any dispute, controversy, or claim arising out of or relating to this agreement shall be settled exclusively by confidential, binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules. You expressly waive your constitutional right to a jury trial and agree that you may only bring claims against us in your individual capacity, and not as a plaintiff or class member in any class or representative proceeding.
`;

  try {
    const result = await extractClausesP01(
      {
        rawText: samplePolicyText,
        appName: "TermsLens Premium",
        documentType: "terms_of_service",
      },
      {
        promptVersion: "v3",
        strictVerbatimCheck: true,
      }
    );

    if (!result.success || !result.data) {
      console.error("❌ Live extraction failed:", result.error);
      process.exit(1);
    }

    console.log("\n✅ Live Extraction Successful!");
    console.log(`Model: ${result.metadata?.model}`);
    console.log(`Prompt Version: ${result.metadata?.promptVersion}`);
    console.log(`Execution Time: ${result.metadata?.durationMs}ms`);
    console.log(`Segments Processed: ${result.metadata?.segmentsProcessed}`);
    console.log(`Verbatim Verification Rate: ${(result.metadata?.verbatimVerificationRate! * 100).toFixed(1)}%`);
    console.log(`Total Clauses Extracted: ${result.data.totalClausesAnalyzed}\n`);

    console.log("Sample Extracted Clauses:");
    result.data.extractedClauses.slice(0, 3).forEach((clause, idx) => {
      console.log(`\n[Clause ${idx + 1}] ID: ${clause.tempClauseId}`);
      console.log(`  Section: ${clause.sectionHeading} (Page: ${clause.sourcePage})`);
      console.log(`  Summary: ${clause.operativeSummary}`);
      console.log(`  Original Quote: "${clause.originalClauseText.slice(0, 90)}..."`);
    });

    console.log("\n=======================================================");
    console.log("Live Gemini test passed!");
    console.log("=======================================================");
  } catch (err: any) {
    console.error("❌ Unexpected error during live test:", err);
    process.exit(1);
  }
}

main();
