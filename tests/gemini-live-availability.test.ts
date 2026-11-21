/**
 * OPT-IN LIVE GEMINI AVAILABILITY TEST
 *
 * Verifies live Google Gemini API connectivity and validates that
 * gemini-3.5-flash-lite (or configured GEMINI_MODEL) is available, responsive,
 * and produces valid JSON.
 *
 * NOTE: This test is opt-in and will cleanly SKIP if GEMINI_API_KEY is not set.
 */

import assert from "node:assert/strict";
import { callGemini, getGeminiModel, extractJsonFromResponse } from "../src/lib/gemini.ts";

async function main() {
  console.log("=======================================================");
  console.log("TermsLens Live Gemini Model Availability Verification");
  console.log("=======================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const model = getGeminiModel();

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    console.log("  [SKIP] GEMINI_API_KEY is not configured in environment or .env.local.");
    console.log("  This opt-in live test was skipped without failure.");
    console.log("  To run: set GEMINI_API_KEY in .env.local or environment.\n");
    process.exit(0);
  }

  console.log(`Connecting to Google Gemini API using model: '${model}'...`);

  try {
    const prompt = `Return a JSON object in this exact schema: {"status": "available", "model": "${model}", "timestamp": "${new Date().toISOString()}"}`;
    const responseText = await callGemini(prompt, {
      responseMimeType: "application/json",
      temperature: 0.1,
    });

    assert(responseText, "Gemini must return non-empty text");
    const parsed: any = extractJsonFromResponse(responseText);

    assert(parsed && typeof parsed === "object", "Must parse as a valid JSON object");
    assert.equal(parsed.status, "available");
    console.log(`  ✓ [PASS] Successfully verified live model '${model}'. Response:`, parsed);
    console.log("\nLive Gemini availability test completed successfully.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`  ✗ [FAIL] Live Gemini verification failed:\n  ${msg}`);
    process.exit(1);
  }
}

main();
