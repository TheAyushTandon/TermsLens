"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Link2,
  FileCode,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileCheck,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  Terminal,
  Loader2,
  ExternalLink,
  XCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DocumentType,
  DocumentAnalysis,
  InputMode,
  ValidationErrors,
  PipelineStage,
  AnalysisReport,
} from "@/types";
import { analysisService } from "@/services/analysis-service";
import { useAnalysisJob } from "@/hooks/use-analysis-job";

interface DocumentUploadSectionProps {
  onAnalysisCreated: (newAnalysis: DocumentAnalysis) => void;
  onOpenAnalysis: (analysis: DocumentAnalysis) => void;
  isHighlit?: boolean;
}

const SAMPLE_POLICY_TEXT = `TERMS OF SERVICE FOR CLOUDPULSE

1. ACCEPTANCE OF TERMS
By accessing or using CloudPulse (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms, do not use the Service.

2. MANDATORY ARBITRATION AND CLASS ACTION WAIVER
Any dispute, claim or controversy arising out of or relating to this Agreement or the breach, termination, enforcement, interpretation or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by binding arbitration in Wilmington, Delaware before one arbitrator. YOU AND CLOUDPULSE AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.

3. DATA COLLECTION AND TELEMETRY
CloudPulse collects personal information including your full name, email address, IP address, device fingerprints, and geolocation coordinates. We track application usage statistics and telemetry to personalize services and optimize our infrastructure.

4. THIRD-PARTY DATA SHARING AND ADVERTISING
We may share your personal data, interaction history, and profile insights with third-party advertising partners, commercial affiliates, and data brokers for behavioral ad targeting and marketing campaigns.

5. AUTOMATIC SUBSCRIPTION RENEWAL AND BILLING
Subscriptions are billed on a recurring monthly basis. Your subscription will automatically renew at the beginning of each billing cycle unless cancelled at least forty-eight (48) hours prior to the renewal date. All payments are non-refundable.

6. ACCOUNT TERMINATION AND DATA RETENTION
CloudPulse reserves the right to suspend or terminate your account at our sole discretion, without prior notice or liability, for any reason. We retain user logs and telemetry indefinitely for audit, security, and analytical purposes.

7. MODIFICATIONS TO AGREEMENT
We reserve the right to modify these Terms at any time without individual notification. Your continued use of the Service following any changes constitutes acceptance of the new Terms.`;

const PIPELINE_STAGES: Array<{
  stage: PipelineStage;
  code: string;
  title: string;
  description: string;
}> = [
  {
    stage: "PREPROCESSING",
    code: "PRE",
    title: "Document Ingestion",
    description: "Parsing text and segmenting document clauses",
  },
  {
    stage: "P01_CLAUSE_EXTRACTION",
    code: "P01",
    title: "Clause Extraction",
    description: "Extracting legal clauses and binding provisions",
  },
  {
    stage: "P02_PLAIN_LANGUAGE_EXPLANATION",
    code: "P02",
    title: "Plain-Language Explanation",
    description: "Simplifying complex terms and legal jargon",
  },
  {
    stage: "P03_RISK_AND_PRIVACY_ANALYSIS",
    code: "P03",
    title: "Risk & Privacy Analysis",
    description: "Identifying consumer concerns and sensitive practices",
  },
  {
    stage: "P04_EVIDENCE_VERIFICATION",
    code: "P04",
    title: "Evidence Verification",
    description: "Cross-referencing claims against source text quotes",
  },
  {
    stage: "P05_FINAL_REPORT_GENERATION",
    code: "P05",
    title: "Final Report Synthesis",
    description: "Structuring executive summary and verified findings",
  },
];

