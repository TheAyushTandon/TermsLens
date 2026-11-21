/**
 * TERMSLENS GEMINI CLIENT RELIABILITY & RESILIENCE TEST SUITE
 *
 * Verifies:
 * 1. Default model is gemini-3.5-flash-lite
 * 2. GEMINI_MODEL override is respected
 * 3. 429 rate limit triggers exponential backoff and retries
 * 4. Retry-After header and Google RetryInfo metadata are parsed and respected
 * 5. 429 permanent quota/billing failure throws immediately without retrying
 * 6. 401/403 authentication error throws immediately without retrying
 * 7. 400 bad request error throws immediately without retrying
 * 8. 503 server error succeeds on retry
 * 9. Network timeout aborts after threshold and retries
 * 10. Transient network error (ECONNRESET) recovers on retry
 * 11. Max retry exhaustion throws after 3 attempts
 * 12. extractJsonFromResponse cleans markdown code blocks and handles errors
 */

import assert from "node:assert/strict";
import {
  callGemini,
  getGeminiModel,
  parseRetryDelay,
  isPermanentQuotaFailure,
  isRetryableError,
  calculateBackoffDelay,
  extractJsonFromResponse,
  GeminiAuthError,
  GeminiPermanentQuotaError,
  GeminiRateLimitError,
  GeminiTimeoutError,
  GeminiError,
} from "../src/lib/gemini.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name: string, fn: () => Promise<void> | void) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err: unknown) {
    failedTests++;
    const msg = err instanceof Error ? err.stack || err.message : String(err);
    console.error(`  ✗ [FAIL] ${name}\n    ${msg}`);
  }
}

// Preserve original globals
const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function restoreEnvironment() {
  globalThis.fetch = originalFetch;
  process.env = { ...originalEnv };
}

