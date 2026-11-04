"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Sparkles,
  Layers,
  BookOpen,
  Lock,
  SearchCheck,
  ArrowLeft,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { ReportHeader } from "@/components/report/report-header";
import { DocumentOverviewBar } from "@/components/report/document-overview-bar";
import { ExecutiveSummarySection } from "@/components/report/executive-summary-section";
import { ClauseExplorer } from "@/components/report/clause-explorer";
import { ImportantClausesSection } from "@/components/report/important-clauses-section";
import { PrivacyAnalysisSection } from "@/components/report/privacy-analysis-section";
import { VerificationPanel } from "@/components/report/verification-panel";
import { ExportReportModal } from "@/components/report/export-report-modal";
import { analysisService } from "@/services/analysis-service";
import { AnalysisReport, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";

interface ReportDetailClientProps {
  reportId: string;
}

type ReportTab =
  | "overview"
  | "executive_summary"
  | "clause_explorer"
  | "important_clauses"
  | "privacy"
  | "verification";

export default function ReportDetailClient({
  reportId,
}: ReportDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [report, setReport] = React.useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active navigation tab within report
  const [activeTab, setActiveTab] = React.useState<ReportTab>("overview");

  // Selected clause ID in Clause Explorer
  const [selectedClauseId, setSelectedClauseId] = React.useState<string | undefined>(undefined);

  // Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  // Global search input query
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [userData, reportData] = await Promise.all([
          analysisService.getCurrentUser(),
          analysisService.getReportById(reportId),
        ]);
        setUser(userData);
        setReport(reportData);
        if (reportData && reportData.clauses.length > 0) {
          setSelectedClauseId(reportData.clauses[0].id);
        }
      } catch (err) {
        console.error("Failed to load report data:", err);
        setError("Unable to load the requested analysis report.");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [reportId]);

  const handleSelectClause = (clauseId: string) => {
    setSelectedClauseId(clauseId);
    if (activeTab !== "overview" && activeTab !== "clause_explorer") {
      setActiveTab("clause_explorer");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFD] dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-white dark:border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">
            Loading Analysis Report...
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFD] dark:bg-[#090D16] p-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 text-center space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Report Not Found
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {error || "The analysis report you requested is unavailable or has expired."}
            </p>
          </div>
          <Button
            onClick={() => router.push("/#reports")}
            size="sm"
            className="w-full text-xs"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      user={user}
      activeSection="reports"
      onQuickUploadClick={() => router.push("/#analyze")}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigateToDashboard={() => router.push("/")}
      onNavigateToAnalyze={() => router.push("/#analyze")}
      onNavigateToReports={() => router.push("/#reports")}
    >
      <div className="space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Header with App Title, Metadata, Sample Notice & Export Action */}
        <ReportHeader
          report={report}
          onExportClick={() => setIsExportModalOpen(true)}
          onBackClick={() => router.push("/#reports")}
        />

        {/* Mobile Section Selector (Dropdown for compact screens, prevents overflow) */}
        <div className="sm:hidden">
          <label htmlFor="report-section-select" className="sr-only">
            Select Report Section
          </label>
          <div className="relative">
            <select
              id="report-section-select"
              aria-label="Select report section"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as ReportTab)}
              className="w-full appearance-none rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pr-10 text-xs font-semibold text-slate-800 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10"
            >
              <option value="overview">Complete Overview</option>
              <option value="clause_explorer">Clause Explorer (Priority)</option>
              <option value="important_clauses">Important Clauses ({report.clauses.length})</option>
              <option value="executive_summary">Executive Summary</option>
              <option value="privacy">Privacy Analysis</option>
              <option value="verification">AI Verification</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Interactive Report Section Navigation Tabs (Tablet & Desktop) */}
        <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Complete Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("clause_explorer")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "clause_explorer"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-500" />
            <span>Clause Explorer</span>
            <span className="rounded bg-blue-100 px-1 text-[10px] text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold">
              Priority
            </span>
          </button>

          <button
            onClick={() => setActiveTab("important_clauses")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "important_clauses"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Important Clauses ({report.clauses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("executive_summary")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "executive_summary"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Executive Summary</span>
          </button>

          <button
            onClick={() => setActiveTab("privacy")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "privacy"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Privacy Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab("verification")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === "verification"
                ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <SearchCheck className="h-3.5 w-3.5" />
            <span>AI Verification</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Overview Metric Bar */}
            <DocumentOverviewBar report={report} />

            {/* Priority Feature: Clause Explorer */}
            <section aria-label="Clause Explorer">
              <div className="mb-2">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Clause Explorer (Side-by-Side Inspection)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect the unchanged original contract text on the left and the plain-English translation on the right.
                </p>
              </div>
              <ClauseExplorer
                clauses={report.clauses}
                selectedClauseId={selectedClauseId}
                onSelectClause={handleSelectClause}
              />
            </section>

            {/* Executive Summary */}
            <section aria-label="Executive Summary">
              <ExecutiveSummarySection
                summary={report.executiveSummary}
                appName={report.appName}
                isDemonstration={report.isDemonstrationFixture}
              />
            </section>

            {/* Important Clauses List */}
            <section aria-label="Important Clauses">
              <ImportantClausesSection
                clauses={report.clauses}
                selectedClauseId={selectedClauseId}
                onSelectClause={handleSelectClause}
              />
            </section>

            {/* Privacy & Data Practices */}
            <section aria-label="Privacy Analysis">
              <PrivacyAnalysisSection
                findings={report.privacyFindings}
                appName={report.appName}
              />
            </section>

            {/* AI Verification & Evidence */}
            <section aria-label="AI Verification Panel">
              <VerificationPanel
                clauses={report.clauses}
                summary={report.verificationSummary}
              />
            </section>
          </div>
        )}

        {activeTab === "clause_explorer" && (
          <div className="space-y-4">
            <ClauseExplorer
              clauses={report.clauses}
              selectedClauseId={selectedClauseId}
              onSelectClause={handleSelectClause}
            />
          </div>
        )}

        {activeTab === "important_clauses" && (
          <ImportantClausesSection
            clauses={report.clauses}
            selectedClauseId={selectedClauseId}
            onSelectClause={handleSelectClause}
          />
        )}

        {activeTab === "executive_summary" && (
          <ExecutiveSummarySection
            summary={report.executiveSummary}
            appName={report.appName}
            isDemonstration={report.isDemonstrationFixture}
          />
        )}

        {activeTab === "privacy" && (
          <PrivacyAnalysisSection
            findings={report.privacyFindings}
            appName={report.appName}
          />
        )}

        {activeTab === "verification" && (
          <VerificationPanel
            clauses={report.clauses}
            summary={report.verificationSummary}
          />
        )}
      </div>

      {/* Export Report Modal Dialog */}
      <ExportReportModal
        report={report}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </AppLayout>
  );
}

