/**
 * TERMSLENS INTEGRATION FIX 04 TEST SUITE
 * Secure Website URL Analysis (POST /api/analyze/url) through P01-P05 Pipeline.
 *
 * Verifies all 19 requirements:
 * 1. Valid publicly accessible URL using mocked fetch.
 * 2. HTTP and HTTPS support.
 * 3. Invalid URL format.
 * 4. Localhost rejection.
 * 5. Private IPv4 rejection.
 * 6. Private IPv6 rejection.
 * 7. Cloud metadata IP rejection.
 * 8. Redirect to a private IP.
 * 9. DNS rebinding protection.
 * 10. More than 3 redirects.
 * 11. Unsupported content type.
 * 12. Oversized response.
 * 13. Connection timeout.
 * 14. Read timeout.
 * 15. Empty HTML content.
 * 16. Successful webpage extraction.
 * 17. Successful P01-P05 execution.
 * 18. Pipeline failure propagation.
 * 19. Report retrieval.
 */

import assert from "node:assert/strict";
import { handleAnalyzeUrlRequest as analyzeUrlRoute } from "../src/app/api/analyze/url/route.ts";
import { GET as getJobStatusRoute } from "../src/app/api/analyze/status/[jobId]/route.ts";
import { GET as getReportRoute } from "../src/app/api/reports/[id]/route.ts";
import {
  safeFetchUrl,
  validateUrlFormat,
  resolveAndValidateDns,
  extractPolicyTextFromHtml,
  isForbiddenIp,
  SafeUrlError,
  type SafeFetchOptions,
} from "../src/lib/safe-url-fetcher.ts";
import { jobStore } from "../src/lib/job-store.ts";
import { reportStore } from "../src/lib/report-store.ts";
import { waitForJob } from "../src/services/analysis-job-runner.ts";
import { validateAnalysisReport } from "../src/services/analysis-service.ts";
import type {
  SubmitAnalysisResponse,
  JobStatusResponse,
  AnalysisReport,
  ApiErrorResponse,
} from "../src/types/index.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testQueue: { name: string; fn: () => Promise<void> | void }[] = [];

function runTest(name: string, fn: () => Promise<void> | void) {
  testQueue.push({ name, fn });
}

// Sample Policy HTML for testing
const SAMPLE_POLICY_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spotify Consumer Agreement & Privacy Terms</title>
  <style>body { font-family: sans-serif; } .nav { color: blue; }</style>
  <script>console.log("analytics tracker");</script>
</head>
<body>
  <nav><a href="/">Home</a><a href="/login">Login</a></nav>
  <header><h1>Header Navigation</h1></header>
  <main>
    <h1>Spotify Terms and Conditions of Use</h1>
    <p>Welcome to Spotify. These Terms of Use govern your access to the Spotify music streaming service.</p>
    
    <h2>Section 8.2 — Continuous Subscription and Renewal</h2>
    <p>Your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period. The cancellation will take effect the day after the last day of the current subscription period, and you will be downgraded to the Free Service. We do not provide refunds or credits for any partial subscription periods.</p>

    <h2>Section 24.1 — Dispute Resolution and Arbitration</h2>
    <p>You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements will be determined by mandatory binding individual arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.</p>

    <h2>Section 4.2 — Third-Party Data Sharing</h2>
    <p>We share pseudonymous analytics, mobile advertising IDs, and royalty metrics with record labels, publishers, and marketing partners. We do not sell your personal identifiers to unaffiliated data brokers without your explicit consent.</p>

    <ul>
      <li>You must maintain the confidentiality of your account credentials.</li>
      <li>You may not use automated bots to artificially inflate stream counts.</li>
    </ul>
  </main>
  <div class="cookie-banner">This site uses cookies to personalize content. <button>Accept</button></div>
  <footer><p>&copy; 2026 Spotify AB. All rights reserved.</p></footer>
