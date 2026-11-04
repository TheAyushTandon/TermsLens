export type DocumentType =
  | "terms_of_service"
  | "privacy_policy"
  | "eula"
  | "subscription_agreement"
  | "other";

export type AnalysisStatus = "completed" | "processing" | "failed" | "queued";

export type RiskLevel = "high" | "medium" | "low" | "safe";

export type InputMode = "file" | "text" | "url";

// ==========================================
// Phase 2: Analysis Results Dashboard Models
// ==========================================

export type AttentionLevel = "high" | "moderate" | "informational";
export type RiskClassification = AttentionLevel;

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

export interface EvidenceReference {
  id: string;
  sectionHeading?: string; // e.g. "Section 14.2 — Dispute Resolution"
  sectionNumber?: string;  // e.g. "14.2"
  sourcePage?: number;     // e.g. 12 (or undefined if unavailable)
  sourceReferenceText: string; // Formatted reference string e.g. "Section 14.2 (Page 12)" or "Reference unavailable"
  exactQuote: string;      // Verbatim source excerpt
  highlightExcerpt?: string; // Crucial passage to highlight
}

export interface VerificationResult {
  status: VerificationStatus;
  reviewerType: "automated_pipeline" | "human_auditor" | "simulated_reviewer";
  notes: string;
  verifiedAt: string;
  evidenceMatchesOriginal: boolean;
  simulatedAuditOutcome?: string;
}

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

export type PrivacyDistinction =
  | "explicitly_stated"
  | "reasonable_interpretation"
  | "not_specified";

export type PrivacyTopic =
  | "personal_info_collected"
  | "third_party_sharing"
  | "advertising_tracking"
  | "data_retention"
  | "account_deletion"
  | "ai_model_training";

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

export interface AnalysisReport {
  id: string;
  appName: string;
  documentTitle: string;
  documentType: DocumentType;
  analysisDate: string;
  isDemonstrationFixture?: boolean;
  demonstrationNotice?: string;
  documentSummary: string;
  
  // Overview Counts
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
// Existing Models (Maintained for Dashboard)
// ==========================================

export interface ClauseFinding {
  id: string;
  category:
    | "arbitration"
    | "data_collection"
    | "content_rights"
    | "auto_renewal"
    | "liability"
    | "third_party_sharing";
  title: string;
  riskLevel: RiskLevel;
  excerpt: string;
  explanation: string;
  recommendation: string;
}

export interface DocumentAnalysis {
  id: string;
  title: string;
  appName: string; // Consumer app or service name (e.g. Spotify, Instagram)
  domain?: string;
  documentType: DocumentType;
  status: AnalysisStatus;
  riskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  clausesCount: number;
  flaggedClausesCount: number; // Number of flagged clauses requiring attention
  privacyFindingsCount: number; // Privacy-related findings count
  summary: string;
  createdAt: string;
  fileSizeBytes?: number;
  estimatedReadingTimeMinutes: number;
  timeSavedMinutes: number;
  isDemonstrationFixture?: boolean; // Clearly distinguishes demonstration records from user uploaded policies
  illustrativeNotice?: string; // Explicit disclaimer note for demonstration records
  findings: ClauseFinding[];
}

export interface ConsumerStats {
  documentsAnalyzed: number;
  clausesRequiringAttention: number;
  privacyRelatedFindings: number;
  readingTimeSavedMinutes: number;
  isDemoData?: boolean; // Indicates if metrics are calculated from sample records
  deltas?: {
    documentsAnalyzed?: string;
    clausesRequiringAttention?: string;
    privacyRelatedFindings?: string;
    readingTimeSaved?: string;
  };
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface DemonstrationFixture {
  id: string;
  appName: string;
  documentType: DocumentType;
  title: string;
  text: string;
  preanalyzedReport: DocumentAnalysis;
}

export interface ValidationErrors {
  file?: string;
  text?: string;
  url?: string;
  appName?: string;
  general?: string;
}

// ==========================================
// Phase 3: Integration & Pipeline Contracts
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

export type AnalysisJobState =
  | "idle"
  | "uploading"
  | "queued"
  | "preprocessing"
  | "p01_clause_extraction"
  | "p02_plain_language_explanation"
  | "p03_risk_and_privacy_analysis"
  | "p04_evidence_verification"
  | "p05_final_report_generation"
  | "completed"
  | "failed"
  | "cancelled";

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

export interface ApiError {
  code: string;
  message: string;
  stage?: PipelineStage | string;
  fieldErrors?: Record<string, string>;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}
