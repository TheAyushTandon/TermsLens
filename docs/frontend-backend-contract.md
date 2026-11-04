# TermsLens — Frontend-Backend Integration Specification & Contract

**Document Version:** 2.0.0  
**Target Environment:** Production AI Backend Integration  
**Architecture:** Next.js App Router (Frontend) $\longleftrightarrow$ Python / Node.js AI Document Intelligence Backend  
**Status:** Authoritative Contract Specification  

---

## Table of Contents
1. [Executive Summary & Architectural Tenets](#1-executive-summary--architectural-tenets)
2. [Preprocessing & Five-Stage Prompt Architecture](#2-preprocessing--five-stage-prompt-architecture)
   - [2.1 Deterministic Preprocessing Pipeline](#21-deterministic-preprocessing-pipeline)
   - [2.2 Prompt Stage P01: Clause Extraction](#22-prompt-stage-p01-clause-extraction)
   - [2.3 Prompt Stage P02: Plain-Language Explanation](#23-prompt-stage-p02-plain-language-explanation)
   - [2.4 Prompt Stage P03: Risk and Privacy Analysis](#24-prompt-stage-p03-risk-and-privacy-analysis)
   - [2.5 Prompt Stage P04: Independent Evidence Verification](#25-prompt-stage-p04-independent-evidence-verification)
   - [2.6 Prompt Stage P05: Final Report Generation](#26-prompt-stage-p05-final-report-generation)
3. [Document Submission API Specifications](#3-document-submission-api-specifications)
   - [3.1 Binary File Upload (`POST /api/analyze/file`)](#31-binary-file-upload-post-apianalyzefile)
   - [3.2 Pasted Text Submission (`POST /api/analyze/text`)](#32-pasted-text-submission-post-apianalyzetext)
   - [3.3 Website URL Submission (`POST /api/analyze/url`)](#33-website-url-submission-post-apianalyzeurl)
4. [URL Security & SSRF Defense Specification](#4-url-security--ssrf-defense-specification)
5. [Asynchronous Processing & Job Lifecycle](#5-asynchronous-processing--job-lifecycle)
   - [5.1 Submission Acceptance Response (`202 Accepted`)](#51-submission-acceptance-response-202-accepted)
   - [5.2 Job Status Polling (`GET /api/analyze/status/:jobId`)](#52-job-status-polling-get-apianalyzestatusjobid)
   - [5.3 Stage-Level Updates Without Fabricated Progress](#53-stage-level-updates-without-fabricated-progress)
   - [5.4 Polling Backoff, Timeout, and Client Cancellation](#54-polling-backoff-timeout-and-client-cancellation)
6. [Report Retrieval Contract (`GET /api/reports/:id`)](#6-report-retrieval-contract-get-apireportsid)
   - [6.1 Full Schema Definition](#61-full-schema-definition)
   - [6.2 Production Response Example (Spotify Terms of Use)](#62-production-response-example-spotify-terms-of-use)
   - [6.3 Verification Data: Production vs Simulated Review](#63-verification-data-production-vs-simulated-review)
   - [6.4 Verification Status Semantics](#64-verification-status-semantics)
7. [Comprehensive Error Handling Matrix](#7-comprehensive-error-handling-matrix)
8. [Security & Privacy Architecture](#8-security--privacy-architecture)
   - [8.1 Environment Variable Boundary & Secret Isolation](#81-environment-variable-boundary--secret-isolation)
   - [8.2 Server-Side LLM Credential Management](#82-server-side-llm-credential-management)
   - [8.3 Privacy-Conscious Document Storage & TTL Deletion](#83-privacy-conscious-document-storage--ttl-deletion)
   - [8.4 Zero Data Retention (ZDR) & User Erasure Rights](#84-zero-data-retention-zdr--user-erasure-rights)
9. [Frontend Integration Sequence & Service Layer](#9-frontend-integration-sequence--service-layer)
10. [Authoritative TypeScript Type Contracts](#10-authoritative-typescript-type-contracts)

---

## 1. Executive Summary & Architectural Tenets

TermsLens is an AI-powered document intelligence product designed for everyday consumers who need to understand complicated Terms & Conditions and Privacy Policies before agreeing to them.

### Non-Negotiable Contract Tenets
1. **Verbatim Evidence Grounding:** The AI backend must **never invent** opt-out deadlines, mailing addresses, data brokers, or procedural terms not present in the original source text. If a policy mentions mandatory arbitration but omits an opt-out procedure, the backend must explain only what the text supports and state that no opt-out procedure is present.
2. **Transparent Silence Disclosures:** If an excerpt is silent regarding data retention timeframes, third-party data broker sharing, or proprietary AI model training, the backend must assign `distinction: "not_specified"` and emit an explicit silence notice. Silence must never be interpreted as proof that a practice does or does not happen.
3. **True Asynchronous States:** The API communicates discrete stage progress (`P01` through `P05`). It **must not** return fabricated percentage meters or promised fixed completion durations.
4. **Decoupled Architecture:** Frontend UI components interact strictly with [`src/services/analysis-service.ts`](file:///d:/PROJECTS/Prompt%20Engineering%20Assignment%202026/src/services/analysis-service.ts). The service layer coordinates with backend endpoints without exposing transport or networking mechanics to UI components.

---

## 2. Preprocessing & Five-Stage Prompt Architecture

The document intelligence pipeline strictly separates **deterministic preprocessing operations** from the **five LLM prompt stages**.

```
[ Ingested Document: PDF / DOCX / TXT / Clean HTML ]
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              DETERMINISTIC PREPROCESSING                    │
│ • OCR & Binary PDF/DOCX Parsing                             │
│ • Structural Text Normalization & Unicode Sanitization       │
│ • Page Number & Section Heading Extraction                  │
│ • Clause Boundary Segmentation                              │
└───────────────────────┬─────────────────────────────────────┘
                        │ Normalized text blocks + metadata
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  P01: CLAUSE EXTRACTION                                     │
│  Extracts operative legal clauses and contractual provisions│
└───────────────────────┬─────────────────────────────────────┘
                        │ Structured clause candidates
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  P02: PLAIN-LANGUAGE EXPLANATION                            │
│  Generates layperson translations, implications & advice    │
└───────────────────────┬─────────────────────────────────────┘
                        │ Plain-English translations
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  P03: RISK AND PRIVACY ANALYSIS                             │
│  Classifies attention levels & analyzes 6 privacy dimensions │
└───────────────────────┬─────────────────────────────────────┘
                        │ Attention levels + Privacy findings
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  P04: INDEPENDENT EVIDENCE VERIFICATION                     │
│  Audits claims against verbatim quotes; checks hallucination│
└───────────────────────┬─────────────────────────────────────┘
                        │ Verified evidence + Verification statuses
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  P05: FINAL REPORT GENERATION                               │
│  Synthesizes executive summary & emits AnalysisReport JSON  │
└─────────────────────────────────────────────────────────────┘
```

---

### 2.1 Deterministic Preprocessing Pipeline
*Deterministic code execution (Python `pypdf`, `python-docx`, `trafilatura`, or Node.js equivalent); no LLM invocation.*

* **Operations:**
  1. **Binary Extraction & OCR:** Extracts raw text from vector or scanned PDF files, DOCX packages, and plain text.
  2. **Text Normalization:** Strips non-printing control characters, repairs broken hyphenation across page margins, and standardizes whitespace.
  3. **Page & Heading Mapping:** Identifies physical page boundaries (`sourcePage`) and hierarchical section numbers/headings (e.g. `Section 24.1 — Dispute Resolution and Arbitration`).
  4. **Clause Boundary Segmentation:** Partitions the document into discrete paragraph blocks with stable token offsets and section coordinates.
* **Output to Prompt Stages:** Array of structured document segments:
  ```typescript
  interface DocumentSegment {
    segmentIndex: number;
    sectionHeading: string;
    sectionNumber?: string;
    sourcePage?: number;
    rawText: string;
  }
  ```

---

### 2.2 Prompt Stage P01: Clause Extraction
* **Purpose:** Identifies all operative legal terms, restrictions, rights waivers, and user obligations from raw segments while filtering boilerplate navigation, headers, and copyright notices.
* **Input:** Array of `DocumentSegment` objects + document metadata (`appName`, `documentType`).
* **Output:**
  ```typescript
  interface P01_Output {
    extractedClauses: Array<{
      tempClauseId: string;
      segmentIndex: number;
      sectionHeading: string;
      sectionNumber?: string;
      sourcePage?: number;
      originalClauseText: string;
      operativeSummary: string;
    }>;
    totalClausesAnalyzed: number;
  }
  ```

---

### 2.3 Prompt Stage P02: Plain-Language Explanation
* **Purpose:** Translates dense legal text into clear, 8th-grade reading level explanations without sacrificing legal accuracy.
* **Input:** `P01_Output` clauses.
* **Output:**
  ```typescript
  interface P02_Output {
    clauseExplanations: Array<{
      tempClauseId: string;
      title: string;
      shortExplanation: string;
      plainLanguageExplanation: string;
      whyThisClauseMatters: string;
      potentialUserImplications: string[];
      actionableAdvice?: string;
    }>;
  }
  ```

---

### 2.4 Prompt Stage P03: Risk and Privacy Analysis
* **Purpose:** Assigns standardized categories and consumer attention levels, and audits the document across the **six mandatory privacy topics**.
* **Input:** `P01_Output` clauses + full document context for privacy disclosures.
* **Output:**
  ```typescript
  interface P03_Output {
    clauseClassifications: Array<{
      tempClauseId: string;
      category: ClauseCategory;
      attentionLevel: AttentionLevel; // "high" | "moderate" | "informational"
    }>;
    privacyFindings: Array<{
      id: string;
      topic: PrivacyTopic;
      topicTitle: string;
      distinction: PrivacyDistinction; // "explicitly_stated" | "reasonable_interpretation" | "not_specified"
      summary: string;
      documentEvidence?: string;
      silenceNotice?: string;
      attentionLevel: AttentionLevel;
    }>;
  }
  ```

---

### 2.5 Prompt Stage P04: Independent Evidence Verification
* **Purpose:** Performs a strict, adversarial audit on the outputs of P02 and P03 against the verbatim source text. Verifies that every claim is grounded, identifies exact verbatim quotes, and catches hallucinations (e.g. invented opt-out windows, unquoted postal addresses, or unmentioned data brokers).
* **Input:** `P01_Output` raw texts, `P02_Output` explanations, and `P03_Output` privacy claims.
* **Output:**
  ```typescript
  interface P04_Output {
    verifiedClauses: Array<{
      tempClauseId: string;
      evidence: {
        exactQuote: string; // Must exist verbatim in originalClauseText
        highlightExcerpt: string; // Key operative phrase
      };
      verification: {
        status: VerificationStatus; // "supported" | "partially_supported" | "unverified" | "rejected"
        reviewerType: "automated_pipeline";
        notes: string;
        verifiedAt: string; // ISO 8601
        evidenceMatchesOriginal: boolean;
      };
    }>;
    verificationSummary: {
      totalVerified: number;
      supportedCount: number;
      partiallySupportedCount: number;
      unverifiedCount: number;
      rejectedCount: number;
      methodologyDescription: string;
    };
  }
  ```

---

### 2.6 Prompt Stage P05: Final Report Generation
* **Purpose:** Synthesizes the overall document summary, main obligations, company permissions, major attention areas, and pre-agreement checklist. Assembles the final, unified payload compatible with the frontend [`AnalysisReport`](file:///d:/PROJECTS/Prompt%20Engineering%20Assignment%202026/src/types/index.ts#L120-L140) interface.
* **Input:** Outputs from `P01`, `P02`, `P03`, `P04`.
* **Output:** Complete, fully-formed JSON object strictly conforming to `AnalysisReport`.

---

## 3. Document Submission API Specifications

### 3.1 Binary File Upload (`POST /api/analyze/file`)
* **Endpoint:** `POST /api/analyze/file`
* **Content-Type:** `multipart/form-data`
* **Size Limit:** Max 25 MB (`26,214,400 bytes`).
* **Supported MIME Types:**
  * `application/pdf`
  * `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  * `text/plain`

#### Form-Data Fields:
| Key | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `file` | `Binary` | **Yes** | Policy document file. |
| `appName` | `string` | **Yes** | Target consumer application name (e.g. `"Spotify"`). |
| `documentType` | `string` | **Yes** | One of `DocumentType` enum values. |

---

### 3.2 Pasted Text Submission (`POST /api/analyze/text`)
* **Endpoint:** `POST /api/analyze/text`
* **Content-Type:** `application/json`
* **Constraints:** Minimum 10 words, maximum 100,000 words.

#### Request Body Example:
```json
{
  "text": "24.1 Dispute Resolution and Arbitration. You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements... will be determined by mandatory binding individual (not class) arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
  "appName": "Spotify",
  "documentType": "terms_of_service"
}
```

---

### 3.3 Website URL Submission (`POST /api/analyze/url`)
* **Endpoint:** `POST /api/analyze/url`
* **Content-Type:** `application/json`
* **Constraints:** Must be a publicly resolvable HTTP/HTTPS URL. Governed by strict security controls (Section 4).

#### Request Body Example:
```json
{
  "url": "https://www.spotify.com/us/legal/end-user-agreement/",
  "appName": "Spotify",
  "documentType": "terms_of_service"
}
```

---

## 4. URL Security & SSRF Defense Specification

To ensure security, TermsLens **does not use adversarial scraping, anti-bot circumvention, or CORS bypass techniques**. Web URL ingestion is strictly limited to publicly accessible documents with defense-in-depth protections against Server-Side Request Forgery (SSRF).

### URL Ingestion Security Rules
1. **Public Resources Only:** The backend accepts only valid, public `http://` or `https://` URLs.
2. **Strict SSRF IP Blocklist:** The backend resolves the hostname via DNS *prior to connecting* and immediately terminates requests resolving to private, loopback, or internal networks:
   * Loopback: `127.0.0.0/8`, `::1`
   * Private IPv4: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   * Link-Local & Cloud Metadata: `169.254.0.0/16` (including AWS/GCP/Azure `169.254.169.254`)
   * Current Network & Broadcast: `0.0.0.0/8`, `255.255.255.255`
   * IPv6 Local/Link-Local: `fc00::/7`, `fe80::/10`
3. **Redirect Chain Validation:**
   * Maximum 3 redirects followed.
   * Every redirect target URL is validated against the protocol whitelist and IP blocklist before being fetched.
4. **Response Size & Timeout Limits:**
   * Maximum download response size: **5 MB**. If the stream exceeds 5 MB, the connection is aborted immediately.
   * Connection timeout: **8 seconds**.
   * Read timeout: **10 seconds**.
5. **Content-Type Filtering:**
   * Only `text/html`, `text/plain`, and `application/xhtml+xml` responses are parsed.
   * Any binary payloads (`application/octet-stream`, executables, archives) are rejected immediately with HTTP 415.
6. **Paste-Text Fallback:**
   * If a website blocks access, requires CAPTCHA/JavaScript rendering, or rejects crawler requests, the backend returns an explicit `EXTRACTION_FAILED` error with a clear remediation message directing the user to copy and paste the policy text into the **Paste Text** editor.

---

## 5. Asynchronous Processing & Job Lifecycle

### 5.1 Submission Acceptance Response (`202 Accepted`)

Submissions return immediately with HTTP `202 Accepted`:

```json
{
  "success": true,
  "jobId": "job_01jcb89k2v1r7y5m3n0p8q4w9x",
  "reportId": "doc_live_spotify_01",
  "status": "queued",
  "appName": "Spotify",
  "documentType": "terms_of_service",
  "createdAt": "2026-11-04T03:55:00.000Z",
  "currentStage": "PREPROCESSING",
  "message": "Document accepted for processing.",
  "links": {
    "statusUrl": "/api/analyze/status/job_01jcb89k2v1r7y5m3n0p8q4w9x",
    "reportUrl": "/api/reports/doc_live_spotify_01"
  }
}
```

---

### 5.2 Job Status Polling (`GET /api/analyze/status/:jobId`)

* **Endpoint:** `GET /api/analyze/status/:jobId`
* **Response Statuses:**
  * `queued`: Waiting for background worker assignment.
  * `processing`: Actively executing a pipeline stage.
  * `completed`: Execution finished; report stored and ready.
  * `failed`: Analysis halted due to an error.

---

### 5.3 Stage-Level Updates Without Fabricated Progress

To avoid misleading users, the API **does not return fabricated percentages or promised time estimates**. Instead, it reports the current active pipeline stage:

```typescript
export type PipelineStage =
  | "PREPROCESSING"
  | "P01_CLAUSE_EXTRACTION"
  | "P02_PLAIN_LANGUAGE_EXPLANATION"
  | "P03_RISK_AND_PRIVACY_ANALYSIS"
  | "P04_EVIDENCE_VERIFICATION"
  | "P05_FINAL_REPORT_GENERATION"
  | "COMPLETED"
  | "FAILED";
```

#### Status Response While Processing (`200 OK`):
```json
{
  "jobId": "job_01jcb89k2v1r7y5m3n0p8q4w9x",
  "reportId": "doc_live_spotify_01",
  "status": "processing",
  "currentStage": "P04_EVIDENCE_VERIFICATION",
  "message": "Auditing extracted clauses against verbatim source excerpts."
}
```

#### Status Response When Completed (`200 OK`):
```json
{
  "jobId": "job_01jcb89k2v1r7y5m3n0p8q4w9x",
  "reportId": "doc_live_spotify_01",
  "status": "completed",
  "currentStage": "COMPLETED",
  "message": "Analysis completed successfully.",
  "completedAt": "2026-11-04T03:55:28.450Z",
  "reportUrl": "/api/reports/doc_live_spotify_01"
}
```

---

### 5.4 Polling Backoff, Timeout, and Client Cancellation

1. **Polling Frequency & Exponential Backoff:**
   * Starts at `2000 ms`.
   * Multiplier: `1.25x` per cycle, capped at `5000 ms` with $\pm 250\text{ ms}$ jitter.
2. **Client Timeout:**
   * The client terminates polling after **120 seconds** of continuous execution. If not finished, the UI shows a graceful timeout notice with the saved `reportId`.
3. **Client-Side Cancellation:**
   * If the user leaves the page or clicks Cancel, the client dispatches `POST /api/analyze/cancel/:jobId` and aborts active polling via `AbortController`.

---

## 6. Report Retrieval Contract (`GET /api/reports/:id`)

### 6.1 Full Schema Definition
Compatible with the existing [`AnalysisReport`](file:///d:/PROJECTS/Prompt%20Engineering%20Assignment%202026/src/types/index.ts#L120-L140) interface.

---

### 6.2 Production Response Example (Spotify Terms of Use)

```json
{
  "id": "doc_live_spotify_01",
  "appName": "Spotify",
  "documentTitle": "Spotify Terms and Conditions of Use",
  "documentType": "terms_of_service",
  "analysisDate": "2026-11-04T03:55:28.450Z",
  "isDemonstrationFixture": false,
  "documentSummary": "Governs individual consumer access to the Spotify music and podcast streaming service. Sets conditions for monthly automatic subscription renewal, intellectual property licenses, unilateral service modifications, and dispute resolution via mandatory private binding arbitration.",
  "totalClausesAnalyzed": 34,
  "highAttentionCount": 1,
  "moderateAttentionCount": 2,
  "informationalCount": 3,
  "executiveSummary": {
    "documentOverview": "This agreement defines the legal relationship between Spotify and individual listeners. It explains rules for account creation, payment for Premium tiers, device restrictions, and remedies available if a dispute arises.",
    "mainObligations": [
      "Pay recurring monthly subscription fees until you explicitly cancel in your account settings prior to your billing date.",
      "Use streaming content strictly for personal, non-commercial listening without unauthorized ripping or offline capture.",
      "Keep account credentials confidential and refrain from sharing login credentials outside your authorized household plan."
    ],
    "companyPermissions": [
      "Deliver personalized audio and visual advertising based on your listening habits and approximate device location.",
      "Remotely modify, suspend, or discontinue specific tracks, playlists, or platform features without liability to you.",
      "Audit playback streams to identify automated bot listening, abnormal skipping patterns, or unauthorized third-party apps."
    ],
    "majorAttentionAreas": [
      "Dispute Resolution: Requires binding individual arbitration under American Arbitration Association rules and waives jury trials. (No opt-out procedure is mentioned in this excerpt).",
      "Automatic Billing: Renews subscriptions automatically every month without separate email notices before each charge.",
      "Unilateral Revisions: Spotify may update terms with notice posted on its website; continued playback constitutes acceptance."
    ],
    "preAgreementChecklist": [
      "Check your monthly renewal date and understand that cancellation takes effect at the end of the current billing cycle.",
      "Check Spotify's complete dispute resolution terms if you wish to determine whether an opt-out right or deadline is provided, as no opt-out procedure is stated in this excerpt.",
      "Review your account privacy preferences to opt out of third-party advertising partner tracking."
    ]
  },
  "clauses": [
    {
      "id": "cl_sp_arb",
      "title": "Mandatory Individual Binding Arbitration",
      "shortExplanation": "You give up the right to take disputes to a conventional court or participate in a class-action lawsuit. No opt-out procedure is stated in this excerpt.",
      "category": "dispute_resolution",
      "attentionLevel": "high",
      "originalClauseText": "24.1 Dispute Resolution and Arbitration. You and Spotify agree that any dispute, claim, or controversy between you and Spotify arising in connection with or relating in any way to these Agreements or to your relationship with Spotify as a user of the Service (whether based in contract, tort, statute, fraud, misrepresentation, or any other legal theory, and whether the claims arise during or after the termination of the Agreements) will be determined by mandatory binding individual (not class) arbitration. You and Spotify further agree that the arbitrator shall have the exclusive power to rule on his or her own jurisdiction, including any objections with respect to the existence, scope or validity of the Arbitration Agreement or to the arbitrability of any claim or counterclaim. Arbitration is more informal than a lawsuit in court. THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
      "evidence": {
        "id": "ev_sp_arb",
        "sectionHeading": "Section 24.1 — Dispute Resolution and Arbitration",
        "sectionNumber": "24.1",
        "sourcePage": 16,
        "sourceReferenceText": "Section 24.1 (Page 16)",
        "exactQuote": "any dispute, claim, or controversy between you and Spotify... will be determined by mandatory binding individual (not class) arbitration... THERE IS NO JUDGE OR JURY IN ARBITRATION, AND COURT REVIEW OF AN ARBITRATION AWARD IS LIMITED.",
        "highlightExcerpt": "mandatory binding individual (not class) arbitration. THERE IS NO JUDGE OR JURY IN ARBITRATION"
      },
      "analysis": {
        "plainLanguageExplanation": "If Spotify overcharges you or violates your contract, you cannot sue them in an ordinary civil court with a judge and jury, nor can you join other customers in a joint class-action lawsuit. Instead, the dispute must be heard privately before an arbitrator. The provided excerpt contains no mention of an opt-out procedure, deadline, or mailing address.",
        "whyThisClauseMatters": "Individual private arbitration is confidential and eliminates access to a court jury trial. Importantly, this excerpt does not state an opt-out right or procedure, so consumers should not assume one is available without consulting Spotify's complete agreement.",
        "potentialUserImplications": [
          "You cannot sue Spotify before a jury trial in open civil court.",
          "You cannot band together with other consumers if thousands of people suffer the same overbilling bug.",
          "Arbitration decisions are final with almost zero opportunity to appeal.",
          "No opt-out mechanism, deadline, or mailing address is stated in the provided excerpt."
        ],
        "attentionLevel": "high",
        "category": "dispute_resolution",
        "actionableAdvice": "The provided excerpt does not mention an opt-out right or procedure. Check Spotify's full terms or dispute resolution section to verify whether an arbitration opt-out procedure exists before agreeing."
      },
      "verification": {
        "status": "supported",
        "reviewerType": "automated_pipeline",
        "notes": "Audited against Section 24.1 verbatim text. Finding accurately describes the individual arbitration waiver and class action prohibition. The excerpt contains no opt-out procedure or mailing address, and the analysis correctly refrains from claiming one.",
        "verifiedAt": "2026-11-04T03:55:25.120Z",
        "evidenceMatchesOriginal": true
      }
    },
    {
      "id": "cl_sp_bill",
      "title": "Continuous Automatic Subscription Renewal",
      "shortExplanation": "Paid plans automatically charge your payment method every month without prior reminder notices.",
      "category": "subscription_billing",
      "attentionLevel": "moderate",
      "originalClauseText": "8.2 Continuous Subscription. If you purchase a Paid Subscription, your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period. The cancellation will take effect the day after the last day of the current subscription period, and you will be downgraded to the Free Service. We do not provide refunds or credits for any partial subscription periods.",
      "evidence": {
        "id": "ev_sp_bill",
        "sectionHeading": "Section 8.2 — Continuous Subscription and Renewal",
        "sectionNumber": "8.2",
        "sourcePage": 7,
        "sourceReferenceText": "Section 8.2 (Page 7)",
        "exactQuote": "your subscription will automatically renew at the end of the applicable subscription period, unless you cancel your Paid Subscription before the end of the then-current subscription period... We do not provide refunds or credits for any partial subscription periods.",
        "highlightExcerpt": "subscription will automatically renew at the end of the applicable subscription period, unless you cancel... We do not provide refunds or credits for any partial subscription periods."
      },
      "analysis": {
        "plainLanguageExplanation": "When you enter your credit card or PayPal details, Spotify will charge you automatically every single month on your billing date until you navigate to your account settings and hit cancel. Canceling stops future renewals but will not refund days already charged.",
        "whyThisClauseMatters": "Many consumers assume they will receive an email reminder before their card is charged, especially after promotional trials.",
        "potentialUserImplications": [
          "Credit card or PayPal is billed automatically each billing cycle.",
          "No pro-rated refunds if you cancel mid-month; service simply runs until cycle end.",
          "If a free trial expires, it rolls over into a paid monthly subscription automatically."
        ],
        "attentionLevel": "moderate",
        "category": "subscription_billing",
        "actionableAdvice": "Set a calendar reminder for 2 days prior to your monthly renewal date if you are evaluating a trial or promotional rate."
      },
      "verification": {
        "status": "supported",
        "reviewerType": "automated_pipeline",
        "notes": "Cross-referenced with Section 8.2. Text confirms automatic monthly charges and no partial refunds policy.",
        "verifiedAt": "2026-11-04T03:55:25.800Z",
        "evidenceMatchesOriginal": true
      }
    }
  ],
  "privacyFindings": [
    {
      "id": "priv_sp_1",
      "topic": "personal_info_collected",
      "topicTitle": "Personal Information Collected",
      "distinction": "explicitly_stated",
      "summary": "Collects registration info (email address, date of birth), streaming history, interactions with content, device identifiers, network connection type, and sensor telemetry. (The provided excerpt does not specify whether gender, search query logs, Bluetooth telemetry, or microphone audio are collected.)",
      "documentEvidence": "Section 3.1: 'We collect your email address, date of birth, streaming history, interactions with content, device identifiers, network connection type, and sensor telemetry.'",
      "silenceNotice": "The provided excerpt does not specify whether microphone audio, Bluetooth telemetry, gender, or search query logs are collected.",
      "attentionLevel": "moderate"
    },
    {
      "id": "priv_sp_2",
      "topic": "third_party_sharing",
      "topicTitle": "Third-Party Data Sharing",
      "distinction": "explicitly_stated",
      "summary": "Shares pseudonymous analytics, mobile advertising IDs, and royalty metrics with record labels, publishers, and marketing partners. (Specific third-party advertising networks, data brokers, or measurement beacons are not stated in this excerpt.)",
      "documentEvidence": "Section 4.2: 'We share pseudonymous analytics, mobile advertising IDs, and royalty metrics with record labels, publishers, and marketing partners.'",
      "silenceNotice": "The provided excerpt does not identify specific external ad networks, data brokers, or measurement vendors beyond marketing partners, record labels, and publishers.",
      "attentionLevel": "moderate"
    },
    {
      "id": "priv_sp_3",
      "topic": "advertising_tracking",
      "topicTitle": "Advertising and Behavioral Tracking",
      "distinction": "explicitly_stated",
      "summary": "Processes interaction history to infer musical and brand preferences for targeted sponsor messages. (Cross-app ad tracking identifiers and tier-specific ad policies are not mentioned in this excerpt.)",
      "documentEvidence": "Section 5.1: 'We process interaction history to infer musical and brand preferences for targeted sponsor messages.'",
      "silenceNotice": "The provided excerpt does not state whether cross-app identifiers or off-platform browsing behavior are tracked.",
      "attentionLevel": "moderate"
    },
    {
      "id": "priv_sp_4",
      "topic": "data_retention",
      "topicTitle": "Data Retention Period",
      "distinction": "not_specified",
      "summary": "No specific retention period is stated in the provided excerpt.",
      "silenceNotice": "Important: Spotify does not state a concrete retention timeframe or deletion schedule for telemetry data in this excerpt. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      "attentionLevel": "high"
    },
    {
      "id": "priv_sp_5",
      "topic": "account_deletion",
      "topicTitle": "Account Deletion Rights",
      "distinction": "explicitly_stated",
      "summary": "Users may close their account through the Support page, after which data is permanently anonymized within 30 days. Note that anonymization retains data with personal identifiers removed rather than completely deleting or purging records from systems.",
      "documentEvidence": "Section 7.3: 'You may close your account through the Support page; your data will be permanently anonymized within 30 days.'",
      "silenceNotice": "The clause specifies permanent anonymization within 30 days rather than complete data deletion. Legal retention exceptions are not detailed in this excerpt.",
      "attentionLevel": "informational"
    },
    {
      "id": "priv_sp_6",
      "topic": "ai_model_training",
      "topicTitle": "AI & Model Training Usage",
      "distinction": "not_specified",
      "summary": "The provided excerpt is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models. The policy describes algorithmic content recommendation systems only.",
      "silenceNotice": "The agreement references algorithmic content recommendations, but is silent regarding training proprietary or third-party AI models on user content. Do not assume silence implies user data is excluded from or included in AI model training.",
      "attentionLevel": "moderate"
    }
  ],
  "verificationSummary": {
    "totalVerified": 6,
    "supportedCount": 6,
    "partiallySupportedCount": 0,
    "unverifiedCount": 0,
    "rejectedCount": 0,
    "methodologyDescription": "All 6 findings were audited through automated semantic verification against verbatim excerpts from the provided document."
  }
}
```

---

### 6.3 Verification Data: Production vs Simulated Review

| Dimension | Demonstration Mode (`isDemonstrationFixture: true`) | Live Production Mode (`isDemonstrationFixture: false`) |
| :--- | :--- | :--- |
| `reviewerType` | `"simulated_reviewer"` | `"automated_pipeline"` or `"human_auditor"` |
| `simulatedAuditOutcome` | **Included** (e.g. `"Audit verified: Quoted excerpt matches..."`) | **Omitted** (`undefined`) — Production responses must not require this field. |
| Verification Methodology | Transparent demonstration disclosure banner. | Live automated semantic verification disclosure. |

---

### 6.4 Verification Status Semantics

The stage `P04: Independent Evidence Verification` evaluates each extracted finding against verbatim source excerpts:

1. **`supported` (Badge: `Demo Verified — Supported`):**
   * Verbatim Quote: `exactQuote` exists identically in `originalClauseText`.
   * Semantic Alignment: The AI explanation describes *only* operative terms present in the quoted excerpt.
   * Zero Hallucination: Contains no unquoted deadlines, addresses, or unstated third parties.
2. **`partially_supported` (Badge: `Demo Verified — Partially Supported`):**
   * Core legal concept is supported, but the summary incorporates reasonable contextual inferences beyond direct literal quotations.
3. **`unverified` (Badge: `Not Verified`):**
   * The clause text is ambiguous, poorly scanned, or the automated semantic agreement score falls below confidence threshold, requiring manual review.
4. **`rejected` (Badge: `Rejected in Demo Review`):**
   * The finding makes an assertion directly contradicted by the source text, claims an unevidenced opt-out right, or treats data anonymization as full deletion.

---

## 7. Comprehensive Error Handling Matrix

Standard error envelope:
```json
{
  "success": false,
  "error": {
    "code": "EXTRACTION_FAILED",
    "message": "We could not extract text from the provided document.",
    "fieldErrors": {
      "file": "Scanned or image-based PDF detected. OCR extraction was inconclusive."
    },
    "details": {
      "reason": "EMPTY_EXTRACTED_TEXT",
      "remediation": "Try copying and pasting the policy text directly into the Paste Text tab."
    }
  }
}
```

| Failure Mode | HTTP Status | Backend Error Code | Frontend UX & Remediation |
| :--- | :--- | :--- | :--- |
| **Invalid Document** | `422 Unprocessable Entity` | `INVALID_DOCUMENT` | Shows file error: *"This document appears to be encrypted, password-protected, or corrupted. Please decrypt and re-upload."* |
| **Unsupported File** | `415 Unsupported Media Type`<br>`413 Payload Too Large` | `UNSUPPORTED_FILE_TYPE`<br>`FILE_TOO_LARGE` | Client-side dropzone validation prevents upload. Server fallback displays accepted extensions (`.pdf`, `.docx`, `.txt`) and `25 MB` limit. |
| **Extraction Failure** | `422 Unprocessable Entity` | `EXTRACTION_FAILED` | Renders a callout banner advising: *"Could not extract text from this document or URL. Try copying and pasting the policy text into the Paste Text tab."* |
| **LLM / API Failure** | `502 Bad Gateway`<br>`503 Service Unavailable` | `LLM_SERVICE_UNAVAILABLE` | Non-technical banner: *"The analysis engine is temporarily unavailable. Please retry in a few moments."* with a **Retry** action. |
| **Invalid JSON / Schema Mismatch** | `500 Internal Server Error` | `SCHEMA_VALIDATION_FAILED` | Backend retries internally once. If persistent, frontend error boundary catches the failure gracefully without crashing the dashboard. |
| **Missing Evidence / Hallucination** | *Handled within report payload* | `EVIDENCE_UNVERIFIED` | P04 assigns `verification.status = "unverified"` or `"rejected"`. Frontend displays the finding with a cautionary badge. |
| **Timeout** | `504 Gateway Timeout` | `ANALYSIS_TIMEOUT` | Notice: *"Analysis is taking longer than expected. Your document is still processing in the background. We have saved Request ID `rep_xxx` to My Reports."* |

---

## 8. Security & Privacy Architecture

### 8.1 Environment Variable Boundary & Secret Isolation
* **Zero Client Exposure:** `NEXT_PUBLIC_` variables must **never** contain API keys, credentials, or sensitive tokens. Anything prefixed with `NEXT_PUBLIC_` is inlined into public browser JavaScript bundles.
* **Client Environment:**
  ```env
  NEXT_PUBLIC_ENABLE_LIVE_API=true
  NEXT_PUBLIC_API_BASE_URL=https://api.termslens.com
  ```
* **Server Environment (Backend / Route Handlers Only):**
  ```env
  # NEVER prefix with NEXT_PUBLIC_
  LLM_API_KEY=sk-prod-...
  ANTHROPIC_API_KEY=sk-ant-...
  GEMINI_API_KEY=AIzaSy...
  DATABASE_URL=postgresql://user:pass@internal-db:5432/termslens
  STORAGE_ENCRYPTION_KEY=...
  ```

---

### 8.2 Server-Side LLM Credential Management
* Frontend clients never communicate directly with upstream LLM APIs (Gemini, Anthropic, OpenAI).
* The Next.js frontend or dedicated API gateway authenticates user requests and mediates backend pipeline calls.
* Upstream LLM tokens are held in protected memory on the backend and rotated via secret management infrastructure.

---

### 8.3 Privacy-Conscious Document Storage & TTL Deletion
1. **Transient Processing:** Uploaded binaries and extracted text are processed in ephemeral scratch storage (`/tmp` or transient object bucket).
2. **Automated 1-Hour TTL:** Raw uploaded files (`.pdf`, `.docx`) are automatically deleted from server storage within 1 hour after analysis completion.
3. **Encryption at Rest and in Transit:** All traffic enforces TLS 1.3. Persistent database records (`AnalysisReport`) use AES-256 column-level encryption for user policy text.

---

### 8.4 Zero Data Retention (ZDR) & User Erasure Rights
1. **Enterprise LLM ZDR:** Backend requests configure enterprise Zero Data Retention parameters (`store: false`) to ensure user legal documents are never used for foundation model training.
2. **User-Initiated Deletion:** When a user clicks **Delete** on a record in **My Reports**, a cascading deletion purges the report, all clauses, and associated telemetry permanently.

---

## 9. Frontend Integration Sequence & Service Layer

The frontend communicates exclusively through [`src/services/analysis-service.ts`](file:///d:/PROJECTS/Prompt%20Engineering%20Assignment%202026/src/services/analysis-service.ts).

### Integration Sequence Diagram

```
User Action                  Frontend Service                   Backend Pipeline
    │                               │                                  │
    ├── Upload Document ───────────►│                                  │
    │   (File / Text / URL)         ├── POST /api/analyze/* ──────────►│
    │                               │◄── 202 Accepted (jobId) ─────────┤
    │                               │                                  ├─► Preprocessing
    │                               ├── GET /api/analyze/status/:id ──►├─► P01: Extract Clauses
    │                               │◄── Status: P01_CLAUSE_EXTRACTION─┤
    │                               │                                  ├─► P02: Explain Clauses
    │                               ├── GET /api/analyze/status/:id ──►├─► P03: Risk & Privacy
    │                               │◄── Status: P04_VERIFICATION ─────┤
    │                               │                                  ├─► P04: Evidence Audit
    │                               │                                  ├─► P05: Assemble Report
    │                               ├── GET /api/analyze/status/:id ──►│
    │                               │◄── Status: completed ────────────┤
    │                               │                                  │
    │                               ├── GET /api/reports/:reportId ───►│
    │                               │◄── 200 OK (AnalysisReport) ──────┤
    │◄── Render Report Page ────────┤                                  │
```

---

## 10. Authoritative TypeScript Type Contracts

The following TypeScript definitions are identical to [`src/types/index.ts`](file:///d:/PROJECTS/Prompt%20Engineering%20Assignment%202026/src/types/index.ts) and govern all data exchange between frontend and backend.

```typescript
// ==========================================
// 1. Primitive Enums & Literals
// ==========================================

export type DocumentType =
  | "terms_of_service"
  | "privacy_policy"
  | "eula"
  | "subscription_agreement"
  | "other";

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

export type InputMode = "file" | "text" | "url";

export type AttentionLevel = "high" | "moderate" | "informational";

export type ClauseCategory =
  | "data_collection"
  | "data_sharing"
  | "data_retention"
  | "subscription_billing"
  | "cancellation_refunds"
  | "intellectual_property"
  | "dispute_resolution"
  | "liability_indemnification"
  | "account_termination"
  | "other";

export type VerificationStatus =
  | "supported"
  | "partially_supported"
  | "unverified"
  | "rejected";

export type PrivacyTopic =
  | "personal_info_collected"
  | "third_party_sharing"
  | "advertising_tracking"
  | "data_retention"
  | "account_deletion"
  | "ai_model_training";

export type PrivacyDistinction =
  | "explicitly_stated"
  | "reasonable_interpretation"
  | "not_specified";

// ==========================================
// 2. Evidence & Verification Interfaces
// ==========================================

export interface EvidenceReference {
  id: string;
  sectionHeading?: string;
  sectionNumber?: string;
  sourcePage?: number;
  sourceReferenceText: string;
  exactQuote: string;
  highlightExcerpt?: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  reviewerType: "automated_pipeline" | "human_auditor" | "simulated_reviewer";
  notes: string;
  verifiedAt: string;
  evidenceMatchesOriginal: boolean;
  simulatedAuditOutcome?: string; // Optional: Present only on demonstration fixtures
}

// ==========================================
// 3. Clause & Analysis Interfaces
// ==========================================

export interface ClauseAnalysis {
  plainLanguageExplanation: string;
  whyThisClauseMatters: string;
  potentialUserImplications: string[];
  attentionLevel: AttentionLevel;
  category: ClauseCategory;
  actionableAdvice?: string;
}

export interface Clause {
  id: string;
  title: string;
  shortExplanation: string;
  category: ClauseCategory;
  attentionLevel: AttentionLevel;
  originalClauseText: string;
  evidence: EvidenceReference;
  analysis: ClauseAnalysis;
  verification: VerificationResult;
}

// ==========================================
// 4. Privacy & Executive Summary Interfaces
// ==========================================

export interface PrivacyFinding {
  id: string;
  topic: PrivacyTopic;
  topicTitle: string;
  distinction: PrivacyDistinction;
  summary: string;
  documentEvidence?: string;
  silenceNotice?: string;
  attentionLevel: AttentionLevel;
}

export interface ExecutiveSummary {
  documentOverview: string;
  mainObligations: string[];
  companyPermissions: string[];
  majorAttentionAreas: string[];
  preAgreementChecklist: string[];
}

export interface VerificationSummary {
  totalVerified: number;
  supportedCount: number;
  partiallySupportedCount: number;
  unverifiedCount: number;
  rejectedCount: number;
  methodologyDescription: string;
}

// ==========================================
// 5. Complete Analysis Report Interface
// ==========================================

export interface AnalysisReport {
  id: string;
  appName: string;
  documentTitle: string;
  documentType: DocumentType;
  analysisDate: string;
  isDemonstrationFixture?: boolean;
  demonstrationNotice?: string;
  documentSummary: string;
  totalClausesAnalyzed: number;
  highAttentionCount: number;
  moderateAttentionCount: number;
  informationalCount: number;
  executiveSummary: ExecutiveSummary;
  clauses: Clause[];
  privacyFindings: PrivacyFinding[];
  verificationSummary: VerificationSummary;
}

// ==========================================
// 6. Pipeline Job & Status Contracts
// ==========================================

export type PipelineStage =
  | "PREPROCESSING"
  | "P01_CLAUSE_EXTRACTION"
  | "P02_PLAIN_LANGUAGE_EXPLANATION"
  | "P03_RISK_AND_PRIVACY_ANALYSIS"
  | "P04_EVIDENCE_VERIFICATION"
  | "P05_FINAL_REPORT_GENERATION"
  | "COMPLETED"
  | "FAILED";

export interface SubmitAnalysisResponse {
  success: boolean;
  jobId: string;
  reportId: string;
  status: AnalysisStatus;
  appName: string;
  documentType: DocumentType;
  createdAt: string;
  currentStage: PipelineStage;
  message: string;
  links: {
    statusUrl: string;
    reportUrl: string;
  };
}

export interface JobStatusResponse {
  jobId: string;
  reportId: string;
  status: AnalysisStatus;
  currentStage: PipelineStage;
  message: string;
  completedAt?: string;
  reportUrl?: string;
  error?: ApiError;
}

// ==========================================
// 7. Error Contract
// ==========================================

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}
```

---

*This document is the definitive technical contract for backend engineers and integration architects.*