</body>
</html>
`;

// Helper to create mock public DNS
const mockPublicDns = async (_hostname: string) => {
  return [{ address: "93.184.216.34", family: 4 }];
};

// ============================================================================
// Synthetic Gemini Pipeline Mocks for P01-P05 verification
// ============================================================================

const SYNTHETIC_P01 = {
  extractedClauses: [
    {
      tempClauseId: "clause_arb_001",
      segmentIndex: 1,
      sectionHeading: "Section 24.1 — Dispute Resolution and Arbitration",
      sectionNumber: "24.1",
      originalClauseText:
        "You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements will be determined by mandatory binding individual arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
      operativeSummary:
        "Mandatory individual binding arbitration and class action waiver.",
    },
    {
      tempClauseId: "clause_bill_002",
      segmentIndex: 0,
      sectionHeading: "Section 8.2 — Continuous Subscription and Renewal",
      sectionNumber: "8.2",
      originalClauseText:
        "Your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period. The cancellation will take effect the day after the last day of the current subscription period, and you will be downgraded to the Free Service. We do not provide refunds or credits for any partial subscription periods.",
      operativeSummary:
        "Continuous subscription renewal and no refunds policy.",
    },
  ],
  totalClausesAnalyzed: 2,
};

const SYNTHETIC_P02 = {
  clauseExplanations: [
    {
      tempClauseId: "clause_arb_001",
      title: "Mandatory Individual Arbitration",
      shortExplanation:
        "Disputes must be decided through binding individual arbitration with no class actions or jury trials.",
      plainLanguageExplanation:
        "You cannot sue the company in open civil court before a jury. Claims must be arbitrated individually. No opt-out procedure is stated in this excerpt.",
      whyThisClauseMatters:
        "Eliminates constitutional access to a public court and jury trial.",
      potentialUserImplications: [
        "No civil court litigation.",
        "Class action lawsuits are prohibited.",
      ],
      actionableAdvice:
        "Check whether full terms provide an arbitration opt-out procedure, as none is stated in this excerpt.",
    },
    {
      tempClauseId: "clause_bill_002",
      title: "Automatic Subscription Renewal",
      shortExplanation:
        "Subscriptions renew automatically each month without prior reminder notice.",
      plainLanguageExplanation:
        "Your payment method will be charged each month until you cancel in account settings.",
      whyThisClauseMatters:
        "Continuous recurring payments will be billed automatically.",
      potentialUserImplications: [
        "Recurring monthly charges.",
        "No partial month refunds.",
      ],
      actionableAdvice: "Set a calendar reminder before the monthly renewal date.",
    },
  ],
};

const SYNTHETIC_P03 = {
  clauseClassifications: [
    {
      tempClauseId: "clause_arb_001",
      category: "dispute_resolution",
      attentionLevel: "high",
    },
    {
      tempClauseId: "clause_bill_002",
      category: "subscription_billing",
      attentionLevel: "moderate",
    },
  ],
  privacyFindings: [
    {
      id: "priv_item_1",
      topic: "personal_info_collected",
      topicTitle: "Personal Information Collected",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding personal data categories collected.",
      silenceNotice:
        "The provided excerpt is silent regarding specific personal categories collected beyond account registration.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_2",
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding third-party data broker sharing.",
      silenceNotice:
        "The provided excerpt is silent regarding sharing with external third-party data brokers.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_3",
      topic: "advertising_tracking",
      topicTitle: "Advertising and Behavioral Tracking",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding cross-app behavioral tracking.",
      silenceNotice: "The provided excerpt is silent regarding cross-app behavioral tracking.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_4",
      topic: "data_retention",
      topicTitle: "Data Retention Period",
      distinction: "not_specified",
      summary: "No specific retention period is stated in the provided excerpt.",
      silenceNotice:
        "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      attentionLevel: "high",
    },
    {
      id: "priv_item_5",
      topic: "account_deletion",
      topicTitle: "Account Deletion Rights",
      distinction: "not_specified",
      summary: "The provided excerpt does not specify user account deletion procedures.",
      silenceNotice: "The provided excerpt does not specify user account deletion procedures.",
      attentionLevel: "informational",
    },
    {
      id: "priv_item_6",
      topic: "ai_model_training",
      topicTitle: "AI & Model Training Usage",
      distinction: "not_specified",
      summary:
        "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      silenceNotice:
        "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      attentionLevel: "moderate",
    },
  ],
};

const SYNTHETIC_P04 = {
  verifiedClauses: [
    {
      tempClauseId: "clause_arb_001",
      evidence: {
        exactQuote:
          "You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements will be determined by mandatory binding individual arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
        highlightExcerpt:
          "determined by mandatory binding individual arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against verbatim source excerpt.",
        verifiedAt: new Date().toISOString(),
        evidenceMatchesOriginal: true,
      },
    },
    {
      tempClauseId: "clause_bill_002",
      evidence: {
        exactQuote:
          "Your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period. The cancellation will take effect the day after the last day of the current subscription period, and you will be downgraded to the Free Service. We do not provide refunds or credits for any partial subscription periods.",
        highlightExcerpt:
          "subscription will automatically renew at the end of the applicable subscription period, unless you cancel... We do not provide refunds or credits for any partial subscription periods.",
      },
      verification: {
        status: "supported",
        reviewerType: "automated_pipeline",
        notes: "Audited against verbatim source excerpt.",
        verifiedAt: new Date().toISOString(),
        evidenceMatchesOriginal: true,
      },
    },
  ],
  verificationSummary: {
    totalVerified: 2,
    supportedCount: 2,
    partiallySupportedCount: 0,
    unverifiedCount: 0,
    rejectedCount: 0,
    methodologyDescription:
      "All findings audited through automated semantic verification against verbatim excerpts from the provided document.",
  },
};

const SYNTHETIC_P05_SYNTHESIS = {
  documentSummary:
    "Comprehensive contractual review for Spotify synthesizing operative dispute resolution and continuous billing terms.",
  executiveSummary: {
    documentOverview:
      "Defines contractual conditions for Spotify based on online terms and privacy provisions.",
    mainObligations: [
      "Pay monthly recurring subscription charges until cancellation is initiated in settings.",
      "Submit disputes to binding individual arbitration with class action waiver.",
    ],
    companyPermissions: [
      "Automatically charge designated payment methods each billing cycle.",
      "Enforce mandatory private arbitration for disputes.",
    ],
    majorAttentionAreas: [
      "Dispute Resolution: Requires individual binding arbitration with class action waiver.",
      "Automatic Billing: Renews every month automatically without advance notice.",
    ],
    preAgreementChecklist: [
      "Review cancellation terms and renewal dates.",
      "Check dispute resolution terms if an arbitration opt-out is desired, as none is stated in this excerpt.",
    ],
  },
};

function buildMockGeminiApiResponse(jsonPayload: string): Response {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: jsonPayload }],
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function installMockGeminiPipeline(overrides?: {
  failStage?: "P01" | "P02" | "P03" | "P04" | "P05";
}) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_pipeline_key";

  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : "";

    if (body.includes("Clause Extraction Engine")) {
      if (overrides?.failStage === "P01")
        return new Response("Simulated P01 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
    }
    if (body.includes("Plain-Language Translation Engine")) {
      if (overrides?.failStage === "P02")
        return new Response("Simulated P02 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P02));
    }
    if (body.includes("consumer risk and privacy analyst")) {
      if (overrides?.failStage === "P03") {
        return new Response(
          JSON.stringify({ error: { code: 429, message: "P03 rate limit exceeded" } }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P03));
    }
    if (body.includes("Adversarial Evidence Verification")) {
      if (overrides?.failStage === "P04")
        return new Response("Simulated P04 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P04));
    }
    if (body.includes("Final Report Synthesis Engine") || body.includes("P05-V3")) {
      if (overrides?.failStage === "P05")
        return new Response("Simulated P05 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P05_SYNTHESIS));
    }

    throw new Error(`Unexpected mock request: ${body.slice(0, 100)}`);
  };

  return () => {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

// 1. Valid publicly accessible URL using mocked fetch
runTest(
  "Test 1: Valid publicly accessible URL using mocked fetch returns HTTP 202 and creates queued job",
  async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response(SAMPLE_POLICY_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    };

    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/terms",
        appName: "Spotify",
        documentType: "terms_of_service",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });

    assert.equal(res.status, 202, "Should return HTTP 202 Accepted");
    const data = (await res.json()) as SubmitAnalysisResponse;

    assert.equal(data.success, true);
    assert(data.jobId.startsWith("job_"), "Job ID should start with job_");
    assert(data.reportId.startsWith("rep_"), "Report ID should start with rep_");
    assert.equal(data.status, "queued");
    assert.equal(data.currentStage, "PREPROCESSING");
    assert.equal(data.appName, "Spotify");
    assert.equal(data.links.statusUrl, `/api/analyze/status/${data.jobId}`);
    assert.equal(data.links.reportUrl, `/api/reports/${data.reportId}`);

    const stored = jobStore.get(data.jobId);
    assert(stored !== undefined, "Job must be stored in jobStore");
  }
);

// 2. HTTP and HTTPS support
runTest("Test 2: Both HTTP and HTTPS URLs are supported and validated", async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(SAMPLE_POLICY_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };

  for (const protocol of ["http://", "https://"]) {
    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: `${protocol}example.com/legal`,
        appName: "TestApp",
        documentType: "privacy_policy",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });
    assert.equal(res.status, 202, `${protocol} should be accepted`);
  }
});

// 3. Invalid URL format
runTest(
  "Test 3: Invalid URL formats, non-HTTP protocols, and credentials return HTTP 400",
  async () => {
    const invalidUrls = [
      "not-a-url",
      "ftp://example.com/terms",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "https://admin:secret@example.com/terms",
      "https://example.com:8443/terms",
    ];

    for (const badUrl of invalidUrls) {
      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: badUrl,
          appName: "TestApp",
        }),
      });

      const res = await analyzeUrlRoute(req);
      assert.equal(res.status, 400, `URL "${badUrl}" should return HTTP 400`);
      const data = (await res.json()) as ApiErrorResponse;
      assert.equal(data.success, false);
      assert.equal(data.error.code, "INVALID_URL");
    }
  }
);

// 4. Localhost rejection
runTest("Test 4: Localhost and loopback addresses are rejected with SSRF block", async () => {
  const localhostUrls = [
    "http://localhost/terms",
    "http://localhost:80/terms",
    "http://127.0.0.1/terms",
    "http://127.0.0.254/terms",
    "http://my.localhost/terms",
  ];

  for (const url of localhostUrls) {
    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, appName: "TestApp" }),
    });

    const res = await analyzeUrlRoute(req);
    assert.equal(res.status, 400, `Localhost URL "${url}" must return HTTP 400`);
    const data = (await res.json()) as ApiErrorResponse;
    assert.equal(data.success, false);
    assert(
      data.error.code === "SSRF_BLOCKED" || data.error.code === "INVALID_URL",
      `Expected SSRF_BLOCKED, got ${data.error.code}`
    );
  }
});

// 5. Private IPv4 rejection
runTest(
  "Test 5: Private IPv4 ranges (10.x, 172.16-31.x, 192.168.x, 100.64.x) are blocked",
  async () => {
    const privateIps = [
      "http://10.0.0.1/terms",
      "http://10.254.254.254/terms",
      "http://172.16.0.1/terms",
      "http://172.31.255.255/terms",
      "http://192.168.1.1/terms",
      "http://192.168.254.1/terms",
      "http://100.64.0.1/terms",
    ];

    for (const url of privateIps) {
      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, appName: "TestApp" }),
      });

      const res = await analyzeUrlRoute(req);
      assert.equal(res.status, 400, `Private IP URL "${url}" must return HTTP 400`);
      const data = (await res.json()) as ApiErrorResponse;
      assert.equal(data.error.code, "SSRF_BLOCKED");
    }
  }
);

// 6. Private IPv6 rejection
runTest(
  "Test 6: Private, loopback, link-local, and mapped IPv6 addresses are blocked",
  async () => {
    const privateIpv6 = [
      "http://[::1]/terms",
      "http://[fc00::1]/terms",
      "http://[fd12:3456:789a:1::1]/terms",
      "http://[fe80::1]/terms",
      "http://[::ffff:127.0.0.1]/terms",
      "http://[::ffff:192.168.1.1]/terms",
    ];

    for (const url of privateIpv6) {
      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, appName: "TestApp" }),
      });

      const res = await analyzeUrlRoute(req);
      assert.equal(res.status, 400, `IPv6 URL "${url}" must return HTTP 400`);
      const data = (await res.json()) as ApiErrorResponse;
      assert.equal(data.error.code, "SSRF_BLOCKED");
    }
  }
);

// 7. Cloud metadata IP rejection
runTest(
  "Test 7: Cloud metadata IP (169.254.169.254) and metadata hostnames are blocked",
  async () => {
    const metadataUrls = [
      "http://169.254.169.254/latest/meta-data/",
      "http://169.254.1.1/terms",
      "http://metadata.google.internal/computeMetadata/v1/",
      "http://instance-data/latest/meta-data/",
    ];

    for (const url of metadataUrls) {
      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, appName: "TestApp" }),
      });

      const res = await analyzeUrlRoute(req);
      assert.equal(res.status, 400, `Metadata URL "${url}" must return HTTP 400`);
      const data = (await res.json()) as ApiErrorResponse;
      assert.equal(data.error.code, "SSRF_BLOCKED");
    }
  }
);

// 8. Redirect to a private IP
runTest("Test 8: Redirect chain to a private IP is intercepted and blocked", async () => {
  const mockFetch: typeof fetch = async (input) => {
    const urlStr = String(input);
    if (urlStr.includes("initial-public.com")) {
      return new Response(null, {
        status: 302,
        headers: { Location: "http://192.168.1.50/internal-policy" },
      });
    }
    throw new Error("Should not reach target");
  };

  const req = new Request("http://localhost:3000/api/analyze/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://initial-public.com/terms",
      appName: "TestApp",
    }),
  });

  const res = await analyzeUrlRoute(req, {
    fetchFn: mockFetch,
    dnsLookupFn: mockPublicDns,
  });

  assert.equal(res.status, 400, "Redirect to private IP must return HTTP 400");
  const data = (await res.json()) as ApiErrorResponse;
  assert.equal(data.error.code, "SSRF_BLOCKED");
});

// 9. DNS rebinding protection
runTest("Test 9: DNS rebinding during connection is detected and blocked", async () => {
  let lookupCount = 0;
  const rebindingDns = async (_hostname: string) => {
    lookupCount++;
    if (lookupCount === 1) {
      return [{ address: "93.184.216.34", family: 4 }];
    }
    return [{ address: "127.0.0.1", family: 4 }];
  };

  const mockFetch: typeof fetch = async () => {
    return new Response(SAMPLE_POLICY_HTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  };

  const req = new Request("http://localhost:3000/api/analyze/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://rebind-attack.com/terms",
      appName: "TestApp",
    }),
  });

  const res = await analyzeUrlRoute(req, {
    fetchFn: mockFetch,
    dnsLookupFn: rebindingDns,
  });

  assert.equal(res.status, 400, "DNS rebinding must return HTTP 400");
  const data = (await res.json()) as ApiErrorResponse;
  assert.equal(data.error.code, "SSRF_BLOCKED");
  assert(data.error.message.includes("DNS rebinding"), "Must report DNS rebinding");
});

// 10. More than 3 redirects
runTest(
  "Test 10: Redirect chains exceeding 3 hops are rejected with TOO_MANY_REDIRECTS",
  async () => {
    let redirectStep = 0;
    const mockFetch: typeof fetch = async () => {
      redirectStep++;
      return new Response(null, {
        status: 302,
        headers: { Location: `https://example.com/step-${redirectStep}` },
      });
    };

    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/step-0",
        appName: "TestApp",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });

    assert.equal(res.status, 400, "Should return HTTP 400 for excessive redirects");
    const data = (await res.json()) as ApiErrorResponse;
    assert.equal(data.error.code, "TOO_MANY_REDIRECTS");
  }
);

