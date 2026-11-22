"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  BookOpen,
  Lock,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { ReportHeader } from "@/components/report/report-header";
import { DocumentOverviewBar } from "@/components/report/document-overview-bar";
import { ExecutiveSummarySection } from "@/components/report/executive-summary-section";
import { ClauseExplorer } from "@/components/report/clause-explorer";
import { PrivacyAnalysisSection } from "@/components/report/privacy-analysis-section";
import { ExportReportModal } from "@/components/report/export-report-modal";
import { analysisService } from "@/services/analysis-service";
import { AnalysisReport, UserProfile } from "@/types";
import { Button } from "@/components/ui/button";

interface ReportDetailClientProps {
  reportId: string;
}

type ReportTab = "summary" | "clauses" | "privacy";

export default function ReportDetailClient({
  reportId,
}: ReportDetailClientProps) {
  const router = useRouter();
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [report, setReport] = React.useState<AnalysisReport | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Active navigation tab within report (consolidated into 3 intuitive tabs)
  const [activeTab, setActiveTab] = React.useState<ReportTab>("summary");

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
    if (activeTab !== "clauses") {
      setActiveTab("clauses");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#119da4] border-t-transparent" />
          <p className="text-xs font-medium text-[#4a5759]">
            Loading Policy Breakdown...
          </p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8F5] p-4">
        <div className="max-w-md w-full rounded-2xl border border-[#d7d9ce] bg-white p-6 text-center space-y-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-rose-50 text-[#c93b2b]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#040404]">
              Report Not Found
            </h2>
            <p className="mt-1 text-xs text-[#4a5759]">
              {error || "The analysis report you requested is unavailable or has expired."}
            </p>
          </div>
          <Button
            onClick={() => router.push("/#reports")}
            size="sm"
            className="w-full text-xs bg-[#119da4] hover:bg-[#0c7489] text-white"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const tabs: { id: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "summary", label: "Summary & The Bottom Line", icon: FileText },
    { id: "clauses", label: `Key Clauses (${report.clauses.length})`, icon: BookOpen },
    { id: "privacy", label: "Privacy & Data Use", icon: Lock },
  ];

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

        {/* Fluid Tab Navigation Bar (Awwwards Style) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#eef1ec] border border-[#d7d9ce] w-full sm:w-fit overflow-x-auto text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 font-medium transition-colors whitespace-nowrap z-10 ${
                  isActive ? "text-white font-semibold" : "text-[#4a5759] hover:text-[#040404]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeReportTabIndicator"
                    className="absolute inset-0 rounded-xl bg-[#119da4] shadow-xs -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-[#13505b]"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Fluid Tab Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Quick Metrics Bar */}
              <DocumentOverviewBar report={report} />

              {/* The Bottom Line Breakdown */}
              <ExecutiveSummarySection
                summary={report.executiveSummary}
                appName={report.appName}
                isDemonstration={report.isDemonstrationFixture}
              />
            </motion.div>
          )}

          {activeTab === "clauses" && (
            <motion.div
              key="clauses"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <ClauseExplorer
                clauses={report.clauses}
                selectedClauseId={selectedClauseId}
                onSelectClause={handleSelectClause}
              />
            </motion.div>
          )}

          {activeTab === "privacy" && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <PrivacyAnalysisSection
                findings={report.privacyFindings}
                appName={report.appName}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
