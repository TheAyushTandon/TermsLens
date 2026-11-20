import { runP01P02Pipeline } from "../src/services/p02-plain-language-explanation.ts";
import { getGeminiApiKey } from "../src/lib/gemini.ts";

/**
 * End-to-end integration test: Policy Text -> P01 Clause Extraction -> P02 Plain-Language Explanation.
 */
async function main() {
  console.log("=======================================================");
  console.log("TermsLens P01 -> P02 Real Gemini Integration Pipeline Test");
  console.log("=======================================================");

  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️  GEMINI_API_KEY is not set. Skipping live API call.");
    process.exit(0);
  }

  console.log("🔑 GEMINI_API_KEY detected. Executing end-to-end P01 -> P02 pipeline...");

  const samplePolicyText = `
[Page 1]
Section 2. Automatic Billing & Refunds
Your subscription automatically renews on a monthly basis until you cancel. You authorize us to charge your payment method each month. Payments are strictly non-refundable and there are no credits for partially used billing periods. You may cancel at any time through your account settings.

[Page 2]
Section 7. Mandatory Arbitration & Class Action Waiver
You and TermsLens agree that any dispute arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.
`;

  try {
    const result = await runP01P02Pipeline(
      {
        rawText: samplePolicyText,
        appName: "TermsLens Cloud",
        documentType: "terms_of_service",
      },
      {
        p01Options: { promptVersion: "v3" },
        p02Options: { promptVersion: "v3" },
      }
    );

    if (!result.success || !result.data) {
      console.error("❌ Pipeline failed:", result.error);
      process.exit(1);
    }

    console.log("\n✅ End-to-End P01 -> P02 Pipeline Successful!");
    console.log(`Total Clauses Extracted by P01: ${result.data.p01.totalClausesAnalyzed}`);
    console.log(`Total Explanations Produced by P02: ${result.data.p02.clauseExplanations.length}`);
    console.log(`Combined Lineage Verification: ${result.data.combinedClauses.length} clauses linked`);

    console.log("\nSample Combined P01 -> P02 Output:");
    result.data.combinedClauses.slice(0, 2).forEach((item, idx) => {
      console.log(`\n-------------------------------------------------------`);
      console.log(`[Clause ${idx + 1}] ID: ${item.clause.tempClauseId}`);
      console.log(`  Source Section: ${item.clause.sectionHeading} (Page: ${item.clause.sourcePage})`);
      console.log(`  Verbatim Excerpt: "${item.clause.originalClauseText.slice(0, 80)}..."`);
      console.log(`  P02 Title: "${item.explanation.title}"`);
      console.log(`  Short Explanation: "${item.explanation.shortExplanation}"`);
      console.log(`  Plain Language: "${item.explanation.plainLanguageExplanation.slice(0, 100)}..."`);
      console.log(`  Why It Matters: "${item.explanation.whyThisClauseMatters}"`);
      console.log(`  User Implications: ${item.explanation.potentialUserImplications.join(" | ")}`);
      if (item.explanation.actionableAdvice) {
        console.log(`  Actionable Advice: "${item.explanation.actionableAdvice}"`);
      }
    });

    console.log("\n=======================================================");
    console.log("P01 -> P02 Pipeline Test Passed!");
    console.log("=======================================================");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Unexpected error during pipeline test:", message);
    process.exit(1);
  }
}

main();