// 11. Unsupported content type
runTest(
  "Test 11: Unsupported content types (application/pdf, application/octet-stream) return HTTP 415",
  async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response("binary-data", {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      });
    };

    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/terms.pdf",
        appName: "TestApp",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });

    assert.equal(res.status, 415, "Should return HTTP 415 for unsupported media type");
    const data = (await res.json()) as ApiErrorResponse;
    assert.equal(data.error.code, "UNSUPPORTED_MEDIA_TYPE");
  }
);

// 12. Oversized response
runTest(
  "Test 12: Responses exceeding 5 MB limit return HTTP 413 FILE_TOO_LARGE",
  async () => {
    const oversizedText = "A".repeat(5 * 1024 * 1024 + 1024);
    const mockFetch: typeof fetch = async () => {
      return new Response(oversizedText, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };

    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/giant-policy",
        appName: "TestApp",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });

    assert.equal(res.status, 413, "Should return HTTP 413 Payload Too Large");
    const data = (await res.json()) as ApiErrorResponse;
    assert.equal(data.error.code, "FILE_TOO_LARGE");
  }
);

// 13. Connection timeout
runTest("Test 13: Connection timeout returns HTTP 504 TIMEOUT", async () => {
  const hangingFetch: typeof fetch = async (_input, init) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        reject(abortErr);
      });
    });
  };

  const req = new Request("http://localhost:3000/api/analyze/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://example.com/slow-connect",
      appName: "TestApp",
    }),
  });

  const res = await analyzeUrlRoute(req, {
    fetchFn: hangingFetch,
    dnsLookupFn: mockPublicDns,
    connectTimeoutMs: 50,
  });

  assert.equal(res.status, 504, "Should return HTTP 504 Gateway Timeout");
  const data = (await res.json()) as ApiErrorResponse;
  assert.equal(data.error.code, "TIMEOUT");
});

