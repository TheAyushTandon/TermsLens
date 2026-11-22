"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { WelcomeHeader } from "@/components/dashboard/welcome-header";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { ProductExperience } from "@/components/dashboard/product-experience";
import { DocumentUploadSection } from "@/components/dashboard/document-upload-section";
import { RecentAnalysesTable } from "@/components/dashboard/recent-analyses-table";
import { AnalysisDetailModal } from "@/components/dashboard/analysis-detail-modal";
import { analysisService } from "@/services/analysis-service";
import { DocumentAnalysis, ConsumerStats, UserProfile } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [stats, setStats] = React.useState<ConsumerStats | null>(null);
  const [documents, setDocuments] = React.useState<DocumentAnalysis[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modal inspection state
  const [selectedDocument, setSelectedDocument] = React.useState<DocumentAnalysis | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

  // Active navigation section state ("dashboard" | "analyze" | "reports" | "settings")
  const [activeSection, setActiveSection] = React.useState<string>("dashboard");

  // Toggle for testing fresh empty state vs populated mock data
  const [isEmptyStateMode, setIsEmptyStateMode] = React.useState<boolean>(false);

  // Section references for smooth scrolling from sidebar / header
  const uploadSectionRef = React.useRef<HTMLDivElement>(null);
  const reportsSectionRef = React.useRef<HTMLDivElement>(null);
  const [isUploadHighlit, setIsUploadHighlit] = React.useState(false);

  // Hash-based navigation and browser back/forward (popstate/hashchange) synchronization
  React.useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash === "analyze") {
        setActiveSection("analyze");
        uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
        setIsUploadHighlit(true);
        setTimeout(() => setIsUploadHighlit(false), 1200);
      } else if (hash === "reports") {
        setActiveSection("reports");
        reportsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (hash === "settings") {
        setActiveSection("settings");
      } else {
        setActiveSection("dashboard");
      }
    };

    if (window.location.hash) {
      syncFromHash();
    }

    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("popstate", syncFromHash);

    return () => {
      window.removeEventListener("hashchange", syncFromHash);
      window.removeEventListener("popstate", syncFromHash);
    };
  }, []);

  // Load initial data through service layer
  React.useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [userData, statsData, docsData] = await Promise.all([
          analysisService.getCurrentUser(),
          analysisService.getDashboardStats(isEmptyStateMode),
          analysisService.getAnalyses(),
        ]);
        setUser(userData);
        setStats(statsData);
        setDocuments(docsData);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, [isEmptyStateMode]);

  const handleNavigateToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (window.location.hash !== `#${sectionId}`) {
      window.history.pushState(null, "", `#${sectionId}`);
    }

    if (sectionId === "analyze") {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      setIsUploadHighlit(true);
      setTimeout(() => setIsUploadHighlit(false), 1200);
    } else if (sectionId === "reports") {
      reportsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (sectionId === "dashboard") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleScrollToDashboard = () => {
    handleNavigateToSection("dashboard");
  };

  const handleScrollToUpload = () => {
    handleNavigateToSection("analyze");
  };

  const handleScrollToReports = () => {
    handleNavigateToSection("reports");
  };

  const handleAnalysisCreated = React.useCallback((newDoc: DocumentAnalysis) => {
    setDocuments((prev) => {
      if (prev.some((d) => d.id === newDoc.id)) {
        return prev;
      }
      setStats((prevStats) => {
        if (!prevStats) return prevStats;
        return {
          ...prevStats,
          documentsAnalyzed: prevStats.documentsAnalyzed + 1,
          clausesRequiringAttention: prevStats.clausesRequiringAttention + newDoc.flaggedClausesCount,
          privacyRelatedFindings: (prevStats.privacyRelatedFindings || 0) + (newDoc.privacyFindingsCount || 0),
          readingTimeSavedMinutes: prevStats.readingTimeSavedMinutes + newDoc.timeSavedMinutes,
        };
      });
      return [newDoc, ...prev];
    });
  }, []);

  const handleOpenDocument = (doc: DocumentAnalysis) => {
    setSelectedDocument(doc);
    setIsModalOpen(true);
  };

  const handleToggleEmptyState = () => {
    setIsEmptyStateMode((prev) => !prev);
  };

  const activeDocuments = isEmptyStateMode ? [] : documents;

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBFD] dark:bg-[#090D16]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent dark:border-white dark:border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">
            Loading TermsLens...
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      user={user}
      activeSection={activeSection}
      onSectionChange={handleNavigateToSection}
      onQuickUploadClick={handleScrollToUpload}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNavigateToDashboard={handleScrollToDashboard}
      onNavigateToAnalyze={handleScrollToUpload}
      onNavigateToReports={handleScrollToReports}
    >
      <div className="space-y-7">
        {/* Welcome Header */}
        <WelcomeHeader
          onUploadClick={handleScrollToUpload}
          isEmptyState={isEmptyStateMode}
          onToggleEmptyState={handleToggleEmptyState}
        />

        {/* Consumer Statistics Grid */}
        <section aria-label="Dashboard Statistics">
          <QuickStats
            stats={
              stats || {
                documentsAnalyzed: 0,
                clausesRequiringAttention: 0,
                privacyRelatedFindings: 0,
                readingTimeSavedMinutes: 0,
              }
            }
          />
        </section>

        {/* Product Experience: Explains what TermsLens does + Responsible AI disclaimer */}
        <ProductExperience />

        {/* Document Upload & Interactive Scanner */}
        <section ref={uploadSectionRef} id="analyze" aria-label="Document Upload Scanner">
          <DocumentUploadSection
            onAnalysisCreated={handleAnalysisCreated}
            onOpenAnalysis={handleOpenDocument}
            isHighlit={isUploadHighlit}
          />
        </section>

        {/* Recent Analyses List */}
        <section ref={reportsSectionRef} id="reports" aria-label="Recent Analyses">
          <RecentAnalysesTable
            documents={activeDocuments}
            onSelectDocument={handleOpenDocument}
            onResetFilters={() => setSearchQuery("")}
            onUploadClick={handleScrollToUpload}
            searchFilter={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </section>
      </div>

      {/* Detail Modal for Document Breakdown */}
      <AnalysisDetailModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </AppLayout>
  );
}