export function DocumentUploadSection({
  onAnalysisCreated,
  onOpenAnalysis,
  isHighlit = false,
}: DocumentUploadSectionProps) {
  // Input mode state
  const [activeTab, setActiveTab] = React.useState<InputMode>("file");

  // File Upload State
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [fileDetails, setFileDetails] = React.useState<{
    name: string;
    sizeFormatted: string;
    extension: string;
    lastModifiedDate: string;
  } | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  // Paste Text State
  const [pastedText, setPastedText] = React.useState("");
  const textCounts = React.useMemo(() => {
    const trimmed = pastedText.trim();
    const charCount = pastedText.length;
    const wordCount = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;
    return { charCount, wordCount };
  }, [pastedText]);

  // Website URL State
  const [policyUrl, setPolicyUrl] = React.useState("");

  // Document Configuration State
  const [documentType, setDocumentType] = React.useState<DocumentType>("terms_of_service");
  const [appName, setAppName] = React.useState("");

  // Demonstration Fixture State
  const [activeDemoKey, setActiveDemoKey] = React.useState<"spotify" | "instagram" | "discord" | null>(null);
  const [demoNotice, setDemoNotice] = React.useState<string | null>(null);

  // Live Pipeline Engine Mode (Live Gemini AI vs Demo Mode)
  const [isLiveMode, setIsLiveMode] = React.useState(true);

  React.useEffect(() => {
    // Default to Live Gemini AI pipeline in client browser
    analysisService.setLiveApiEnabled(true);
  }, []);

  const handleToggleLiveMode = (live: boolean) => {
    setIsLiveMode(live);
    analysisService.setLiveApiEnabled(live);
  };

  // Validation & Processing State
  const [errors, setErrors] = React.useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [backendNotice, setBackendNotice] = React.useState<{
    title: string;
    message: string;
    payloadPreview: {
      mode: string;
      appName: string;
      documentType: string;
      inputSummary: string;
    };
  } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();
  const analysisJob = useAnalysisJob();

  // Synchronize completed report to the dashboard
  React.useEffect(() => {
    if (analysisJob.jobState === "completed" && analysisJob.report) {
      const rep = analysisJob.report;
      const convertedAnalysis: DocumentAnalysis = {
        id: rep.id,
        title: rep.documentTitle,
        appName: rep.appName,
        documentType: rep.documentType,
        status: "completed",
        riskScore: rep.highAttentionCount > 0 ? 82 : 45,
        riskLevel: rep.highAttentionCount > 0 ? "high" : "medium",
        clausesCount: rep.totalClausesAnalyzed,
        flaggedClausesCount: rep.highAttentionCount + rep.moderateAttentionCount,
        privacyFindingsCount: rep.privacyFindings.length,
        summary: rep.documentSummary,
        createdAt: rep.analysisDate,
        estimatedReadingTimeMinutes: 25,
        timeSavedMinutes: 20,
        isDemonstrationFixture: rep.isDemonstrationFixture,
        illustrativeNotice: rep.demonstrationNotice,
        findings: rep.clauses.map((c) => ({
          id: c.id,
          category: "arbitration",
          title: c.title,
          riskLevel: c.attentionLevel === "high" ? "high" : c.attentionLevel === "moderate" ? "medium" : "low",
          excerpt: c.originalClauseText,
          explanation: c.shortExplanation,
          recommendation: c.analysis.actionableAdvice || c.analysis.whyThisClauseMatters,
        })),
      };
      onAnalysisCreated(convertedAnalysis);
    }
  }, [analysisJob.jobState, analysisJob.report, onAnalysisCreated]);

  // Clean error when inputs change
  const clearError = (field: keyof ValidationErrors) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  // Mode switching without stale errors
  const handleTabChange = (tab: InputMode) => {
    setActiveTab(tab);
    setErrors({});
    setBackendNotice(null);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    clearError("file");
    setBackendNotice(null);
    setActiveDemoKey(null);
    setDemoNotice(null);

    const validation = analysisService.validateFile(file);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, file: validation.error }));
      setSelectedFile(null);
      setFileDetails(null);
      return;
    }

    setSelectedFile(file);
    setFileDetails(validation.fileInfo || null);

    // Auto-infer app name from filename if not yet filled
    if (!appName.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ")
        .replace(/(terms|privacy|policy|agreement|of|service|eula)/gi, "")
        .trim();
      if (cleanName.length > 0) {
        setAppName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFile(null);
    setFileDetails(null);
    clearError("file");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReplaceFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  // Popular App Demonstration Shortcuts
  const handleSelectDemoFixture = (key: "spotify" | "instagram" | "discord") => {
    const fixture = analysisService.getDemonstrationFixture(key);
    if (!fixture) return;

    setActiveDemoKey(key);
    setAppName(fixture.appName);
    setDocumentType(fixture.documentType);
    setActiveTab("text");
    setPastedText(fixture.text);
    setErrors({});
    setBackendNotice(null);

    setDemoNotice(
      `Loaded illustrative demonstration text for ${fixture.appName}. Click "Analyze Document" to run the 5-stage AI pipeline, or inspect the pre-analyzed fixture directly.`
    );
  };

  const handleOpenInstantDemoModal = async () => {
    if (!activeDemoKey) return;
    const result = await analysisService.processAnalysisRequest({
      mode: activeTab,
      appName,
      documentType,
      file: selectedFile,
      text: pastedText,
      url: policyUrl,
      isDemoFixture: true,
      demoKey: activeDemoKey,
    });

    if (result.document) {
      onAnalysisCreated(result.document);
      onOpenAnalysis(result.document);
    }
  };

  const handleLoadSamplePolicy = () => {
    setActiveTab("text");
    setAppName("CloudPulse");
    setDocumentType("terms_of_service");
    setPastedText(SAMPLE_POLICY_TEXT);
    setActiveDemoKey(null);
    setDemoNotice(null);
    setBackendNotice(null);
    clearError("text");
    clearError("appName");
  };

  // Clear text editor
  const handleClearText = () => {
    setPastedText("");
    setActiveDemoKey(null);
    setDemoNotice(null);
    clearError("text");
  };

  // Helper to test 5-stage pipeline progression via active adapter
  const handleRunSimulation = async () => {
    setBackendNotice(null);
    setErrors({});
    analysisService.setLiveApiEnabled(false);
    if (activeTab === "file" && selectedFile) {
      await analysisJob.startFileJob(selectedFile, appName.trim() || "Uploaded Document", documentType);
    } else if (activeTab === "text") {
      await analysisJob.startTextJob(pastedText.trim() || "Sample policy provisions", appName.trim() || "Pasted Policy", documentType);
    } else if (activeTab === "url") {
      await analysisJob.startUrlJob(policyUrl.trim() || "https://example.com/terms", appName.trim() || "Website Terms", documentType);
    }
  };

  // Evaluates discrete state for each pipeline step
  const getStageState = (stage: PipelineStage): "completed" | "active" | "failed" | "pending" => {
    if (analysisJob.jobState === "completed") return "completed";
    if (analysisJob.jobState === "cancelled") return "pending";

    const stageOrder: PipelineStage[] = [
      "PREPROCESSING",
      "P01_CLAUSE_EXTRACTION",
      "P02_PLAIN_LANGUAGE_EXPLANATION",
      "P03_RISK_AND_PRIVACY_ANALYSIS",
      "P04_EVIDENCE_VERIFICATION",
      "P05_FINAL_REPORT_GENERATION",
      "COMPLETED",
    ];

    const currentIndex = stageOrder.indexOf(analysisJob.currentStage || "PREPROCESSING");
    const targetIndex = stageOrder.indexOf(stage);

    if (analysisJob.jobState === "failed") {
      if (targetIndex === currentIndex) return "failed";
      if (targetIndex < currentIndex) return "completed";
      return "pending";
    }

    if (targetIndex < currentIndex) return "completed";
    if (targetIndex === currentIndex) return "active";
    return "pending";
  };

  // Submit / Analyze handler
  const handleAnalyze = async () => {
    setErrors({});
    setBackendNotice(null);
    setIsSubmitting(true);

    try {
      // 1. Validate form inputs
      const newErrors: ValidationErrors = {};
      if (!appName.trim()) {
        newErrors.appName = "Please enter an application or counterparty name.";
      }

      if (activeTab === "file") {
        if (!selectedFile) {
          newErrors.file = "Please upload a policy document file (PDF, DOCX, or TXT).";
        }
      } else if (activeTab === "text") {
        const textVal = analysisService.validateText(pastedText);
        if (!textVal.isValid) {
          newErrors.text = textVal.error;
        }
      } else if (activeTab === "url") {
        const urlVal = analysisService.validateUrl(policyUrl);
        if (!urlVal.isValid) {
          newErrors.url = urlVal.error;
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }

      // 2. Synchronize active adapter mode (live AI vs mock demo)
      analysisService.setLiveApiEnabled(isLiveMode);

      // 3. Dispatch pipeline job
      if (activeTab === "file" && selectedFile) {
        await analysisJob.startFileJob(selectedFile, appName.trim(), documentType);
      } else if (activeTab === "text") {
        await analysisJob.startTextJob(pastedText.trim(), appName.trim(), documentType);
      } else if (activeTab === "url") {
        await analysisJob.startUrlJob(policyUrl.trim(), appName.trim(), documentType);
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrors({ general: err?.message || "An unexpected error occurred while processing your request." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      className={`border-slate-200/90 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden shadow-xs transition-all duration-300 ${
        isHighlit ? "ring-2 ring-blue-600/30" : ""
      }`}
    >
      <CardContent className="p-5 sm:p-6">
        {/* Section Header with Mode Selector and Input Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Analyze a Policy</span>
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                  isLiveMode
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400"
                    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLiveMode ? "bg-emerald-500 animate-pulse" : "bg-blue-500"
                  }`}
                />
                {isLiveMode ? "LIVE AI ACTIVE (GEMINI 3.5)" : "DEMO SIMULATION"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose an input method below, specify the app name, and run the 5-stage policy explainer pipeline.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Live AI vs Demo Switcher */}
            <div
              role="group"
              aria-label="Engine Mode"
              className="flex items-center rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-900 text-xs"
            >
              <button
                type="button"
                onClick={() => handleToggleLiveMode(true)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  isLiveMode
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
                title="Execute real Gemini AI inference and persist to PostgreSQL"
              >
                <Sparkles className="h-3 w-3" />
                <span>Live Gemini AI</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleLiveMode(false)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  !isLiveMode
                    ? "bg-slate-800 text-white shadow-xs dark:bg-slate-700 font-semibold"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
                title="Test discrete stage progression without live AI calls"
              >
                <span>Demo Mode</span>
              </button>
            </div>

            {/* Input Mode Tabs */}
            <div
              role="tablist"
              className="flex items-center rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800 text-xs"
            >
              <button
                role="tab"
                aria-selected={activeTab === "file"}
                onClick={() => handleTabChange("file")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  activeTab === "file"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>File Upload</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "text"}
                onClick={() => handleTabChange("text")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  activeTab === "text"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Paste Text</span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === "url"}
                onClick={() => handleTabChange("url")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  activeTab === "url"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Website URL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Demo Notification Banner if shortcut was clicked */}
        {demoNotice && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 rounded-xl border border-blue-200 bg-blue-50/80 p-3.5 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            <div className="flex items-start gap-2.5 flex-1">
              <Info className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <span className="font-semibold">Demonstration Content:</span> {demoNotice}
              </div>
            </div>
            {activeDemoKey && (
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleOpenInstantDemoModal}
                className="self-start sm:self-auto border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300"
              >
                View Sample Breakdown
              </Button>
            )}
          </div>
        )}

        {/* Mode 1: File Upload */}
        {activeTab === "file" && (
          <div className="mt-5 space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => {
                if (!selectedFile) fileInputRef.current?.click();
              }}
              className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-7 text-center transition-all ${
                dragActive
                  ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20"
                  : selectedFile
                  ? "border-emerald-300 bg-emerald-50/20 dark:border-emerald-800 dark:bg-emerald-950/10 cursor-default"
                  : errors.file
                  ? "border-rose-300 bg-rose-50/20 dark:border-rose-800 dark:bg-rose-950/10 cursor-pointer"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/40 cursor-pointer"
              }`}
            >
              <input
                ref={fileInputRef}
                id="file-upload-input"
                name="fileUpload"
                aria-label="Upload document file"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt"
                onChange={handleFileInputChange}
              />

              {selectedFile && fileDetails ? (
                <div className="flex flex-col items-center w-full max-w-md space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shadow-xs">
                    <FileCheck className="h-6 w-6" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-all">
                      {fileDetails.name}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {fileDetails.extension}
                      </span>
                      <span>•</span>
                      <span>{fileDetails.sizeFormatted}</span>
                      <span>•</span>
                      <span>Modified {fileDetails.lastModifiedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={handleReplaceFile}
                      leftIcon={<RefreshCw className="h-3 w-3" />}
                    >
                      Replace file
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleRemoveFile}
                      leftIcon={<Trash2 className="h-3 w-3 text-rose-500" />}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Click to choose file
                    </span>{" "}
                    <span className="text-xs text-slate-500">or drag and drop here</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Supports PDF, DOCX, and TXT files • Maximum file size 25 MB
                  </p>
                </div>
              )}
            </div>

            {errors.file && (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{errors.file}</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Paste Raw Text */}
        {activeTab === "text" && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="policy-text-area"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Policy Text Content
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-400">
                  {textCounts.wordCount.toLocaleString()} words • {textCounts.charCount.toLocaleString()} chars
                </span>
                <button
                  type="button"
                  onClick={handleLoadSamplePolicy}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
                >
                  Load Sample Policy
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleClearText}
                  disabled={!pastedText}
                  className="text-[11px] text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:hover:text-slate-500 transition-colors"
                >
                  Clear text
                </button>
              </div>
            </div>

            <textarea
              id="policy-text-area"
              name="policyText"
              value={pastedText}
              onChange={(e) => {
                setPastedText(e.target.value);
                clearError("text");
              }}
              placeholder="Paste contract terms, arbitration provisions, or privacy policy text here..."
              rows={7}
              className={`w-full rounded-xl border bg-white p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:bg-slate-900 dark:text-slate-100 font-sans leading-relaxed transition-colors ${
                errors.text
                  ? "border-rose-300 dark:border-rose-800"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            />

            {errors.text && (
              <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{errors.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Mode 3: Website URL */}
        {activeTab === "url" && (
          <div className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="policy-url-input"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Link to Terms or Privacy Policy
              </label>
              <Input
                id="policy-url-input"
                name="policyUrl"
                type="url"
                value={policyUrl}
                onChange={(e) => {
                  setPolicyUrl(e.target.value);
                  clearError("url");
                }}
                placeholder="https://example.com/terms or https://service.com/privacy"
                leftIcon={<Link2 className="h-4 w-4" />}
                className={`h-9 text-xs ${
                  errors.url ? "border-rose-300 dark:border-rose-800" : ""
                }`}
              />

              {errors.url && (
                <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 mt-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{errors.url}</span>
                </div>
              )}
            </div>

            {/* Honest URL ingestion notice matching backend contract */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400 leading-relaxed">
              <strong className="font-semibold text-slate-700 dark:text-slate-300">
                URL Ingestion Architecture:
              </strong>{" "}
              Policy links are fetched server-side with strict SSRF defense (blocking private IP ranges, loopbacks, and localhost), a 15-second timeout, and a 10 MB payload limit. If a site requires login or blocks automated fetching, copy and paste the policy text into the Paste Text tab instead.
            </div>
          </div>
        )}

        {/* Document Configuration Inputs: Document Type and App Name */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="document-type-select"
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1"
            >
              Document Type
            </label>
            <select
              id="document-type-select"
              name="documentType"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="terms_of_service">Terms of Service</option>
              <option value="privacy_policy">Privacy Policy</option>
              <option value="eula">End User Licence Agreement</option>
              <option value="subscription_agreement">Subscription Agreement</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="app-name-input"
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1"
            >
              App or Service Name <span className="text-rose-500">*</span>
            </label>
            <Input
              id="app-name-input"
              name="appName"
              value={appName}
              onChange={(e) => {
                setAppName(e.target.value);
                clearError("appName");
              }}
              placeholder="e.g. Spotify, Instagram, Discord"
              className={`h-9 text-xs ${
                errors.appName ? "border-rose-300 dark:border-rose-800" : ""
              }`}
            />
            {errors.appName && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                {errors.appName}
              </p>
            )}
          </div>
        </div>

        {/* General Error notice if any */}
        {errors.general && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errors.general}</span>
          </div>
        )}

        {/* Honest Backend Integration Notice Dialog/Card for custom non-demo submissions */}
        {backendNotice && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-3 animate-in fade-in-50">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {backendNotice.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {backendNotice.message}
                </p>
              </div>
            </div>

            {/* Prepared Payload Summary */}
            <div className="rounded-lg bg-white p-3 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-sans font-semibold uppercase text-[10px] pb-1 border-b border-slate-100 dark:border-slate-800">
                <Terminal className="h-3 w-3" />
                <span>Validated Payload Schema (Ready for POST /api/analyze):</span>
              </div>
              <div>Mode: {backendNotice.payloadPreview.mode}</div>
              <div>App Name: {backendNotice.payloadPreview.appName}</div>
              <div>Document Type: {backendNotice.payloadPreview.documentType}</div>
              <div>Payload: {backendNotice.payloadPreview.inputSummary}</div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs pt-1">
              <span className="text-[11px] text-slate-500">
                Test the discrete stage-based stepper UI in this demo environment:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleSelectDemoFixture("spotify")}
                >
                  Load Spotify Demo
                </Button>
                <Button
                  size="xs"
                  onClick={handleRunSimulation}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Simulate 5-Stage Pipeline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 5-Stage Analysis Pipeline Progress Stepper */}
        {(analysisJob.isProcessing ||
          analysisJob.jobState === "completed" ||
          analysisJob.jobState === "failed" ||
          analysisJob.jobState === "cancelled") && (
          <div className="mt-5 rounded-xl border border-blue-200/90 bg-gradient-to-b from-blue-50/40 to-white dark:border-blue-900/60 dark:from-slate-900 dark:to-slate-950 p-5 space-y-4 shadow-xs animate-in fade-in-50">
            {/* Stepper Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-blue-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                {analysisJob.isProcessing ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : analysisJob.jobState === "completed" ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                ) : analysisJob.jobState === "cancelled" ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>
                      {analysisJob.jobState === "completed"
                        ? "Analysis Complete & Verified"
                        : analysisJob.jobState === "cancelled"
                        ? "Analysis Cancelled"
                        : analysisJob.jobState === "failed"
                        ? "Analysis Failed"
                        : "Analyzing Document..."}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold rounded-full px-2 py-0.5 ${
                        analysisService.isLiveApiEnabled()
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                      }`}
                    >
                      {analysisService.isLiveApiEnabled() ? "LIVE GEMINI AI" : "DEMO PIPELINE"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {analysisJob.stageMessage || "Executing 5-stage prompt pipeline"}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {analysisJob.isProcessing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => analysisJob.cancel()}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
                  >
                    Cancel Analysis
                  </Button>
                )}
                {analysisJob.jobState === "completed" && analysisJob.reportId && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => router.push(`/reports/${analysisJob.reportId}`)}
                    rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Open Full Report
                  </Button>
                )}
                {(analysisJob.jobState === "completed" ||
                  analysisJob.jobState === "failed" ||
                  analysisJob.jobState === "cancelled") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => analysisJob.reset()}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Discrete Pipeline Stages Stepper List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {PIPELINE_STAGES.map((s) => {
                const state = getStageState(s.stage);
                return (
                  <div
                    key={s.stage}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition-all ${
                      state === "completed"
                        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        : state === "active"
                        ? "border-blue-400 bg-blue-50/70 dark:border-blue-700 dark:bg-blue-950/40 ring-1 ring-blue-400/40"
                        : state === "failed"
                        ? "border-rose-300 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30"
                        : "border-slate-200/70 bg-white/60 dark:border-slate-800 dark:bg-slate-900/40 opacity-60"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {state === "completed" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      )}
                      {state === "active" && (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                      )}
                      {state === "failed" && (
                        <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      )}
                      {state === "pending" && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-mono font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          {s.code}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          {s.code}
                        </span>
                        <span
                          className={`text-xs font-semibold truncate ${
                            state === "active"
                              ? "text-blue-700 dark:text-blue-300"
                              : state === "completed"
                              ? "text-slate-800 dark:text-slate-200"
                              : state === "failed"
                              ? "text-rose-700 dark:text-rose-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {s.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Failure Alert Banner if any */}
            {analysisJob.jobState === "failed" && analysisJob.error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Pipeline Execution Failed</p>
                  <p className="mt-0.5 text-[11px]">{analysisJob.error}</p>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={handleRunSimulation}
                  className="border-rose-300 text-rose-700 hover:bg-rose-100"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Cancelled Notice Banner if any */}
            {analysisJob.jobState === "cancelled" && (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 flex-shrink-0 text-amber-600" />
                  <span>Analysis job was cancelled by user. Background requests aborted.</span>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => analysisJob.reset()}
                >
                  Dismiss
                </Button>
              </div>
            )}

            {/* Completion Banner */}
            {analysisJob.jobState === "completed" && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <strong>Analysis Finished:</strong> 5-stage pipeline passed evidence grounding checks with zero ungrounded claims.
                  </span>
                </div>
                {analysisJob.reportId && (
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => router.push(`/reports/${analysisJob.reportId}`)}
                    rightIcon={<ExternalLink className="h-3 w-3" />}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    View Report
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Actions & Popular App Shortcuts */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="text-slate-400 font-medium">Demonstration shortcuts:</span>
            <button
              type="button"
              onClick={() => handleSelectDemoFixture("spotify")}
              disabled={analysisJob.isProcessing}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50 ${
                activeDemoKey === "spotify"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300"
              }`}
            >
              Spotify
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoFixture("instagram")}
              disabled={analysisJob.isProcessing}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50 ${
                activeDemoKey === "instagram"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300"
              }`}
            >
              Instagram
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemoFixture("discord")}
              disabled={analysisJob.isProcessing}
              className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50 ${
                activeDemoKey === "discord"
                  ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300"
              }`}
            >
              Discord
            </button>
          </div>

          <Button
            onClick={handleAnalyze}
            isLoading={isSubmitting || analysisJob.isProcessing}
            disabled={analysisJob.isProcessing}
            size="sm"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="font-medium"
          >
            {analysisJob.isProcessing
              ? "Running Pipeline..."
              : isSubmitting
              ? "Validating & Submitting..."
              : "Analyze Document"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
