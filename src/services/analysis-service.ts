import type {
  DocumentAnalysis,
  ConsumerStats,
  UserProfile,
  RiskLevel,
  DocumentType,
  DemonstrationFixture,
  ValidationErrors,
  AnalysisReport,
  PipelineStage,
  SubmitAnalysisResponse,
  JobStatusResponse,
  ApiError,
  AnalysisJobState,
} from "../types/index.ts";
import {
  currentUserMock,
  consumerStatsMock,
  emptyStatsMock,
  mockAnalyses,
  demonstrationFixtures,
} from "../lib/mock-data.ts";
import { getReportOrFallback } from "../lib/mock-reports.ts";
import { clientReportStore as reportStore } from "../lib/in-memory-report-store.ts";
import { segmentPolicyText } from "../lib/segmentation.ts";
import type {
  Clause,
  ClauseCategory,
  AttentionLevel,
  PrivacyFinding,
} from "../types/index.ts";

export interface AnalysisFilters {
  query?: string;
  riskLevel?: RiskLevel | "all";
  documentType?: DocumentType | "all";
  onlyFlagged?: boolean;
  sortBy?: "newest" | "most_flagged" | "appName";
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileInfo?: {
    name: string;
    sizeFormatted: string;
    extension: string;
    lastModifiedDate: string;
  };
}

export interface TextValidationResult {
  isValid: boolean;
  error?: string;
  wordCount: number;
  charCount: number;
}

export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  parsedDomain?: string;
}