async function runAllTests() {
  console.log("=======================================================");
  console.log("TermsLens Gemini Client Reliability & Resilience Tests");
  console.log("=======================================================\n");

  console.log("--- Group 1: Configuration & Defaults ---");

  await runTest("Default model is gemini-3.5-flash-lite", () => {
    delete process.env.GEMINI_MODEL;
    assert.equal(getGeminiModel(), "gemini-3.5-flash-lite");
  });

  await runTest("GEMINI_MODEL environment variable overrides default", () => {
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    assert.equal(getGeminiModel(), "gemini-2.0-flash");
    delete process.env.GEMINI_MODEL;
  });

  await runTest("Missing API key throws GeminiAuthError", async () => {
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, { apiKey: "" });
      },
      (err: any) => {
        assert(err instanceof GeminiAuthError);
        assert.equal(err.status, 401);
        return true;
      }
    );
  });

  console.log("\n--- Group 2: Retry Metadata & Delay Parsing ---");

  await runTest("Parses numeric Retry-After header in seconds to milliseconds", () => {
    const delay = parseRetryDelay("3", undefined);
    assert.equal(delay, 3000);
  });

  await runTest("Parses Google RPC RetryInfo duration string (e.g. '2.5s')", () => {
    const details = [
      {
        "@type": "type.googleapis.com/google.rpc.RetryInfo",
        retryDelay: "2.5s",
      },
    ];
    const delay = parseRetryDelay(null, details);
    assert.equal(delay, 2500);
  });

  await runTest("Exponential backoff calculates increasing delays with jitter", () => {
    const delay0 = calculateBackoffDelay(0, 100, 1000);
    const delay1 = calculateBackoffDelay(1, 100, 1000);
    const delay2 = calculateBackoffDelay(2, 100, 1000);

    assert(delay0 >= 100 && delay0 <= 150);
    assert(delay1 >= 200 && delay1 <= 300);
    assert(delay2 >= 400 && delay2 <= 600);
  });

  console.log("\n--- Group 3: HTTP 429 Classification (Permanent vs Transient) ---");

  await runTest("Identifies permanent billing/spend-cap quota failures", () => {
    assert.equal(
      isPermanentQuotaFailure(429, "Resource has been exhausted: check your plan and billing details."),
      true
    );
    assert.equal(
      isPermanentQuotaFailure(429, "Spend cap exceeded for this project."),
      true
    );
    assert.equal(
      isPermanentQuotaFailure(429, "Rate limit exceeded", [{ reason: "billing_disabled" }]),
      true
    );
    assert.equal(
      isPermanentQuotaFailure(429, "Rate limit exceeded", [{ reason: "spend_cap_exceeded" }]),
      true
    );
  });

  await runTest("Identifies transient rate-limit failures", () => {
    assert.equal(
      isPermanentQuotaFailure(429, "Quota exceeded for quota metric 'Requests' and limit 'Requests per minute'"),
      false
    );
  });

  await runTest("Permanent quota failure throws GeminiPermanentQuotaError without retrying", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          error: {
            code: 429,
            message: "You have exceeded your current quota, please check your plan and billing details.",
            status: "RESOURCE_EXHAUSTED",
          },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    };

    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, {
          apiKey: "test-key",
          maxRetries: 3,
          baseDelayMs: 10,
        });
      },
      (err: any) => {
        assert(err instanceof GeminiPermanentQuotaError);
        assert.equal(err.isRetryable, false);
        return true;
      }
    );

    // Verifies it was NOT retried
    assert.equal(callCount, 1, "Permanent quota failure must fail immediately on first attempt.");
  });

  console.log("\n--- Group 4: Non-Retryable Client Errors (400, 401, 403, Safety) ---");

  await runTest("401/403 Authentication error fails immediately without retrying", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: "API key not valid. Please pass a valid API key.",
            status: "PERMISSION_DENIED",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    };

    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, {
          apiKey: "bad-key",
          maxRetries: 3,
          baseDelayMs: 10,
        });
      },
      (err: any) => {
        assert(err instanceof GeminiAuthError);
        assert.equal(err.status, 403);
        assert.equal(err.isRetryable, false);
        return true;
      }
    );

    assert.equal(callCount, 1, "Auth failure must not be retried.");
  });

  await runTest("400 Bad Request fails immediately without retrying", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          error: {
            code: 400,
            message: "Invalid JSON payload received.",
            status: "INVALID_ARGUMENT",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    };

    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, {
          apiKey: "test-key",
          maxRetries: 3,
          baseDelayMs: 10,
        });
      },
      (err: any) => {
        assert(err instanceof GeminiError);
        assert.equal(err.status, 400);
        assert.equal(err.isRetryable, false);
        return true;
      }
    );

    assert.equal(callCount, 1, "Bad request must not be retried.");
  });

  await runTest("SAFETY block fails immediately without retrying", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "SAFETY",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, {
          apiKey: "test-key",
          maxRetries: 3,
          baseDelayMs: 10,
        });
      },
      (err: any) => {
        assert(err instanceof GeminiError);
        assert(err.message.includes("safety"));
        return true;
      }
    );

    assert.equal(callCount, 1);
  });

  console.log("\n--- Group 5: Transient Error Retries & Recovery ---");

  await runTest("Transient 429 rate limit recovers on second attempt with backoff", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Rate limit exceeded (requests per minute)",
              status: "RESOURCE_EXHAUSTED",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "0.05s", // 50ms
                },
              ],
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Analysis generated successfully" }] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await callGemini("test prompt", undefined, {
      apiKey: "test-key",
      maxRetries: 3,
      baseDelayMs: 20,
    });

    assert.equal(callCount, 2);
    assert.equal(result, "Analysis generated successfully");
  });

  await runTest("Transient 503 Service Unavailable recovers on retry", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("Service temporarily overloaded", { status: 503 });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Recovered output" }] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await callGemini("test prompt", undefined, {
      apiKey: "test-key",
      maxRetries: 3,
      baseDelayMs: 10,
    });

    assert.equal(callCount, 2);
    assert.equal(result, "Recovered output");
  });

  await runTest("Network connection error (ECONNRESET) recovers on retry", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("read ECONNRESET");
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Socket recovered" }] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await callGemini("test prompt", undefined, {
      apiKey: "test-key",
      maxRetries: 3,
      baseDelayMs: 10,
    });

    assert.equal(callCount, 2);
    assert.equal(result, "Socket recovered");
  });

  await runTest("Request timeout triggers retry with GeminiTimeoutError", async () => {
    let callCount = 0;
    globalThis.fetch = async (_url, options: any) => {
      callCount++;
      if (callCount === 1) {
        // Wait until aborted by signal
        return new Promise((_, reject) => {
          options?.signal?.addEventListener("abort", () => {
            const err = new Error("This operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "Fast second response" }] },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const result = await callGemini("test prompt", undefined, {
      apiKey: "test-key",
      timeoutMs: 50, // 50ms timeout
      maxRetries: 3,
      baseDelayMs: 10,
    });

    assert.equal(callCount, 2);
    assert.equal(result, "Fast second response");
  });

  await runTest("Exhaustion of all 3 retries throws final error", async () => {
    let callCount = 0;
    globalThis.fetch = async () => {
      callCount++;
      return new Response("Persistent backend crash", { status: 500 });
    };

    await assert.rejects(
      async () => {
        await callGemini("test prompt", undefined, {
          apiKey: "test-key",
          maxRetries: 3,
          baseDelayMs: 10,
        });
      },
      (err: any) => {
        assert(err instanceof GeminiError);
        assert.equal(err.status, 500);
        return true;
      }
    );

    assert.equal(callCount, 4, "Must attempt initial call + 3 retries = 4 total calls.");
  });

  console.log("\n--- Group 6: JSON Parser Resilience ---");

  await runTest("extractJsonFromResponse parses clean JSON", () => {
    const parsed = extractJsonFromResponse('{"key": "value"}');
    assert.deepEqual(parsed, { key: "value" });
  });

  await runTest("extractJsonFromResponse strips markdown ```json code blocks", () => {
    const raw = "```json\n{\n  \"status\": \"ok\"\n}\n```";
    const parsed = extractJsonFromResponse(raw);
    assert.deepEqual(parsed, { status: "ok" });
  });

  await runTest("extractJsonFromResponse throws descriptive error on malformed JSON", () => {
    assert.throws(
      () => {
        extractJsonFromResponse("not valid json at all");
      },
      (err: any) => {
        assert(err.message.includes("Failed to parse Gemini output as JSON"));
        return true;
      }
    );
  });

  restoreEnvironment();

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  restoreEnvironment();
  console.error("Unhandled error:", err);
  process.exit(1);
});
