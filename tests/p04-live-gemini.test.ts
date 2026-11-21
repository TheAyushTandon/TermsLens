import { verifyEvidenceP04 } from "../src/services/p04-evidence-verification.ts";
import { getGeminiApiKey } from "../src/lib/gemini.ts";

async function main() {
  console.log("=======================================================");
  console.log("TermsLens P04 Real Gemini Verification Integration Test");
  console.log("=======================================================");

  const apiKey = getGeminiApiKey();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.log("ℹ️  GEMINI_API_KEY is not set. Skipping live API call.");
    process.exit(0);
  }

  console.log("🔑 GEMINI_API_KEY detected. Executing live adversarial verification...");

  // We test 2 items: 1 legitimate supported clause, and 1 negative failure case with an invented 30-day opt-out deadline
  const auditItems = [
    {
      tempClauseId: "clause_supported",
      originalClauseText: "Subscriptions renew automatically each month. You authorize us to bill your payment card monthly until cancellation.",
      explanation: {
        shortExplanation: "Your subscription renews automatically on a monthly schedule and charges your card.",
        potentialUserImplications: ["You will be billed every month until you cancel."],
      },
    },
    {
      tempClauseId: "clause_hallucinated",
      originalClauseText: "All disputes arising under this agreement shall be settled exclusively by individual binding arbitration.",
      explanation: {
        shortExplanation: "You must arbitrate disputes, but you have a 30-day window to opt out by mailing our office.",
        potentialUserImplications: ["You can opt out within 30 days."],
      },
    },
  ];

  try {
    const result = await verifyEvidenceP04(
      {
        auditItems,
        appName: "TermsLens Cloud",
        documentType: "terms_of_service",
      },
      {
        promptVersion: "v3",
      }
    );

    if (!result.success || !result.data) {
      console.error("❌ P04 verification failed:", result.error);
      process.exit(1);
    }

    console.log("\n✅ Live P04 Verification Succeeded!");
    console.log(`Audited: ${result.data.verificationSummary.totalVerified}`);
    console.log(`Supported: ${result.data.verificationSummary.supportedCount}`);
    console.log(`Rejected: ${result.data.verificationSummary.rejectedCount}`);
    console.log(`Partially Supported: ${result.data.verificationSummary.partiallySupportedCount}`);

    result.data.verifiedClauses.forEach((vc) => {
      console.log(`\n-------------------------------------------------------`);
      console.log(`[ID: ${vc.tempClauseId}] Status: ${vc.verification.status.toUpperCase()}`);
      console.log(`  Notes: ${vc.verification.notes}`);
      console.log(`  Quote: "${vc.evidence.exactQuote}"`);
      console.log(`  Evidence Matches Original: ${vc.verification.evidenceMatchesOriginal}`);
    });

    console.log("\n=======================================================");
    console.log("P04 Live Test Completed!");
    console.log("=======================================================");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Unexpected error:", message);
    process.exit(1);
  }
}

main();