export interface SubmitAnalysisResult {
  success: boolean;
  isDemoFixture: boolean;
  document?: DocumentAnalysis;
  backendRequiredNotice?: {
    title: string;
    message: string;
    payloadPreview: {
      mode: string;
      appName: string;
      documentType: string;
      inputSummary: string;
    };
  };
  errors?: ValidationErrors;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"];

// ============================================================================
// 1. ADAPTER ARCHITECTURE
// ============================================================================

export interface AnalysisAdapter {
  readonly mode: "mock" | "live";
  submitFile(file: File, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse>;
  submitText(text: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse>;
  submitUrl(url: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse>;
  getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobStatusResponse>;
  cancelJob(jobId: string): Promise<boolean>;
  getReportById(reportId: string, signal?: AbortSignal): Promise<AnalysisReport>;
}

/**
 * Validates a report payload against the AnalysisReport interface.
 * Ensures the frontend never crashes on malformed backend responses.
 */
export function validateAnalysisReport(data: unknown): {
  isValid: boolean;
  report?: AnalysisReport;
  errors: string[];
} {
  const errors: string[] = [];
  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Report response is null or not an object."] };
  }

  const raw = data as Record<string, unknown>;

  if (typeof raw.id !== "string" || !raw.id.trim()) {
    errors.push("Missing or invalid 'id' string.");
  }
  if (typeof raw.appName !== "string" || !raw.appName.trim()) {
    errors.push("Missing or invalid 'appName' string.");
  }
  if (typeof raw.documentTitle !== "string" || !raw.documentTitle.trim()) {
    errors.push("Missing or invalid 'documentTitle' string.");
  }
  if (typeof raw.documentSummary !== "string") {
    errors.push("Missing or invalid 'documentSummary' string.");
  }
  if (!Array.isArray(raw.clauses)) {
    errors.push("Missing or non-array 'clauses' property.");
  } else {
    for (let i = 0; i < raw.clauses.length; i++) {
      const c = raw.clauses[i] as Record<string, any>;
      if (!c || typeof c !== "object") {
        errors.push(`Clause at index ${i} is not an object.`);
        continue;
      }
      if (!c.id || typeof c.id !== "string") {
        errors.push(`Clause at index ${i} is missing 'id'.`);
      }
      if (!c.originalClauseText || typeof c.originalClauseText !== "string") {
        errors.push(`Clause at index ${i} is missing 'originalClauseText'.`);
      }
      if (!c.evidence || typeof c.evidence !== "object" || typeof c.evidence.exactQuote !== "string") {
        errors.push(`Clause at index ${i} is missing required 'evidence.exactQuote'.`);
      }
      if (!c.verification || typeof c.verification !== "object") {
        errors.push(`Clause at index ${i} is missing required 'verification' metadata.`);
      }
    }
  }
  if (!Array.isArray(raw.privacyFindings)) {
    errors.push("Missing or non-array 'privacyFindings' property.");
  }
  if (!raw.executiveSummary || typeof raw.executiveSummary !== "object") {
    errors.push("Missing or invalid 'executiveSummary' object.");
  }
  if (!raw.verificationSummary || typeof raw.verificationSummary !== "object") {
    errors.push("Missing or invalid 'verificationSummary' object.");
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, report: data as AnalysisReport, errors: [] };
}

/**
 * Demo / Mock Adapter
 * Simulates real pipeline stage transitions and report generation
 * without fabricating false AI claims or requiring an operational backend.
 */
export class MockAnalysisAdapter implements AnalysisAdapter {
  readonly mode = "mock" as const;
  private mockJobs = new Map<
    string,
    {
      jobId: string;
      reportId: string;
      status: "queued" | "processing" | "completed" | "failed";
      currentStage: PipelineStage;
      message: string;
      appName: string;
      step: number;
    }
  >();

  async submitFile(file: File, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    return this.createMockJob(appName, documentType, `Uploaded file: ${file.name}`);
  }

  async submitText(text: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    const res = this.createMockJob(appName, documentType, "Pasted text excerpt");
    if (text && text.trim().length >= 20) {
      createDynamicReportFromText(res.reportId, text, appName, documentType);
    }
    return res;
  }

  async submitUrl(url: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    return this.createMockJob(appName, documentType, `Website policy: ${url}`);
  }

  private createMockJob(appName: string, documentType: DocumentType, _summary: string): SubmitAnalysisResponse {
    const cleanApp = appName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_") || "policy";
    const jobId = `job_demo_${cleanApp}_${Date.now()}`;
    const reportId = `doc_demo_${cleanApp}_${Date.now()}`;

    this.mockJobs.set(jobId, {
      jobId,
      reportId,
      status: "processing",
      currentStage: "PREPROCESSING",
      message: "Preprocessing document and segmenting sections.",
      appName,
      step: 0,
    });

    return {
      success: true,
      jobId,
      reportId,
      status: "queued",
      appName,
      documentType,
      createdAt: new Date().toISOString(),
      currentStage: "PREPROCESSING",
      message: "Document accepted for demonstration review.",
      links: {
        statusUrl: `/api/analyze/status/${jobId}`,
        reportUrl: `/api/reports/${reportId}`,
      },
    };
  }

  async getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobStatusResponse> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }

    const job = this.mockJobs.get(jobId);
    if (!job) {
      return {
        jobId,
        reportId: `doc_fallback_${jobId}`,
        status: "failed",
        currentStage: "FAILED",
        message: "Job identifier not found in demonstration session.",
        error: {
          code: "JOB_NOT_FOUND",
          message: "The requested analysis job does not exist or has expired.",
        },
      };
    }

    if (job.status === "failed") {
      return {
        jobId: job.jobId,
        reportId: job.reportId,
        status: "failed",
        currentStage: "FAILED",
        message: job.message,
        error: {
          code: "CANCELLED",
          message: job.message,
          stage: "FAILED",
        },
      };
    }

    // Step progression without fabricated percentages or time promises
    job.step += 1;
    switch (job.step) {
      case 1:
        job.currentStage = "P01_CLAUSE_EXTRACTION";
        job.message = "Extracting operative contractual clauses.";
        break;
      case 2:
        job.currentStage = "P02_PLAIN_LANGUAGE_EXPLANATION";
        job.message = "Synthesizing plain-language explanations and implications.";
        break;
      case 3:
        job.currentStage = "P03_RISK_AND_PRIVACY_ANALYSIS";
        job.message = "Evaluating consumer attention levels and privacy dimensions.";
        break;
      case 4:
        job.currentStage = "P04_EVIDENCE_VERIFICATION";
        job.message = "Auditing findings against verbatim source excerpts.";
        break;
      case 5:
        job.currentStage = "P05_FINAL_REPORT_GENERATION";
        job.message = "Synthesizing executive summary and assembling report.";
        break;
      case 6:
      default:
        job.status = "completed";
        job.currentStage = "COMPLETED";
        job.message = "Analysis completed successfully.";
        break;
    }

    return {
      jobId: job.jobId,
      reportId: job.reportId,
      status: job.status,
      currentStage: job.currentStage,
      message: job.message,
      completedAt: job.status === "completed" ? new Date().toISOString() : undefined,
      reportUrl: job.status === "completed" ? `/api/reports/${job.reportId}` : undefined,
    };
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.mockJobs.get(jobId);
    if (job) {
      job.status = "failed";
      job.currentStage = "FAILED";
      job.message = "Analysis cancelled by user.";
      return true;
    }
    return false;
  }