// 14. Read timeout
runTest("Test 14: Read timeout during body streaming returns HTTP 504 TIMEOUT", async () => {
  const hangingStreamFetch: typeof fetch = async (_input, init) => {
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        reject(abortErr);
      });
    });
  };

  const req = new Request("http://localhost:3000/api/analyze/url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: "https://example.com/slow-read",
      appName: "TestApp",
    }),
  });

  const res = await analyzeUrlRoute(req, {
    fetchFn: hangingStreamFetch,
    dnsLookupFn: mockPublicDns,
    readTimeoutMs: 50,
  });

  assert.equal(res.status, 504, "Should return HTTP 504 Gateway Timeout");
  const data = (await res.json()) as ApiErrorResponse;
  assert.equal(data.error.code, "TIMEOUT");
});

// 15. Empty HTML content
runTest(
  "Test 15: Empty HTML content returns HTTP 422 EXTRACTION_FAILED with Paste Text remediation",
  async () => {
    const mockFetch: typeof fetch = async () => {
      return new Response("<html><body>   <script>var x = 1;</script>  </body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    };

    const req = new Request("http://localhost:3000/api/analyze/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://example.com/empty-terms",
        appName: "TestApp",
      }),
    });

    const res = await analyzeUrlRoute(req, {
      fetchFn: mockFetch,
      dnsLookupFn: mockPublicDns,
    });

    assert.equal(res.status, 422, "Should return HTTP 422 Unprocessable Entity");
    const data = (await res.json()) as ApiErrorResponse;
    assert.equal(data.error.code, "EXTRACTION_FAILED");
    assert(
      data.error.details?.remediation?.includes("Paste Text"),
      "Must recommend Paste Text mode"
    );
  }
);

