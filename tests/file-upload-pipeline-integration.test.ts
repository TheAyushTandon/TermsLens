/**
 * TERMSLENS INTEGRATION FIX 03 TEST SUITE
 * Real File Upload Analysis (POST /api/analyze/file) through P01-P05 Pipeline.
 *
 * Verifies:
 * 1. Valid PDF upload
 * 2. Valid DOCX upload
 * 3. Valid TXT upload
 * 4. Unsupported file type (415 UNSUPPORTED_FILE_TYPE)
 * 5. File above 25 MB (413 FILE_TOO_LARGE)
 * 6. Empty file (400 INVALID_DOCUMENT)
 * 7. Corrupted PDF (400/415/422)
 * 8. Scanned PDF without extractable text (422 EXTRACTION_FAILED)
 * 9. Successful upload through P01-P05 with preserved page references
 * 10. Extraction failure (insufficient words)
 * 11. Pipeline failure propagation (P03 failure recorded in jobStore)
 * 12. Report retrieval after successful upload
 */

import assert from "node:assert/strict";
import zlib from "node:zlib";
import { POST as uploadFileRoute } from "../src/app/api/analyze/file/route.ts";
import { GET as getJobStatusRoute } from "../src/app/api/analyze/status/[jobId]/route.ts";
import { GET as getReportRoute } from "../src/app/api/reports/[id]/route.ts";
import { jobStore } from "../src/lib/job-store.ts";
import { reportStore } from "../src/lib/report-store.ts";
import { waitForJob } from "../src/services/analysis-job-runner.ts";
import { validateAnalysisReport } from "../src/services/analysis-service.ts";
import type {
  SubmitAnalysisResponse,
  JobStatusResponse,
  AnalysisReport,
} from "../src/types/index.ts";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const testQueue: { name: string; fn: () => Promise<void> | void }[] = [];

function runTest(name: string, fn: () => Promise<void> | void) {
  testQueue.push({ name, fn });
}

// ============================================================================
// Synthetic Document Generators
// ============================================================================

/**
 * Builds a valid multi-page PDF buffer with FlateDecode compressed content streams.
 */
function createSyntheticPdf(pages: { pageNum: number; heading: string; text: string }[]): Buffer {
  let pdf = "%PDF-1.4\n";
  const objects: string[] = [];

  // 1: Catalog, 2: Pages
  const pageObjNums: number[] = [];
  let nextObjNum = 3;

  for (let i = 0; i < pages.length; i++) {
    const pageObjNum = nextObjNum++;
    const contentObjNum = nextObjNum++;
    pageObjNums.push(pageObjNum);

    const streamRaw =
      `BT /F1 12 Tf 72 712 Td (${pages[i].heading}) Tj ` +
      `0 -20 Td (${pages[i].text}) Tj ET`;
    const deflated = zlib.deflateSync(Buffer.from(streamRaw, "latin1"));

    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /Contents ${contentObjNum} 0 R >>\nendobj`
    );
    objects.push(
      `${contentObjNum} 0 obj\n<< /Filter /FlateDecode /Length ${deflated.length} >>\nstream\n` +
        deflated.toString("binary") +
        "\nendstream\nendobj"
    );
  }

  const catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj";
  const pagesObj = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj`;

  pdf += catalog + "\n" + pagesObj + "\n" + objects.join("\n") + "\n";
  pdf += "xref\n0 10\n0000000000 65535 f \ntrailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n500\n%%EOF";

  return Buffer.from(pdf, "binary");
}

/**
 * Builds a valid synthetic DOCX buffer (OpenXML ZIP with word/document.xml).
 */
function createSyntheticDocx(paragraphs: { heading?: string; text: string }[]): Buffer {
  let bodyXml = "";
  for (const p of paragraphs) {
    if (p.heading) {
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${p.heading}</w:t></w:r></w:p>`;
    }
    bodyXml += `<w:p><w:r><w:t>${p.text}</w:t></w:r></w:p>`;
  }

  const xmlContent = Buffer.from(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${bodyXml}</w:body></w:document>`,
    "utf-8"
  );

  const deflated = zlib.deflateRawSync(xmlContent);
  const entryName = Buffer.from("word/document.xml", "utf-8");

  // Local file header (30 bytes)
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8); // Deflate
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(deflated.length, 18);
  localHeader.writeUInt32LE(xmlContent.length, 22);
  localHeader.writeUInt16LE(entryName.length, 26);
  localHeader.writeUInt16LE(0, 28);

  const localOffset = 0;
  // Central directory header (46 bytes)
  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0);
  cdHeader.writeUInt16LE(20, 4);
  cdHeader.writeUInt16LE(20, 6);
  cdHeader.writeUInt16LE(0, 8);
  cdHeader.writeUInt16LE(8, 10);
  cdHeader.writeUInt16LE(0, 12);
  cdHeader.writeUInt16LE(0, 14);
  cdHeader.writeUInt32LE(0, 16);
  cdHeader.writeUInt32LE(deflated.length, 20);
  cdHeader.writeUInt32LE(xmlContent.length, 24);
  cdHeader.writeUInt16LE(entryName.length, 28);
  cdHeader.writeUInt16LE(0, 30);
  cdHeader.writeUInt16LE(0, 32);
  cdHeader.writeUInt16LE(0, 34);
  cdHeader.writeUInt16LE(0, 36);
  cdHeader.writeUInt32LE(0, 38);
  cdHeader.writeUInt32LE(localOffset, 42);

  const cdOffset = localHeader.length + entryName.length + deflated.length;
  const cdSize = cdHeader.length + entryName.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localHeader, entryName, deflated, cdHeader, entryName, eocd]);
}

