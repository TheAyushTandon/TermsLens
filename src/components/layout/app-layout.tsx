"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SettingsModal } from "./settings-modal";
import { UserProfile } from "@/types";

interface AppLayoutProps {
  user: UserProfile;
  children: React.ReactNode;
  onQuickUploadClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToAnalyze?: () => void;
  onNavigateToReports?: () => void;
}

export function AppLayout({
  user,
  children,
  onQuickUploadClick,
  searchQuery,
  onSearchChange,
  activeSection = "dashboard",
  onSectionChange,
  onNavigateToDashboard,
  onNavigateToAnalyze,
  onNavigateToReports,
}: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const sectionLabels: Record<string, string> = {
    dashboard: "Dashboard",
    analyze: "Scan Policy",
    reports: "My Reports",
    settings: "Settings",
  };

  const activeBreadcrumb = sectionLabels[activeSection] || "Dashboard";

  return (
    <div className="flex min-h-screen bg-[#F7F8F5] text-[#040404]">
      {/* Sidebar navigation */}
      <Sidebar
        user={user}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        activeTab={activeSection}
        onSelectTab={onSectionChange}
        onNavigateToDashboard={onNavigateToDashboard}
        onNavigateToAnalyze={onNavigateToAnalyze}
        onNavigateToReports={onNavigateToReports}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickUploadClick={onQuickUploadClick}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          activeBreadcrumb={activeBreadcrumb}
        />

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