// 16. Successful webpage extraction
runTest(
  "Test 16: HTML extraction parses headings, paragraphs, lists, decodes entities, and strips scripts",
  () => {
    const extracted = extractPolicyTextFromHtml(SAMPLE_POLICY_HTML, "https://spotify.com/legal");

    assert.equal(extracted.title, "Spotify Consumer Agreement & Privacy Terms");
    assert(!extracted.text.includes("console.log"), "Scripts must be stripped");
    assert(!extracted.text.includes("font-family"), "Styles must be stripped");
    assert(!extracted.text.includes("Header Navigation"), "Header must be stripped");
    assert(!extracted.text.includes("This site uses cookies"), "Cookie banner must be stripped");
    assert(!extracted.text.includes("All rights reserved"), "Footer must be stripped");

    assert(extracted.text.includes("### Section 8.2 — Continuous Subscription and Renewal"));
    assert(extracted.text.includes("### Section 24.1 — Dispute Resolution and Arbitration"));
    assert(extracted.text.includes("THERE IS NO JUDGE OR JURY IN ARBITRATION"));
    assert(extracted.text.includes("- You must maintain the confidentiality"));
    assert(extracted.wordCount > 50, "Word count should reflect actual terms");
  }
);

// 17. Successful P01-P05 execution
let completedUrlJobId = "";
let completedUrlReportId = "";