/**
 * Builds a synthetic scanned-only PDF (contains /Image but 0 text operators).
 */
function createSyntheticScannedPdf(): Buffer {
  const pdf =
    "%PDF-1.4\n" +
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im1 4 0 R >> >> >>\nendobj\n" +
    "4 0 obj\n<< /Type /XObject /Subtype /Image /Width 100 /Height 100 /ColorSpace /DeviceRGB /BitsPerComponent 8 >>\nstream\n" +
    "fake-image-bytes-raw-binary-data\nendstream\nendobj\n" +
    "xref\n0 5\n0000000000 65535 f \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n200\n%%EOF";
  return Buffer.from(pdf, "binary");
}

// ============================================================================
// Synthetic Gemini Fixtures for End-to-End Pipeline
// ============================================================================

const SYNTHETIC_P01 = {
  extractedClauses: [
    {
      tempClauseId: "clause_arb_001",
      segmentIndex: 1,
      sectionHeading: "Section 7. Mandatory Arbitration & Dispute Resolution",
      sectionNumber: "7",
      sourcePage: 2,
      originalClauseText:
        "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
      operativeSummary:
        "Mandatory individual binding arbitration and class action waiver.",
    },
    {
      tempClauseId: "clause_bill_002",
      segmentIndex: 0,
      sectionHeading: "Section 2. Automatic Billing & Subscriptions",
      sectionNumber: "2",
      sourcePage: 1,
      originalClauseText:
        "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
      operativeSummary:
        "Monthly recurring subscription billing and renewal.",
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
      silenceNotice: "The provided excerpt is silent regarding specific personal categories collected beyond account registration.",
      attentionLevel: "moderate",
    },
    {
      id: "priv_item_2",
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: "not_specified",
      summary: "The provided excerpt is silent regarding third-party data broker sharing.",
      silenceNotice: "The provided excerpt is silent regarding sharing with external third-party data brokers.",
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
      summary: "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      silenceNotice: "The agreement is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
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
          "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
        highlightExcerpt:
          "resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial",
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
          "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
        highlightExcerpt:
          "subscription will automatically renew on a monthly basis until you cancel",
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
    "Comprehensive contractual review for FileUpload Cloud synthesizing operative dispute resolution and billing terms.",
  executiveSummary: {
    documentOverview:
      "Defines contractual conditions for FileUpload Cloud based on uploaded PDF agreement provisions.",
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

function installMockGeminiPipeline(overrides?: { failStage?: "P01" | "P02" | "P03" | "P04" | "P05" }) {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "test_synthetic_pipeline_key";

  globalThis.fetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : "";

    if (body.includes("Clause Extraction Engine")) {
      if (overrides?.failStage === "P01") return new Response("Simulated P01 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P01));
    }
    if (body.includes("Plain-Language Translation Engine")) {
      if (overrides?.failStage === "P02") return new Response("Simulated P02 failure", { status: 500 });
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
      if (overrides?.failStage === "P04") return new Response("Simulated P04 failure", { status: 500 });
      return buildMockGeminiApiResponse(JSON.stringify(SYNTHETIC_P04));
    }
    if (body.includes("Final Report Synthesis Engine") || body.includes("P05-V3")) {
      if (overrides?.failStage === "P05") return new Response("Simulated P05 failure", { status: 500 });
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
// TEST SUITE: 12 REQUIRED SCENARIOS
// ============================================================================

console.log("=======================================================");
console.log("TERMSLENS REAL FILE UPLOAD PIPELINE INTEGRATION TESTS");
console.log("=======================================================\n");

// 1. Valid PDF upload
runTest("Test 1: Valid PDF upload returns HTTP 202 and creates queued job", async () => {
  const pdfBuffer = createSyntheticPdf([
    {
      pageNum: 1,
      heading: "Section 2. Automatic Billing & Subscriptions",
      text: "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
    },
    {
      pageNum: 2,
      heading: "Section 7. Mandatory Arbitration & Dispute Resolution",
      text: "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
    },
  ]);

  const formData = new FormData();
  formData.append("file", new File([pdfBuffer], "cloud_policy.pdf", { type: "application/pdf" }));
  formData.append("appName", "CloudPdfApp");
  formData.append("documentType", "terms_of_service");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 202, "Must return HTTP 202 Accepted");
  const body = (await res.json()) as SubmitAnalysisResponse;
  assert.equal(body.success, true);
  assert.ok(body.jobId.startsWith("job_live_cloudpdfapp_"));
  assert.ok(body.reportId.startsWith("rep_live_cloudpdfapp_"));
  assert.equal(body.appName, "CloudPdfApp");
  assert.equal(body.currentStage, "PREPROCESSING");
  assert.equal(body.status, "queued");

  // Verify job state stored in jobStore
  assert.ok(jobStore.has(body.jobId));
});

// 2. Valid DOCX upload
runTest("Test 2: Valid DOCX upload extracts paragraphs and returns HTTP 202", async () => {
  const docxBuffer = createSyntheticDocx([
    {
      heading: "Section 2. Automatic Billing & Subscriptions",
      text: "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
    },
    {
      heading: "Section 7. Mandatory Arbitration & Dispute Resolution",
      text: "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
    },
  ]);

  const formData = new FormData();
  formData.append(
    "file",
    new File([docxBuffer], "terms.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    })
  );
  formData.append("appName", "DocxApp");
  formData.append("documentType", "terms_of_service");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 202);
  const body = (await res.json()) as SubmitAnalysisResponse;
  assert.equal(body.success, true);
  assert.ok(body.jobId.startsWith("job_live_docxapp_"));
  assert.ok(jobStore.has(body.jobId));
});

// 3. Valid TXT upload
runTest("Test 3: Valid TXT upload extracts text safely and returns HTTP 202", async () => {
  const txtContent = `[Page 1]
Section 2. Automatic Billing & Subscriptions
Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.

[Page 2]
Section 7. Mandatory Arbitration & Dispute Resolution
You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.`;

  const formData = new FormData();
  formData.append("file", new File([Buffer.from(txtContent, "utf-8")], "policy.txt", { type: "text/plain" }));
  formData.append("appName", "TxtApp");
  formData.append("documentType", "terms_of_service");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 202);
  const body = (await res.json()) as SubmitAnalysisResponse;
  assert.equal(body.success, true);
  assert.ok(body.jobId.startsWith("job_live_txtapp_"));
  assert.ok(jobStore.has(body.jobId));
});

// 4. Unsupported file type (415 UNSUPPORTED_FILE_TYPE)
runTest("Test 4: Unsupported file extension or binary format returns HTTP 415", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new File([Buffer.from("MZfake-executable-header")], "malicious.exe", {
      type: "application/x-msdownload",
    })
  );
  formData.append("appName", "BadApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 415);
  const body = await res.json();
  assert.equal(body.error.code, "UNSUPPORTED_FILE_TYPE");
  assert.equal(body.error.stage, "PREPROCESSING");
});

// 5. File above 25 MB (413 FILE_TOO_LARGE)
runTest("Test 5: File exceeding 25 MB limit returns HTTP 413", async () => {
  // Allocate 25 MB + 1024 bytes buffer
  const largeBuffer = Buffer.alloc(25 * 1024 * 1024 + 1024);
  largeBuffer.write("%PDF-1.4\n", 0);

  const formData = new FormData();
  formData.append("file", new File([largeBuffer], "oversized.pdf", { type: "application/pdf" }));
  formData.append("appName", "LargeApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 413);
  const body = await res.json();
  assert.equal(body.error.code, "FILE_TOO_LARGE");
});

// 6. Empty file (400 INVALID_DOCUMENT)
runTest("Test 6: Empty 0-byte file returns HTTP 400 INVALID_DOCUMENT", async () => {
  const formData = new FormData();
  formData.append("file", new File([Buffer.alloc(0)], "empty.pdf", { type: "application/pdf" }));
  formData.append("appName", "EmptyApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "INVALID_DOCUMENT");
});

// 7. Corrupted PDF
runTest("Test 7: Corrupted PDF file returns HTTP 400 or 415 error", async () => {
  const corruptBuffer = Buffer.from("Not a real PDF file content at all", "utf-8");

  const formData = new FormData();
  formData.append("file", new File([corruptBuffer], "corrupt.pdf", { type: "application/pdf" }));
  formData.append("appName", "CorruptApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.ok(res.status === 400 || res.status === 415, `Expected 400 or 415, got ${res.status}`);
  const body = await res.json();
  assert.ok(body.error);
});

// 8. Scanned PDF without extractable text (422 EXTRACTION_FAILED)
runTest("Test 8: Scanned image-only PDF is rejected with clear OCR remediation message", async () => {
  const scannedPdf = createSyntheticScannedPdf();

  const formData = new FormData();
  formData.append("file", new File([scannedPdf], "scanned_invoice.pdf", { type: "application/pdf" }));
  formData.append("appName", "ScannedApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 422, "Scanned PDF must return HTTP 422 Unprocessable Entity");
  const body = await res.json();
  assert.equal(body.error.code, "EXTRACTION_FAILED");
  assert.ok(
    body.error.message.includes("Scanned or image-based PDF detected") ||
      body.error.message.includes("does not support image OCR"),
    "Error message must transparently explain absence of OCR"
  );
});

// 9. Successful upload through P01-P05 with preserved page references
let completedUploadJobId = "";
let completedUploadReportId = "";

runTest("Test 9: Successful PDF upload runs full P01-P05 pipeline and preserves page metadata", async () => {
  const cleanup = installMockGeminiPipeline();
  try {
    const pdfBuffer = createSyntheticPdf([
      {
        pageNum: 1,
        heading: "Section 2. Automatic Billing & Subscriptions",
        text: "Your subscription will automatically renew on a monthly basis until you cancel. You authorize us to charge your designated payment method each month.",
      },
      {
        pageNum: 2,
        heading: "Section 7. Mandatory Arbitration & Dispute Resolution",
        text: "You and TermsLens agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively through individual binding arbitration, and you expressly waive any right to participate in a class action lawsuit or jury trial.",
      },
    ]);

    const formData = new FormData();
    formData.append("file", new File([pdfBuffer], "pipeline_contract.pdf", { type: "application/pdf" }));
    formData.append("appName", "FileUpload Cloud");
    formData.append("documentType", "terms_of_service");

    const res = await uploadFileRoute(
      new Request("http://localhost:3000/api/analyze/file", {
        method: "POST",
        body: formData,
      })
    );

    assert.equal(res.status, 202);
    const body = (await res.json()) as SubmitAnalysisResponse;
    completedUploadJobId = body.jobId;
    completedUploadReportId = body.reportId;

    // Await background execution
    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "completed");
    assert.equal(finishedJob.currentStage, "COMPLETED");
    assert.ok(finishedJob.completedAt);

    // Verify stored report
    const report = reportStore.get(body.reportId);
    assert.ok(report);
    assert.equal(report.id, body.reportId);
    assert.equal(report.clauses.length, 2);

    // Page numbers must be preserved
    const arb = report.clauses.find((c) => c.id === "clause_arb_001");
    assert.ok(arb);
    assert.equal(arb.evidence.sourcePage, 2);
    assert.equal(arb.evidence.sectionNumber, "7");

    const bill = report.clauses.find((c) => c.id === "clause_bill_002");
    assert.ok(bill);
    assert.equal(bill.evidence.sourcePage, 1);
  } finally {
    cleanup();
  }
});

// 10. Extraction failure (insufficient words)
runTest("Test 10: Document with insufficient words returns HTTP 422 EXTRACTION_FAILED", async () => {
  const shortTxt = "Short text only five words.";
  const formData = new FormData();
  formData.append("file", new File([Buffer.from(shortTxt, "utf-8")], "short.txt", { type: "text/plain" }));
  formData.append("appName", "ShortApp");

  const res = await uploadFileRoute(
    new Request("http://localhost:3000/api/analyze/file", {
      method: "POST",
      body: formData,
    })
  );

  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.error.code, "EXTRACTION_FAILED");
});

// 11. Pipeline failure propagation (P03 failure recorded in jobStore)
runTest("Test 11: Pipeline failure halts job and marks failing stage in jobStore without persisting report", async () => {
  const cleanup = installMockGeminiPipeline({ failStage: "P03" });
  try {
    const pdfBuffer = createSyntheticPdf([
      {
        pageNum: 1,
        heading: "Section 2. Billing",
        text: "Your subscription renews automatically until you cancel.",
      },
      {
        pageNum: 2,
        heading: "Section 7. Arbitration",
        text: "All disputes must be decided by mandatory binding individual arbitration.",
      },
    ]);

    const formData = new FormData();
    formData.append("file", new File([pdfBuffer], "fail_policy.pdf", { type: "application/pdf" }));
    formData.append("appName", "FailApp");

    const res = await uploadFileRoute(
      new Request("http://localhost:3000/api/analyze/file", {
        method: "POST",
        body: formData,
      })
    );

    assert.equal(res.status, 202);
    const body = (await res.json()) as SubmitAnalysisResponse;

    const finishedJob = await waitForJob(body.jobId);
    assert.equal(finishedJob.status, "failed");
    assert.equal(finishedJob.currentStage, "FAILED");
    assert.ok(finishedJob.error);
    assert.equal(finishedJob.error.stage, "P03_RISK_AND_PRIVACY_ANALYSIS");

    // Report must not be saved
    assert.equal(reportStore.has(body.reportId), false);
  } finally {
    cleanup();
  }
});

// 12. Report retrieval after successful upload
runTest("Test 12: GET /api/reports/:id retrieves verified AnalysisReport after successful file upload", async () => {
  assert.ok(completedUploadReportId, "Must have completed report from Test 9");

  const reportReq = new Request(
    `http://localhost:3000/api/reports/${encodeURIComponent(completedUploadReportId)}`
  );
  const reportRes = await getReportRoute(reportReq, {
    params: Promise.resolve({ id: completedUploadReportId }),
  });

  assert.equal(reportRes.status, 200);
  const retrievedReport = (await reportRes.json()) as AnalysisReport;
  assert.equal(retrievedReport.id, completedUploadReportId);
  assert.equal(retrievedReport.appName, "FileUpload Cloud");

  const validation = validateAnalysisReport(retrievedReport);
  assert.equal(validation.isValid, true);
});

// ============================================================================
// Execution Runner
// ============================================================================

async function runSuite() {
  for (const { name, fn } of testQueue) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passedTests++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ [FAIL] ${name}: ${msg}`);
      failedTests++;
    }
  }

  console.log("\n=======================================================");
  console.log(`Test Execution Finished: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=======================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSuite().catch((err) => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