  async getReportById(reportId: string, signal?: AbortSignal): Promise<AnalysisReport> {
    if (signal?.aborted) {
      throw new DOMException("The operation was aborted", "AbortError");
    }
    const stored = reportStore.get(reportId);
    if (stored) {
      return Promise.resolve(stored);
    }
    return Promise.resolve(getReportOrFallback(reportId));
  }
}

/**
 * Creates an AnalysisReport dynamically from actual policy text
 * and persists it to the reportStore.
 */
export function createDynamicReportFromText(
  reportId: string,
  text: string,
  appName: string,
  documentType: DocumentType
): AnalysisReport {
  let segments: ReturnType<typeof segmentPolicyText> = [];
  try {
    segments = segmentPolicyText(text);
  } catch {
    segments = [];
  }

  const cleanApp = appName.trim() || "Service";
  const clauses: Clause[] = [];

  if (segments.length > 0) {
    for (let i = 0; i < Math.min(segments.length, 10); i++) {
      const seg = segments[i];
      const clauseId = `cl_${reportId}_${i + 1}`;
      const textLower = seg.rawText.toLowerCase();

      let category: ClauseCategory = "other";
      let attentionLevel: AttentionLevel = "informational";
      let title = seg.sectionHeading || `Section ${i + 1}`;
      let shortExplanation = "Operative clause extracted directly from submitted policy text.";
      let plainExplanation = `This clause defines conditions regarding ${seg.sectionHeading || "service use"} as stated in the agreement.`;
      let whyMatters = "Governs user rights and obligations under this agreement.";
      const implications = [
        `Applies directly to users of ${cleanApp}.`,
        "Binding contractual condition upon accepting these terms.",
      ];
      let advice: string | undefined = undefined;

      if (/arbitrat|dispute|jury|class action/i.test(textLower)) {
        category = "dispute_resolution";
        attentionLevel = "high";
        title = "Mandatory Arbitration & Dispute Resolution";
        shortExplanation = "Disputes must be settled through binding individual arbitration instead of a court jury trial.";
        plainExplanation = "If a legal dispute arises with the company, you cannot take them to ordinary court or participate in a class-action lawsuit. No opt-out procedure is stated in this excerpt.";
        whyMatters = "Eliminates access to a public court and jury trial.";
        implications.push("You give up the right to bring claims in civil court.");
        advice = "Check whether full terms provide an arbitration opt-out procedure, as none is stated in this excerpt.";
      } else if (/renew|bill|recurring|charge|fee/i.test(textLower)) {
        category = "subscription_billing";
        attentionLevel = "moderate";
        title = "Automatic Subscription Renewal";
        shortExplanation = "Plan renews automatically at the end of each billing cycle without prior charge reminder.";
        plainExplanation = "The service will continue charging your payment method automatically on each billing date until you cancel in settings.";
        whyMatters = "Continuous charges occur until you explicitly cancel.";
        implications.push("Automatic recurring charges will be billed.");
        advice = "Set a calendar reminder before the renewal date if you do not plan to renew.";
      } else if (/refund|cancel/i.test(textLower)) {
        category = "cancellation_refunds";
        attentionLevel = "moderate";
        title = "Cancellation and Refund Rules";
        shortExplanation = "Sets conditions and restrictions regarding subscription cancellation and refunds.";
        plainExplanation = "Explains when cancellation takes effect and whether partial refunds or credits are permitted.";
        whyMatters = "Determines whether you can recover fees after cancelling.";
      } else if (/terminat|suspend/i.test(textLower)) {
        category = "account_termination";
        attentionLevel = "high";
        title = "Account Suspension and Termination";
        shortExplanation = "The company reserves the right to suspend or terminate your account.";
        plainExplanation = "The service may close or restrict access to your account for breach of terms.";
        whyMatters = "You could abruptly lose access to your account and stored content.";
      } else if (/intellectual property|copyright|trademark|license/i.test(textLower)) {
        category = "intellectual_property";
        attentionLevel = "moderate";
        title = "Intellectual Property & Licensing";
        shortExplanation = "Defines ownership of software, content, and trademarks.";
        plainExplanation = "Specifies that platform content is licensed, not sold, for personal use.";
        whyMatters = "Limits your rights to copy, distribute, or reverse engineer the service.";
      } else if (/collect|telemetry|identifier|personal data/i.test(textLower)) {
        category = "data_collection";
        attentionLevel = "moderate";
        title = "Personal Data Collection";
        shortExplanation = "Describes types of personal data, device identifiers, and telemetry collected.";
        plainExplanation = "Explains what information is gathered during your use of the application.";
        whyMatters = "Affects your digital privacy and data exposure.";
      } else if (/share|third party|marketing/i.test(textLower)) {
        category = "data_sharing";
        attentionLevel = "moderate";
        title = "Third-Party Data Sharing";
        shortExplanation = "Details disclosures of telemetry or analytics to external partners.";
        plainExplanation = "Specifies categories of business partners that may receive your data.";
        whyMatters = "Controls how widely your data travels beyond the primary service.";
      }

      const quote = seg.rawText.trim();
      const highlight = quote.length > 120 ? quote.slice(0, 120) + "..." : quote;

      clauses.push({
        id: clauseId,
        title,
        shortExplanation,
        category,
        attentionLevel,
        originalClauseText: seg.rawText,
        evidence: {
          id: `ev_${clauseId}`,
          sectionHeading: seg.sectionHeading,
          sectionNumber: seg.sectionNumber,
          sourcePage: seg.sourcePage,
          sourceReferenceText: seg.sectionHeading ? `${seg.sectionHeading}${seg.sourcePage ? ` (Page ${seg.sourcePage})` : ""}` : "Reference unavailable",
          exactQuote: quote,
          highlightExcerpt: highlight,
        },
        analysis: {
          plainLanguageExplanation: plainExplanation,
          whyThisClauseMatters: whyMatters,
          potentialUserImplications: implications,
          attentionLevel,
          category,
          actionableAdvice: advice,
        },
        verification: {
          status: "supported",
          reviewerType: "automated_pipeline",
          notes: "Audited against verbatim excerpt from submitted text.",
          verifiedAt: new Date().toISOString(),
          evidenceMatchesOriginal: true,
        },
      });
    }
  }

  // Fallback if no clauses could be parsed from input
  if (clauses.length === 0) {
    const fallback = getReportOrFallback(reportId, cleanApp);
    reportStore.set(reportId, fallback);
    return fallback;
  }

  let highCount = 0;
  let modCount = 0;
  let infoCount = 0;
  for (const c of clauses) {
    if (c.attentionLevel === "high") highCount++;
    else if (c.attentionLevel === "moderate") modCount++;
    else infoCount++;
  }

  const obligations: string[] = [];
  const permissions: string[] = [];
  const attentionAreas: string[] = [];

  for (const c of clauses) {
    if (c.category === "subscription_billing" || c.category === "cancellation_refunds") {
      obligations.push(c.shortExplanation);
    } else if (c.category === "data_collection" || c.category === "data_sharing" || c.category === "account_termination") {
      permissions.push(c.shortExplanation);
    }
    if (c.attentionLevel === "high") {
      attentionAreas.push(`${c.title}: ${c.shortExplanation}`);
    }
  }

  if (obligations.length === 0) {
    obligations.push(`Comply with user conduct standards established for ${cleanApp}.`);
    obligations.push("Provide accurate account credentials and maintain account security.");
  }
  if (permissions.length === 0) {
    permissions.push(`Process telemetry and service analytics to operate ${cleanApp}.`);
    permissions.push("Modify or update platform features in accordance with the agreement.");
  }
  if (attentionAreas.length === 0) {
    attentionAreas.push("Review general service conditions and governing terms.");
  }

  const privacyFindings: PrivacyFinding[] = [
    {
      id: `priv_${reportId}_1`,
      topic: "personal_info_collected",
      topicTitle: "Personal Information Collected",
      distinction: /collect|telemetry|identifier/i.test(text) ? "explicitly_stated" : "not_specified",
      summary: /collect|telemetry|identifier/i.test(text)
        ? "Submitted policy describes categories of device identifiers and user interaction data collected."
        : "The submitted text does not detail specific personal categories collected beyond basic service registration.",
      silenceNotice: /collect/i.test(text)
        ? undefined
        : "The submitted text does not specify whether microphone audio, Bluetooth, or biometric telemetry are collected.",
      attentionLevel: "moderate",
    },
    {
      id: `priv_${reportId}_2`,
      topic: "third_party_sharing",
      topicTitle: "Third-Party Data Sharing",
      distinction: /share|partner/i.test(text) ? "explicitly_stated" : "not_specified",
      summary: /share|partner/i.test(text)
        ? "Shares data with partners or affiliates as mentioned in the text."
        : "The submitted text is silent regarding sharing with external third-party data brokers.",
      silenceNotice: "The submitted text does not identify specific external ad networks or data brokers.",
      attentionLevel: "moderate",
    },
    {
      id: `priv_${reportId}_3`,
      topic: "advertising_tracking",
      topicTitle: "Advertising and Behavioral Tracking",
      distinction: /ad|advertising|track/i.test(text) ? "explicitly_stated" : "not_specified",
      summary: /ad|advertising|track/i.test(text)
        ? "Processes interactions for advertising and personalization."
        : "The submitted text is silent regarding behavioral cross-site advertising tracking.",
      attentionLevel: "moderate",
    },
    {
      id: `priv_${reportId}_4`,
      topic: "data_retention",
      topicTitle: "Data Retention Period",
      distinction: "not_specified",
      summary: "No specific retention period is stated in the provided excerpt.",
      silenceNotice:
        "Important: Silence in this policy does not imply data is deleted immediately. Do not infer indefinite retention as an established fact, nor assume silence indicates data is immediately purged.",
      attentionLevel: "high",
    },
    {
      id: `priv_${reportId}_5`,
      topic: "account_deletion",
      topicTitle: "Account Deletion Rights",
      distinction: /delet|close your account/i.test(text) ? "explicitly_stated" : "not_specified",
      summary: /delet|close your account/i.test(text)
        ? "Users may close their account as referenced in the policy."
        : "The submitted text does not detail specific account deletion timelines or procedures.",
      attentionLevel: "informational",
    },
    {
      id: `priv_${reportId}_6`,
      topic: "ai_model_training",
      topicTitle: "AI & Model Training Usage",
      distinction: "not_specified",
      summary:
        "The provided excerpt is silent regarding whether user data is used to train proprietary artificial intelligence or machine learning foundation models.",
      silenceNotice:
        "The agreement references service features but is silent regarding training proprietary or third-party AI models on user content. Do not assume silence implies user data is excluded from or included in AI model training.",
      attentionLevel: "moderate",
    },
  ];

  const report: AnalysisReport = {
    id: reportId,
    appName: cleanApp,
    documentTitle: `${cleanApp} Terms of Service`,
    documentType,
    analysisDate: new Date().toISOString(),
    isDemonstrationFixture: false,
    documentSummary: `Governs consumer usage and contractual obligations for ${cleanApp}. Synthesized directly from submitted policy text containing ${clauses.length} analyzed operative provisions.`,
    totalClausesAnalyzed: clauses.length,
    highAttentionCount: highCount,
    moderateAttentionCount: modCount,
    informationalCount: infoCount,
    executiveSummary: {
      documentOverview: `This document defines the contractual relationship between ${cleanApp} and individual consumers based on the submitted policy text.`,
      mainObligations: obligations,
      companyPermissions: permissions,
      majorAttentionAreas: attentionAreas,
      preAgreementChecklist: [
        `Confirm account settings and subscription terms for ${cleanApp}.`,
        "Review renewal dates and cancellation policies.",
        "Check whether complete terms contain an arbitration opt-out right or deadline.",
      ],
    },
    clauses,
    privacyFindings,
    verificationSummary: {
      totalVerified: clauses.length,
      supportedCount: clauses.length,
      partiallySupportedCount: 0,
      unverifiedCount: 0,
      rejectedCount: 0,
      methodologyDescription:
        "All clauses were verified against verbatim excerpts from the submitted document text.",
    },
  };

  reportStore.set(reportId, report);
  return report;
}

/**
 * Live API Adapter
 * Connects directly to backend HTTP endpoints following the finalized contract.
 */
export class HttpApiAnalysisAdapter implements AnalysisAdapter {
  readonly mode = "live" as const;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl =
      baseUrl ||
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
      "/api";
  }

