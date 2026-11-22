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
  ChevronRight,
  LogOut,
  User,
  Sliders,
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
  const pathname = usePathname();
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
      label: "Analyze Document",
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
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/90 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-950 lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:translate-x-0",
          isOpenMobile ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6 dark:border-slate-800/80">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-slate-900 transition-opacity hover:opacity-90 dark:text-white"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs dark:bg-blue-600">
              <Scale className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight">TermsLens</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Consumer Policy Explainer
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          <div className="space-y-1">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Menu
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-950"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-colors",
                        isActive
                          ? "text-white dark:text-slate-950"
                          : "text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helpful Quick Tip Card */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Quick tip</span>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              You can paste policy text directly when downloading a document isn&apos;t possible.
            </p>
          </div>
        </div>

        {/* Footer User Profile Section */}
        <div className="relative border-t border-slate-100 p-3 dark:border-slate-800/80">
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors hover:bg-slate-100/80 dark:hover:bg-slate-900"
              aria-expanded={isProfileMenuOpen}
              aria-label="User account menu"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {user.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform duration-150",
                  isProfileMenuOpen && "rotate-90"
                )}
              />
            </button>

            {/* Profile Popover / Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-200">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    alert("Account settings");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>Profile Settings</span>
                </button>
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    alert("App preferences");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  <span>Preferences</span>
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    alert("Signed out successfully.");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