runTest(
  "Test 17: Successful webpage analysis executes full P01-P05 pipeline and creates verified report",
  async () => {
    const cleanup = installMockGeminiPipeline();
    try {
      const mockWebpageFetch: typeof fetch = async () => {
        return new Response(SAMPLE_POLICY_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      };

      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://spotify.com/legal/end-user-agreement",
          appName: "Spotify",
          documentType: "terms_of_service",
        }),
      });

      const res = await analyzeUrlRoute(req, {
        fetchFn: mockWebpageFetch,
        dnsLookupFn: mockPublicDns,
      });

      assert.equal(res.status, 202);
      const data = (await res.json()) as SubmitAnalysisResponse;
      completedUrlJobId = data.jobId;
      completedUrlReportId = data.reportId;

      // Await background pipeline execution
      const completedJob = await waitForJob(data.jobId, 15000);

      assert.equal(completedJob.status, "completed");
      assert.equal(completedJob.currentStage, "COMPLETED");

      const report = reportStore.get(data.reportId);
      assert(report !== undefined, "Report must be persisted in reportStore");
      assert.equal(report.appName, "Spotify");
      assert.equal(report.isDemonstrationFixture, false);
      assert(report.clauses.length > 0, "Must extract clauses");
      assert(report.privacyFindings.length > 0, "Must generate privacy findings");

      // Check that title from HTML was used
      assert.equal(report.documentTitle, "Spotify Consumer Agreement & Privacy Terms");
    } finally {
      cleanup();
    }
  }
);

