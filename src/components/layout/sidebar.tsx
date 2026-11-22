"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileSearch,
  FolderArchive,
  Settings,
  Scale,
  X,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/types";

interface SidebarProps {
  user: UserProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToAnalyze?: () => void;
  onNavigateToReports?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  user,
  isOpenMobile,
  onCloseMobile,
  activeTab = "dashboard",
  onSelectTab,
  onNavigateToDashboard,
  onNavigateToAnalyze,
  onNavigateToReports,
  onOpenSettings,
}: SidebarProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

  const navItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      href: "#dashboard",
      onClick: () => {
        onNavigateToDashboard?.();
      },
    },
    {
      id: "analyze",
      label: "Scan Policy",
      icon: FileSearch,
      href: "#analyze",
      onClick: () => {
        onNavigateToAnalyze?.();
      },
    },
    {
      id: "reports",
      label: "My Reports",
      icon: FolderArchive,
      href: "#reports",
      onClick: () => {
        onNavigateToReports?.();
      },
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "#settings",
      onClick: () => {
        onOpenSettings?.();
      },
    },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    onSelectTab?.(item.id);
    if (item.onClick) {
      item.onClick();
    }
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-[#d7d9ce] bg-white transition-transform duration-200 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#eef1ec] px-5">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-[#040404] transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#119da4] text-white shadow-xs">
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-[#040404]">TermsLens</span>
              <span className="text-[10px] text-[#13505b] font-medium tracking-wide">
                Clear Policy Explainer
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-[#4a5759] hover:bg-[#eef1ec] hover:text-[#040404] lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#4a5759]">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all",
                    isActive
                      ? "bg-[#119da4] text-white shadow-xs"
                      : "text-[#040404] hover:bg-[#eef1ec] hover:text-[#13505b]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive ? "text-white" : "text-[#13505b] group-hover:text-[#0c7489]"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helpful Quick Tip Card */}
          <div className="rounded-xl border border-[#d7d9ce] bg-[#f7f8f5] p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#13505b]">
              <HelpCircle className="h-4 w-4 text-[#119da4]" />
              <span>Helpful Tip</span>
            </div>
            <p className="mt-1.5 text-[11px] text-[#4a5759] leading-relaxed">
              Paste agreement text directly if downloading the full PDF isn&apos;t convenient.
            </p>
          </div>
        </div>

        {/* Footer User Profile Section */}
        <div className="border-t border-[#eef1ec] p-3">
          <div className="flex items-center gap-3 rounded-xl p-2 bg-[#f7f8f5]">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#119da4] font-semibold text-white text-xs">
              {user.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                : "TL"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#040404]">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-[#4a5759]">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