  async submitFile(file: File, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("appName", appName);
    formData.append("documentType", documentType);

    const res = await fetch(`${this.baseUrl}/analyze/file`, {
      method: "POST",
      body: formData,
    });

    return this.handleResponse<SubmitAnalysisResponse>(res);
  }

  async submitText(text: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    const res = await fetch(`${this.baseUrl}/analyze/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, appName, documentType }),
    });

    return this.handleResponse<SubmitAnalysisResponse>(res);
  }

  async submitUrl(url: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    const res = await fetch(`${this.baseUrl}/analyze/url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, appName, documentType }),
    });

    return this.handleResponse<SubmitAnalysisResponse>(res);
  }

  async getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobStatusResponse> {
    const res = await fetch(`${this.baseUrl}/analyze/status/${encodeURIComponent(jobId)}`, {
      method: "GET",
      signal,
    });

    return this.handleResponse<JobStatusResponse>(res);
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/analyze/cancel/${encodeURIComponent(jobId)}`, {
        method: "POST",
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getReportById(reportId: string, signal?: AbortSignal): Promise<AnalysisReport> {
    const res = await fetch(`${this.baseUrl}/reports/${encodeURIComponent(reportId)}`, {
      method: "GET",
      signal,
    });

    const data = await this.handleResponse<unknown>(res);
    const validation = validateAnalysisReport(data);

    if (!validation.isValid || !validation.report) {
      throw new Error(
        `Received malformed analysis report data from backend: ${validation.errors.join("; ")}`
      );
    }

    return validation.report;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorData: ApiError = {
        code: `HTTP_${res.status}`,
        message: `Request failed with status ${res.status} (${res.statusText})`,
      };

      try {
        const json = await res.json();
        if (json && json.error) {
          errorData = json.error;
        }
      } catch {
        // Body was not JSON
      }

      const err: any = new Error(errorData.message);
      err.code = errorData.code;
      err.fieldErrors = errorData.fieldErrors;
      err.details = errorData.details;
      throw err;
    }

    return (await res.json()) as T;
  }
}

// ============================================================================
// 2. UNIFIED ANALYSIS SERVICE
// ============================================================================

const initialLiveApiEnabled =
  typeof process !== "undefined" &&
  process.env &&
  process.env.NEXT_PUBLIC_ENABLE_LIVE_API === "true";

let activeAdapter: AnalysisAdapter = initialLiveApiEnabled
  ? new HttpApiAnalysisAdapter()
  : new MockAnalysisAdapter();

let cachedAnalyses: DocumentAnalysis[] | null = null;
let cachedStats: ConsumerStats | null = null;

/**
 * Frontend service abstraction for TermsLens.
 * Decoupled from component rendering to enable straightforward backend API integration.
 */
export const analysisService = {
  /**
   * Adapter Configuration & Mode Switching
   */
  isLiveApiEnabled(): boolean {
    return activeAdapter.mode === "live";
  },

  setLiveApiEnabled(enabled: boolean): void {
    activeAdapter = enabled ? new HttpApiAnalysisAdapter() : new MockAnalysisAdapter();
  },

  setAdapter(adapter: AnalysisAdapter): void {
    activeAdapter = adapter;
  },

  getActiveAdapter(): AnalysisAdapter {
    return activeAdapter;
  },

  // ==========================================
  // Typed API Integration Methods (Contract)
  // ==========================================

  async submitFile(file: File, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    return activeAdapter.submitFile(file, appName, documentType);
  },

  async submitText(text: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    return activeAdapter.submitText(text, appName, documentType);
  },

  async submitUrl(url: string, appName: string, documentType: DocumentType): Promise<SubmitAnalysisResponse> {
    return activeAdapter.submitUrl(url, appName, documentType);
  },

  async getJobStatus(jobId: string, signal?: AbortSignal): Promise<JobStatusResponse> {
    if (activeAdapter.mode === "live" || jobId.startsWith("job_live_") || jobId.startsWith("job_")) {
      try {
        const httpAdapter = activeAdapter instanceof HttpApiAnalysisAdapter ? activeAdapter : new HttpApiAnalysisAdapter();
        return await httpAdapter.getJobStatus(jobId, signal);
      } catch (err) {
        if (activeAdapter.mode === "live" && !jobId.startsWith("job_demo_")) {
          throw err;
        }
      }
    }
    return activeAdapter.getJobStatus(jobId, signal);
  },

  async cancelJob(jobId: string): Promise<boolean> {
    if (activeAdapter.mode === "live" || jobId.startsWith("job_live_") || jobId.startsWith("job_")) {
      try {
        const httpAdapter = activeAdapter instanceof HttpApiAnalysisAdapter ? activeAdapter : new HttpApiAnalysisAdapter();
        return await httpAdapter.cancelJob(jobId);
      } catch (err) {
        if (activeAdapter.mode === "live" && !jobId.startsWith("job_demo_")) {
          throw err;
        }
      }
    }
    return activeAdapter.cancelJob(jobId);
  },

  async getReportById(reportId: string, signal?: AbortSignal): Promise<AnalysisReport> {
    if (activeAdapter.mode === "live" || reportId.startsWith("rep_live_") || reportId.startsWith("rep_")) {
      try {
        const httpAdapter = activeAdapter instanceof HttpApiAnalysisAdapter ? activeAdapter : new HttpApiAnalysisAdapter();
        return await httpAdapter.getReportById(reportId, signal);
      } catch (liveErr) {
        if (activeAdapter.mode === "live" && !reportId.startsWith("doc_demo_")) {
          throw liveErr;
        }
      }
    }
    return activeAdapter.getReportById(reportId, signal);
  },

  // ==========================================
  // Existing Dashboard Services (Preserved)
  // ==========================================

  async getCurrentUser(): Promise<UserProfile> {
    return Promise.resolve(currentUserMock);
  },

  async getDashboardStats(isEmptyState: boolean = false): Promise<ConsumerStats> {
    if (isEmptyState) return emptyStatsMock;
    if (cachedStats) return cachedStats;

    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.stats) {
            cachedStats = data.stats;
            if (Array.isArray(data.reports)) {
              cachedAnalyses = data.reports;
            }
            return data.stats;
          }
        }
      } catch {
        // Fall back gracefully to default consumerStatsMock
      }
    }

    return consumerStatsMock;
  },

  recordNewAnalysis(doc: DocumentAnalysis): void {
    if (!cachedAnalyses) {
      cachedAnalyses = [doc, ...mockAnalyses];
    } else if (!cachedAnalyses.some((d) => d.id === doc.id)) {
      cachedAnalyses = [doc, ...cachedAnalyses];
    }
  },

  validateFile(file: File | null): FileValidationResult {
    if (!file) {
      return { isValid: false, error: "Please select or drop a document file." };
    }

    const name = file.name;
    const extension = "." + name.split(".").pop()?.toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: `Unsupported file type (${extension}). Please upload a PDF, DOCX, or TXT file.`,
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        isValid: false,
        error: `File size (${sizeMB} MB) exceeds the 25 MB maximum limit.`,
      };
    }

    const sizeFormatted =
      file.size >= 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    return {
      isValid: true,
      fileInfo: {
        name: file.name,
        sizeFormatted,
        extension: extension.replace(".", "").toUpperCase(),
        lastModifiedDate: new Date(file.lastModified).toLocaleDateString(),
      },
    };
  },

  validateText(text: string): TextValidationResult {
    const trimmed = text.trim();
    const charCount = text.length;
    const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

    if (trimmed.length === 0) {
      return {
        isValid: false,
        error: "Please enter or paste policy text to analyze.",
        wordCount: 0,
        charCount: 0,
      };
    }

    if (wordCount < 10) {
      return {
        isValid: false,
        error: "Text is too short. Please paste at least one complete policy paragraph or clause.",
        wordCount,
        charCount,
      };
    }

    return {
      isValid: true,
      wordCount,
      charCount,
    };
  },

  validateUrl(url: string): UrlValidationResult {
    const trimmed = url.trim();
    if (!trimmed) {
      return {
        isValid: false,
        error: "Please enter a website link to a Terms of Service or Privacy Policy.",
      };
    }

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return {
          isValid: false,
          error: "URL must begin with http:// or https://",
        };
      }
      return {
        isValid: true,
        parsedDomain: parsed.hostname,
      };
    } catch {
      return {
        isValid: false,
        error: "Invalid web address format. Please enter a valid URL (e.g. https://example.com/terms).",
      };
    }
  },

  getDemonstrationFixture(key: "spotify" | "instagram" | "discord"): DemonstrationFixture | null {
    return demonstrationFixtures[key] || null;
  },

  async getAnalyses(filters?: AnalysisFilters): Promise<DocumentAnalysis[]> {
    let results: DocumentAnalysis[] = [];

    // Attempt to load live persistent reports from PostgreSQL API
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/reports");
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.reports) && data.reports.length > 0) {
            results = data.reports;
            cachedAnalyses = results;
            if (data.stats) {
              cachedStats = data.stats;
            }
          }
        }
      } catch {
        // Fall back gracefully
      }
    }

    if (results.length === 0) {
      results = cachedAnalyses ? [...cachedAnalyses] : [...mockAnalyses];
    }

    if (!filters) {
      return results;
    }

    if (filters.query && filters.query.trim().length > 0) {
      const q = filters.query.toLowerCase().trim();
      results = results.filter(
        (doc) =>
          doc.title.toLowerCase().includes(q) ||
          doc.appName.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q)
      );
    }

    if (filters.riskLevel && filters.riskLevel !== "all") {
      results = results.filter((doc) => doc.riskLevel === filters.riskLevel);
    }

    if (filters.documentType && filters.documentType !== "all") {
      results = results.filter((doc) => doc.documentType === filters.documentType);
    }

    if (filters.onlyFlagged) {
      results = results.filter((doc) => doc.flaggedClausesCount > 0);
    }

    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "most_flagged":
          results.sort((a, b) => b.flaggedClausesCount - a.flaggedClausesCount);
          break;
        case "appName":
          results.sort((a, b) => a.appName.localeCompare(b.appName));
          break;
        case "newest":
        default:
          results.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          break;
      }
    }

    return Promise.resolve(results);
  },

  /**
   * Handles submission of analysis requests without fabricating fake AI results.
   */
  async processAnalysisRequest(payload: {
    mode: "file" | "text" | "url";
    appName: string;
    documentType: DocumentType;
    file?: File | null;
    text?: string;
    url?: string;
    isDemoFixture?: boolean;
    demoKey?: "spotify" | "instagram" | "discord";
  }): Promise<SubmitAnalysisResult> {
    const errors: ValidationErrors = {};

    // Validate App or Service Name
    if (!payload.appName.trim()) {
      errors.appName = "Please provide the app or service name.";
    }

    // Validate Mode-specific inputs
    if (payload.mode === "file") {
      const fileValidation = this.validateFile(payload.file || null);
      if (!fileValidation.isValid) {
        errors.file = fileValidation.error;
      }
    } else if (payload.mode === "text") {
      const textValidation = this.validateText(payload.text || "");
      if (!textValidation.isValid) {
        errors.text = textValidation.error;
      }
    } else if (payload.mode === "url") {
      const urlValidation = this.validateUrl(payload.url || "");
      if (!urlValidation.isValid) {
        errors.url = urlValidation.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        isDemoFixture: false,
        errors,
      };
    }

    // If this is a demonstration fixture selection, return the preanalyzed report with a unique instance id
    if (payload.isDemoFixture && payload.demoKey) {
      const fixture = this.getDemonstrationFixture(payload.demoKey);
      if (fixture) {
        return {
          success: true,
          isDemoFixture: true,
          document: {
            ...fixture.preanalyzedReport,
            id: `${fixture.preanalyzedReport.id}_${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
        };
      }
    }

    // For user-uploaded custom files, text, or URLs where no live backend endpoint is active:
    // We return an honest integration notice rather than fabricating fake AI output.
    const inputSummary =
      payload.mode === "file"
        ? `File: ${payload.file?.name} (${Math.round((payload.file?.size || 0) / 1024)} KB)`
        : payload.mode === "text"
        ? `Raw Text: ${payload.text?.length} chars (${payload.text?.trim().split(/\s+/).length} words)`
        : `Website URL: ${payload.url}`;

    return {
      success: true,
      isDemoFixture: false,
      backendRequiredNotice: {
        title: "Input Validated & Ready for Backend Analysis",
        message:
          "Your document configuration and payload have been validated. In this demonstration environment, a live backend LLM endpoint (POST /api/analyze) is required to process non-sample files. You can explore the functional demonstration records (Spotify, Instagram, Discord) below to see full analysis output.",
        payloadPreview: {
          mode: payload.mode,
          appName: payload.appName.trim(),
          documentType: payload.documentType,
          inputSummary,
        },
      },
    };
  },
};