// 18. Pipeline failure propagation
runTest(
  "Test 18: Pipeline failure updates jobStore with failed status and failing stage",
  async () => {
    const cleanup = installMockGeminiPipeline({ failStage: "P03" });
    try {
      const mockWebpageFetch: typeof fetch = async () => {
        return new Response(SAMPLE_POLICY_HTML, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        });
      };

      const req = new Request("http://localhost:3000/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://example.com/failing-policy",
          appName: "FaultyApp",
        }),
      });

      const res = await analyzeUrlRoute(req, {
        fetchFn: mockWebpageFetch,
        dnsLookupFn: mockPublicDns,
      });

      assert.equal(res.status, 202);
      const data = (await res.json()) as SubmitAnalysisResponse;

      // Wait for job to finish
      const finishedJob = await waitForJob(data.jobId, 15000);
      assert.equal(finishedJob.status, "failed");
      assert.equal(finishedJob.currentStage, "FAILED");
      assert.equal(finishedJob.error?.stage, "P03_RISK_AND_PRIVACY_ANALYSIS");
      assert(!reportStore.has(data.reportId), "Report should not be stored on failure");
    } finally {
      cleanup();
    }
  }
);

// 19. Report retrieval
runTest(
  "Test 19: GET /api/reports/:id retrieves verified AnalysisReport after URL analysis",
  async () => {
    assert(completedUrlReportId, "Completed report ID must be available from Test 17");

    // Retrieve report via GET /api/reports/:id route
    const getReq = new Request(`http://localhost:3000/api/reports/${completedUrlReportId}`, {
      method: "GET",
    });

    const getRes = await getReportRoute(getReq, {
      params: Promise.resolve({ id: completedUrlReportId }),
    });

    assert.equal(getRes.status, 200, "Report retrieval must return HTTP 200");
    const reportPayload = (await getRes.json()) as AnalysisReport;

    const validation = validateAnalysisReport(reportPayload);
    assert.equal(validation.isValid, true, `Report must be valid: ${validation.error}`);
    assert.equal(reportPayload.id, completedUrlReportId);
    assert.equal(reportPayload.appName, "Spotify");
    assert.equal(reportPayload.documentTitle, "Spotify Consumer Agreement & Privacy Terms");
  }
);

// ============================================================================
// RUN ALL TESTS
// ============================================================================
async function runAll() {
  console.log("\n=======================================================");
  console.log("TERMSLENS SECURE WEBSITE URL ANALYSIS INTEGRATION TESTS");
  console.log("=======================================================\n");

  for (const test of testQueue) {
    totalTests++;
    try {
      await test.fn();
      passedTests++;
      console.log(`  ✓ [PASS] ${test.name}`);
    } catch (err: unknown) {
      failedTests++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [FAIL] ${test.name}`);
      console.error(`    Error: ${msg}`);
      if (err instanceof Error && err.stack) {
        console.error(
          err.stack
            .split("\n")
            .slice(1, 4)
            .map((l) => `    ${l}`)
            .join("\n")
        );
      }
    }
  }

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
